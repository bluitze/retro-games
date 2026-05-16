import {
  BRIDGE_BASE_DISTANCE,
  BRIDGE_SCORE,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  FUEL_DEPOT_SCORE,
  MAX_THROTTLE,
  MIN_THROTTLE,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  PLAYER_Y,
  SEGMENT_HEIGHT,
  SHOT_COOLDOWN,
  SHOT_HEIGHT,
  SHOT_SPEED,
  SHOT_WIDTH,
  STARTING_FUEL,
  STARTING_LIVES,
} from "./constants";
import type {
  Bridge,
  Enemy,
  EnemyKind,
  ExplosionParticle,
  FuelDepot,
  GameState,
  InputState,
  Rect,
  Shot,
  SoundEvent,
} from "./types";

const LEFT_KEYS = ["ArrowLeft", "KeyA"];
const RIGHT_KEYS = ["ArrowRight", "KeyD"];
const THROTTLE_UP_KEYS = ["ArrowUp", "KeyW"];
const THROTTLE_DOWN_KEYS = ["ArrowDown", "KeyS"];

type TerrainSpan = {
  left: number;
  right: number;
};

type RiverTerrain = {
  left: number;
  right: number;
  islands: TerrainSpan[];
};

export function createGame(highScore = 0): GameState {
  return {
    status: "playing",
    score: 0,
    highScore,
    lives: STARTING_LIVES,
    sector: 1,
    fuel: STARTING_FUEL,
    throttle: 0.38,
    speed: 72,
    worldY: 0,
    distanceSinceBridge: 0,
    spawnTimer: 0.8,
    fuelTimer: 3.4,
    lowFuelTimer: 0,
    shotCooldown: 0,
    nextId: 1,
    seed: 0x5f3759df,
    player: {
      x: FIELD_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: PLAYER_Y,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      invulnerable: 1.4,
    },
    shots: [],
    enemies: [],
    fuelDepots: [],
    bridges: [],
    particles: [],
    message: "Patrol the river. Blast bridges. Keep fuel in the green.",
    messageTimer: 3,
  };
}

export function updateGame(game: GameState, input: InputState, deltaSeconds: number): SoundEvent[] {
  const events: SoundEvent[] = [];

  if (input.consumePressed("KeyR")) {
    const highScore = Math.max(game.highScore, game.score);
    Object.assign(game, createGame(highScore));
    game.message = "Fresh patrol launched.";
    game.messageTimer = 1.8;
    return events;
  }

  if (input.consumePressed("KeyP") && game.status !== "gameover") {
    game.status = game.status === "paused" ? "playing" : "paused";
    game.message = game.status === "paused" ? "Paused." : "Throttle restored.";
    game.messageTimer = 1.4;
  }

  if (game.status !== "playing") {
    return events;
  }

  updateThrottleAndPlayer(game, input, deltaSeconds);
  updateTimers(game, deltaSeconds);

  if (input.isDown("Space") && game.shotCooldown <= 0) {
    fireShot(game);
    events.push("shoot");
  }

  const travel = game.speed * deltaSeconds;
  game.worldY += travel;
  game.distanceSinceBridge += travel;
  game.fuel = Math.max(0, game.fuel - (0.9 + game.throttle * 1.7 + game.sector * 0.08) * deltaSeconds);

  moveWorldObjects(game, deltaSeconds, travel);
  spawnWorldObjects(game, deltaSeconds);
  resolveShotHits(game, events);
  resolveFuelPickup(game, events);
  resolvePlayerHazards(game, events);
  updateParticles(game, deltaSeconds);

  if (game.fuel <= 0 && game.status === "playing") {
    game.status = "gameover";
    game.message = "Fuel exhausted. Patrol ended.";
    game.messageTimer = 99;
    events.push("lowFuel");
  } else if (game.fuel < 18 && game.lowFuelTimer <= 0) {
    game.lowFuelTimer = 0.72;
    events.push("lowFuel");
  }

  game.highScore = Math.max(game.highScore, game.score);
  return events;
}

export function getRiverBanks(worldY: number, sector: number): { left: number; right: number } {
  const terrain = getRiverTerrain(worldY, sector);
  return { left: terrain.left, right: terrain.right };
}

