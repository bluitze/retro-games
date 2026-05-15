import {
  BASE_ROCK_COUNT,
  BULLET_COOLDOWN,
  MAX_STARS,
  MIN_STARS,
  ROCK_SAFE_SPAWN_DISTANCE,
  ROCK_SCORE,
  SHIP_DAMPING,
  SHIP_INVULNERABLE_SECONDS,
  SHIP_THRUST,
  SHIP_TURN_SPEED,
  STARTING_LIVES,
  STAR_DENSITY
} from "./constants";
import { circlesOverlap } from "./collision";
import {
  createBullet,
  createRock,
  createShip,
  respawnShip,
  splitRock
} from "./entities";
import { add, distance, fromAngle, randomRange, scale, wrapPosition } from "./math";
import type { InputState } from "./input";
import type { GameState, Rock, Star, Vector } from "./types";

const LEFT_KEYS = ["ArrowLeft", "KeyA"];
const RIGHT_KEYS = ["ArrowRight", "KeyD"];
const THRUST_KEYS = ["ArrowUp", "KeyW"];

export function createGame(width: number, height: number): GameState {
  const game: GameState = {
    width,
    height,
    status: "start",
    score: 0,
    lives: STARTING_LIVES,
    wave: 1,
    ship: createShip(width, height),
    bullets: [],
    rocks: [],
    stars: createStars(width, height),
    nextBulletId: 1,
    nextRockId: 1,
    lastShotAt: -Infinity
  };

  spawnWave(game);
  return game;
}

export function resizeGame(game: GameState, width: number, height: number): void {
  game.width = width;
  game.height = height;
  game.stars = createStars(width, height);
  game.ship.position = wrapPosition(game.ship.position, width, height);
}

export function updateGame(
  game: GameState,
  input: InputState,
  deltaSeconds: number,
  now: number
): void {
  if (input.consumePressed("Enter") && (game.status === "start" || game.status === "gameover")) {
    resetGame(game, now);
  }

  if (input.consumePressed("KeyP") && (game.status === "playing" || game.status === "paused")) {
    game.status = game.status === "playing" ? "paused" : "playing";
  }

  if (game.status !== "playing") {
    game.ship.thrusting = false;
    return;
  }

  updateShip(game, input, deltaSeconds);
  updateBullets(game, deltaSeconds);
  updateRocks(game, deltaSeconds);
  shootIfRequested(game, input, now);
  handleBulletRockCollisions(game);
  handleShipRockCollisions(game, now);

  if (game.rocks.length === 0) {
    game.wave += 1;
    spawnWave(game);
  }
}

function resetGame(game: GameState, now: number): void {
  game.status = "playing";
  game.score = 0;
  game.lives = STARTING_LIVES;
  game.wave = 1;
  game.bullets = [];
  game.rocks = [];
  game.nextBulletId = 1;
  game.nextRockId = 1;
  game.lastShotAt = -Infinity;
  game.ship = respawnShip(game.ship, game.width, game.height, now + SHIP_INVULNERABLE_SECONDS);
  spawnWave(game);
}

function updateShip(game: GameState, input: InputState, deltaSeconds: number): void {
  const ship = game.ship;

  if (input.isDown(LEFT_KEYS)) {
    ship.angle -= SHIP_TURN_SPEED * deltaSeconds;
  }

  if (input.isDown(RIGHT_KEYS)) {
    ship.angle += SHIP_TURN_SPEED * deltaSeconds;
  }

  ship.thrusting = input.isDown(THRUST_KEYS);

  if (ship.thrusting) {
    ship.velocity = add(
      ship.velocity,
      scale(fromAngle(ship.angle), SHIP_THRUST * deltaSeconds)
    );
  }

  ship.velocity = scale(ship.velocity, Math.pow(SHIP_DAMPING, deltaSeconds * 60));
  ship.position = wrapPosition(add(ship.position, scale(ship.velocity, deltaSeconds)), game.width, game.height);
}