export function getRiverTerrain(worldY: number, sector: number): RiverTerrain {
  const segment = Math.floor(worldY / SEGMENT_HEIGHT);
  const channel = Math.floor((worldY + 160) / 520);
  const channelDirection = channel % 2 === 0 ? -1 : 1;
  const channelShift = channelDirection * 42 * smoothPulse((worldY + 160) % 520, 70, 450);
  const bend =
    Math.sin(segment * 0.09) * 30 +
    Math.sin(segment * 0.031 + 1.7) * 28 +
    channelShift +
    sampleNoise(segment) * 5;
  const width =
    258 -
    Math.min(58, (sector - 1) * 6) +
    Math.sin(segment * 0.071 + 2.2) * 24 +
    sampleNoise(segment + 300) * 8;
  const riverWidth = clamp(width, 178, 292);
  const center = clamp(FIELD_WIDTH / 2 + bend, 38 + riverWidth / 2, FIELD_WIDTH - 38 - riverWidth / 2);
  const left = Math.round(center - riverWidth / 2);
  const right = Math.round(center + riverWidth / 2);

  return {
    left,
    right,
    islands: getRiverIslands(worldY, sector, left, right),
  };
}

function updateThrottleAndPlayer(game: GameState, input: InputState, deltaSeconds: number): void {
  const throttleIntent = Number(input.isDown(THROTTLE_UP_KEYS)) - Number(input.isDown(THROTTLE_DOWN_KEYS));
  game.throttle = clamp(game.throttle + throttleIntent * 0.58 * deltaSeconds, MIN_THROTTLE, MAX_THROTTLE);
  game.speed = 44 + game.throttle * 74 + (game.sector - 1) * 5.5;

  const steering = Number(input.isDown(RIGHT_KEYS)) - Number(input.isDown(LEFT_KEYS));
  game.player.x += steering * PLAYER_SPEED * (0.7 + game.throttle * 0.45) * deltaSeconds;
  game.player.x = clamp(game.player.x, 0, FIELD_WIDTH - game.player.width);
}

function updateTimers(game: GameState, deltaSeconds: number): void {
  game.shotCooldown = Math.max(0, game.shotCooldown - deltaSeconds);
  game.lowFuelTimer = Math.max(0, game.lowFuelTimer - deltaSeconds);
  game.messageTimer = Math.max(0, game.messageTimer - deltaSeconds);
  game.player.invulnerable = Math.max(0, game.player.invulnerable - deltaSeconds);
}

function fireShot(game: GameState): void {
  game.shots.push({
    id: takeId(game),
    x: game.player.x + game.player.width / 2 - SHOT_WIDTH / 2,
    y: game.player.y - SHOT_HEIGHT,
    width: SHOT_WIDTH,
    height: SHOT_HEIGHT,
    velocityY: -SHOT_SPEED,
  });
  game.shotCooldown = SHOT_COOLDOWN;
}

function moveWorldObjects(game: GameState, deltaSeconds: number, travel: number): void {
  for (const shot of game.shots) {
    shot.y += shot.velocityY * deltaSeconds;
  }

  for (const enemy of game.enemies) {
    enemy.y += travel + enemy.velocityY * deltaSeconds;
  }

  for (const fuelDepot of game.fuelDepots) {
    fuelDepot.y += travel;
  }

  for (const bridge of game.bridges) {
    bridge.y += travel;
  }

  game.shots = game.shots.filter((shot) => shot.y + shot.height > -12);
  game.enemies = game.enemies.filter((enemy) => enemy.y < FIELD_HEIGHT + 42);
  game.fuelDepots = game.fuelDepots.filter((fuelDepot) => fuelDepot.y < FIELD_HEIGHT + 34);
  game.bridges = game.bridges.filter((bridge) => bridge.y < FIELD_HEIGHT + 36);
}

function spawnWorldObjects(game: GameState, deltaSeconds: number): void {
  game.spawnTimer -= deltaSeconds;
  game.fuelTimer -= deltaSeconds;

  if (game.spawnTimer <= 0) {
    spawnEnemy(game);
    const pressure = Math.min(0.55, (game.sector - 1) * 0.035 + game.throttle * 0.25);
    game.spawnTimer = 1.18 - pressure + nextRandom(game) * 0.45;
  }

  if (game.fuelTimer <= 0) {
    spawnFuelDepot(game);
    game.fuelTimer = 5.2 + nextRandom(game) * 2.4 - Math.min(1.6, game.sector * 0.08);
  }

  const bridgeDistance = Math.max(520, BRIDGE_BASE_DISTANCE - (game.sector - 1) * 42);
  if (game.distanceSinceBridge >= bridgeDistance && game.bridges.length === 0) {
    spawnBridge(game);
    game.distanceSinceBridge = 0;
  }
}

function spawnEnemy(game: GameState): void {
  const roll = nextRandom(game);
  const kind: EnemyKind =
    roll < 0.34 ? "boat" : roll < 0.58 ? "helicopter" : roll < 0.78 ? "jet" : "tank";
  const size = enemySize(kind);
  const spawnWorldY = game.worldY + 28;
  const spans = getOpenRiverSpans(spawnWorldY, game.sector, 10);
  const span = spans[Math.floor(nextRandom(game) * spans.length)] ?? spans[0];
  const side = nextRandom(game) < 0.5 ? "left" : "right";
  const riverX = span.left + nextRandom(game) * Math.max(12, span.right - span.left - size.width);
  const edgeX = side === "left" ? span.left : span.right - size.width;

  game.enemies.push({
    id: takeId(game),
    kind,
    x: kind === "tank" ? edgeX : riverX,
    y: -size.height - 4,
    width: size.width,
    height: size.height,
    score: size.score,
    velocityY: size.velocityY + game.sector * 1.5,
  });
}

function spawnFuelDepot(game: GameState): void {
  const width = 20;
  const spans = getOpenRiverSpans(game.worldY + 32, game.sector, 16);
  const span = spans[Math.floor(nextRandom(game) * spans.length)] ?? spans[0];
  const x = span.left + nextRandom(game) * Math.max(18, span.right - span.left - width);

  game.fuelDepots.push({
    id: takeId(game),
    x,
    y: -28,
    width,
    height: 22,
    amount: 38,
  });
}

function spawnBridge(game: GameState): void {
  const banks = getRiverBanks(game.worldY + 34, game.sector);

  game.bridges.push({
    id: takeId(game),
    x: banks.left + 4,
    y: -30,
    width: banks.right - banks.left - 8,
    height: 18,
    bonus: BRIDGE_SCORE + game.sector * 120,
  });
  game.message = `Sector ${game.sector} bridge ahead.`;
  game.messageTimer = 2.2;
}

function resolveShotHits(game: GameState, events: SoundEvent[]): void {
  const spentShots = new Set<number>();
  const destroyedEnemies = new Set<number>();
  const destroyedBridges = new Set<number>();

  for (const shot of game.shots) {
    const enemy = game.enemies.find((candidate) => !destroyedEnemies.has(candidate.id) && intersects(shot, candidate));

    if (enemy) {
      spentShots.add(shot.id);
      destroyedEnemies.add(enemy.id);
      game.score += enemy.score;
      addExplosion(game, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.kind === "jet" ? "#ffef7a" : "#ff8b44");
      events.push("explosion");
      continue;
    }

    const bridge = game.bridges.find((candidate) => !destroyedBridges.has(candidate.id) && intersects(shot, candidate));

    if (bridge) {
      spentShots.add(shot.id);
      destroyedBridges.add(bridge.id);
      game.score += bridge.bonus;
      game.sector += 1;
      game.message = `Bridge cleared. Sector ${game.sector}.`;
      game.messageTimer = 2.6;
      addExplosion(game, bridge.x + bridge.width / 2, bridge.y + bridge.height / 2, "#fff176", 34);
      events.push("bridge");
    }
  }

  game.shots = game.shots.filter((shot) => !spentShots.has(shot.id));
  game.enemies = game.enemies.filter((enemy) => !destroyedEnemies.has(enemy.id));
  game.bridges = game.bridges.filter((bridge) => !destroyedBridges.has(bridge.id));
}

function resolveFuelPickup(game: GameState, events: SoundEvent[]): void {
  const playerRect = insetRect(game.player, 2);
  const collected = game.fuelDepots.find((fuelDepot) => intersects(playerRect, fuelDepot));

  if (!collected) {
    return;
  }

  game.fuel = clamp(game.fuel + collected.amount, 0, STARTING_FUEL);
  game.score += FUEL_DEPOT_SCORE;
  game.fuelDepots = game.fuelDepots.filter((fuelDepot) => fuelDepot.id !== collected.id);
  game.message = "Fuel topped up.";
  game.messageTimer = 1.5;
  events.push("fuel");
}

function resolvePlayerHazards(game: GameState, events: SoundEvent[]): void {
  if (game.player.invulnerable > 0) {
    return;
  }

  const playerRect = getPlayerCollisionRect(game.player);
  const probeWorldY = game.worldY - (playerRect.y + playerRect.height * 0.35);
  const terrain = getRiverTerrain(probeWorldY, game.sector);
  const hitBank =
    playerRect.x < terrain.left ||
    playerRect.x + playerRect.width > terrain.right ||
    terrain.islands.some((island) => playerRect.x < island.right && playerRect.x + playerRect.width > island.left);
  const hitEnemy = game.enemies.some((enemy) => intersects(playerRect, insetRect(enemy, 1)));
  const hitBridge = game.bridges.some((bridge) => intersects(playerRect, bridge));

  if (hitBank || hitEnemy || hitBridge) {
    crashPlayer(game, hitBank ? "Bank collision." : hitBridge ? "Bridge impact." : "Hostile contact.", events);
  }
}