function updateBullets(game: GameState, deltaSeconds: number): void {
  game.bullets = game.bullets
    .map((bullet) => ({
      ...bullet,
      age: bullet.age + deltaSeconds,
      position: wrapPosition(
        add(bullet.position, scale(bullet.velocity, deltaSeconds)),
        game.width,
        game.height
      )
    }))
    .filter((bullet) => bullet.age < bullet.lifetime);
}

function updateRocks(game: GameState, deltaSeconds: number): void {
  for (const rock of game.rocks) {
    rock.position = wrapPosition(
      add(rock.position, scale(rock.velocity, deltaSeconds)),
      game.width,
      game.height
    );
    rock.angle += rock.angularVelocity * deltaSeconds;
  }
}

function shootIfRequested(game: GameState, input: InputState, now: number): void {
  if (!input.isDown("Space") || now - game.lastShotAt < BULLET_COOLDOWN) {
    return;
  }

  game.bullets.push(createBullet(game.nextBulletId, game.ship));
  game.nextBulletId += 1;
  game.lastShotAt = now;
}

function handleBulletRockCollisions(game: GameState): void {
  const remainingBullets = [...game.bullets];
  const remainingRocks = [...game.rocks];
  const newRocks: Rock[] = [];

  for (const bullet of game.bullets) {
    const rock = remainingRocks.find((candidate) =>
      circlesOverlap(bullet.position, bullet.radius, candidate.position, candidate.radius)
    );

    if (!rock) {
      continue;
    }

    removeById(remainingBullets, bullet.id);
    removeById(remainingRocks, rock.id);
    game.score += ROCK_SCORE[rock.size];

    const children = splitRock(rock, game.nextRockId, game.wave);
    game.nextRockId += children.length;
    newRocks.push(...children);
  }

  game.bullets = remainingBullets;
  game.rocks = [...remainingRocks, ...newRocks];
}

function handleShipRockCollisions(game: GameState, now: number): void {
  if (now < game.ship.invulnerableUntil) {
    return;
  }

  const hitRock = game.rocks.find((rock) =>
    circlesOverlap(game.ship.position, game.ship.radius, rock.position, rock.radius * 0.82)
  );

  if (!hitRock) {
    return;
  }

  game.lives -= 1;
  game.bullets = [];

  if (game.lives <= 0) {
    game.status = "gameover";
    game.ship.thrusting = false;
    return;
  }

  game.ship = respawnShip(game.ship, game.width, game.height, now + SHIP_INVULNERABLE_SECONDS);
}

function spawnWave(game: GameState): void {
  const count = BASE_ROCK_COUNT + game.wave - 1;

  for (let index = 0; index < count; index += 1) {
    game.rocks.push(createRock(game.nextRockId, randomRockSpawn(game), 3, game.wave));
    game.nextRockId += 1;
  }
}

function randomRockSpawn(game: GameState): Vector {
  const center = { x: game.width / 2, y: game.height / 2 };
  let position = { x: randomRange(0, game.width), y: randomRange(0, game.height) };
  let attempts = 0;

  while (distance(position, center) < ROCK_SAFE_SPAWN_DISTANCE && attempts < 20) {
    position = { x: randomRange(0, game.width), y: randomRange(0, game.height) };
    attempts += 1;
  }

  return position;
}

function createStars(width: number, height: number): Star[] {
  const count = Math.min(MAX_STARS, Math.max(MIN_STARS, Math.floor(width * height * STAR_DENSITY)));

  return Array.from({ length: count }, () => ({
    position: { x: randomRange(0, width), y: randomRange(0, height) },
    radius: randomRange(0.6, 1.6),
    alpha: randomRange(0.25, 0.9)
  }));
}

function removeById<T extends { id: number }>(items: T[], id: number): void {
  const index = items.findIndex((item) => item.id === id);

  if (index >= 0) {
    items.splice(index, 1);
  }
}