function crashPlayer(game: GameState, reason: string, events: SoundEvent[]): void {
  addExplosion(game, game.player.x + game.player.width / 2, game.player.y + game.player.height / 2, "#ff7043", 28);
  events.push("explosion");
  game.lives -= 1;
  game.shots = [];

  if (game.lives <= 0) {
    game.status = "gameover";
    game.message = `${reason} Patrol ended.`;
    game.messageTimer = 99;
    return;
  }

  game.player.x = FIELD_WIDTH / 2 - PLAYER_WIDTH / 2;
  game.player.invulnerable = 1.7;
  game.fuel = Math.max(game.fuel, 26);
  game.enemies = game.enemies.filter((enemy) => enemy.y < 120 || enemy.y > game.player.y + 72);
  game.bridges = game.bridges.filter((bridge) => bridge.y < 100 || bridge.y > game.player.y + 90);
  game.message = `${reason} Spare craft deployed.`;
  game.messageTimer = 2;
}

function updateParticles(game: GameState, deltaSeconds: number): void {
  for (const particle of game.particles) {
    particle.x += particle.velocityX * deltaSeconds;
    particle.y += particle.velocityY * deltaSeconds;
    particle.velocityY += 42 * deltaSeconds;
    particle.life -= deltaSeconds;
  }

  game.particles = game.particles.filter((particle) => particle.life > 0);
}

function addExplosion(game: GameState, x: number, y: number, color: string, count = 18): void {
  for (let index = 0; index < count; index += 1) {
    const angle = nextRandom(game) * Math.PI * 2;
    const speed = 34 + nextRandom(game) * 74;
    const maxLife = 0.28 + nextRandom(game) * 0.42;
    const sparkColor = nextRandom(game) < 0.35 ? "#f9fbff" : color;

    game.particles.push({
      x,
      y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      size: 2 + Math.floor(nextRandom(game) * 3),
      life: maxLife,
      maxLife,
      color: sparkColor,
    });
  }
}

function enemySize(kind: EnemyKind): { width: number; height: number; score: number; velocityY: number } {
  if (kind === "boat") {
    return { width: 24, height: 14, score: 80, velocityY: 16 };
  }

  if (kind === "helicopter") {
    return { width: 26, height: 14, score: 120, velocityY: 38 };
  }

  if (kind === "jet") {
    return { width: 20, height: 18, score: 160, velocityY: 66 };
  }

  return { width: 20, height: 14, score: 140, velocityY: 0 };
}

function takeId(game: GameState): number {
  const id = game.nextId;
  game.nextId += 1;
  return id;
}

function nextRandom(game: GameState): number {
  game.seed += 0x6d2b79f5;
  let value = game.seed;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function sampleNoise(index: number): number {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453123;
  return (value - Math.floor(value)) * 2 - 1;
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function insetRect(rect: Rect, inset: number): Rect {
  return {
    x: rect.x + inset,
    y: rect.y + inset,
    width: rect.width - inset * 2,
    height: rect.height - inset * 2,
  };
}

function getPlayerCollisionRect(player: Rect): Rect {
  return {
    x: player.x + 4,
    y: player.y + 2,
    width: player.width - 8,
    height: Math.max(8, player.height * 0.58),
  };
}

function getRiverIslands(worldY: number, sector: number, riverLeft: number, riverRight: number): TerrainSpan[] {
  if (worldY < 260) {
    return [];
  }

  const course = Math.floor((worldY + 240) / 680);
  const local = positiveModulo(worldY + 240, 680);
  const active = smoothPulse(local, 150, 415);

  if (active <= 0) {
    return [];
  }

  const riverWidth = riverRight - riverLeft;
  const islandWidth = Math.min(riverWidth - 104, 44 + sector * 3 + active * 34);
  const offset = course % 2 === 0 ? -22 : 22;
  const center = clamp((riverLeft + riverRight) / 2 + offset, riverLeft + 74, riverRight - 74);

  return [
    {
      left: Math.round(center - islandWidth / 2),
      right: Math.round(center + islandWidth / 2),
    },
  ];
}

function getOpenRiverSpans(worldY: number, sector: number, margin: number): TerrainSpan[] {
  const terrain = getRiverTerrain(worldY, sector);
  let spans: TerrainSpan[] = [{ left: terrain.left + margin, right: terrain.right - margin }];

  for (const island of terrain.islands) {
    spans = spans.flatMap((span) => {
      if (island.right <= span.left || island.left >= span.right) {
        return [span];
      }

      return [
        { left: span.left, right: island.left - margin },
        { left: island.right + margin, right: span.right },
      ].filter((candidate) => candidate.right - candidate.left >= 34);
    });
  }

  return spans.length > 0 ? spans : [{ left: terrain.left + margin, right: terrain.right - margin }];
}

function smoothPulse(value: number, start: number, end: number): number {
  if (value <= start || value >= end) {
    return 0;
  }

  const progress = (value - start) / (end - start);
  return Math.sin(progress * Math.PI);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
