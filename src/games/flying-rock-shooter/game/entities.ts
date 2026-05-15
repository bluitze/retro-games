import {
  BULLET_LIFETIME,
  BULLET_RADIUS,
  BULLET_SPEED,
  LARGE_ROCK_RADIUS,
  MEDIUM_ROCK_RADIUS,
  ROCK_MAX_VERTICES,
  ROCK_MIN_VERTICES,
  SHIP_RADIUS,
  SMALL_ROCK_RADIUS
} from "./constants";
import { add, fromAngle, randomInt, randomRange, scale } from "./math";
import type { Bullet, Rock, RockSize, Ship, Vector } from "./types";

export function createShip(width: number, height: number, now = 0): Ship {
  return {
    position: { x: width / 2, y: height / 2 },
    velocity: { x: 0, y: 0 },
    angle: -Math.PI / 2,
    radius: SHIP_RADIUS,
    thrusting: false,
    invulnerableUntil: now
  };
}

export function respawnShip(ship: Ship, width: number, height: number, now: number): Ship {
  return {
    ...ship,
    position: { x: width / 2, y: height / 2 },
    velocity: { x: 0, y: 0 },
    angle: -Math.PI / 2,
    thrusting: false,
    invulnerableUntil: now
  };
}

export function createBullet(id: number, ship: Ship): Bullet {
  const direction = fromAngle(ship.angle);
  const nose = add(ship.position, scale(direction, ship.radius + 6));

  return {
    id,
    position: nose,
    velocity: add(ship.velocity, scale(direction, BULLET_SPEED)),
    radius: BULLET_RADIUS,
    age: 0,
    lifetime: BULLET_LIFETIME
  };
}

export function createRock(
  id: number,
  position: Vector,
  size: RockSize,
  wave: number
): Rock {
  const radius = getRockRadius(size);
  const speed = randomRange(32, 82 + wave * 7) / size;
  const direction = randomRange(0, Math.PI * 2);

  return {
    id,
    position,
    velocity: scale(fromAngle(direction), speed),
    angle: randomRange(0, Math.PI * 2),
    angularVelocity: randomRange(-1.2, 1.2),
    radius,
    size,
    vertices: createRockVertices()
  };
}

export function splitRock(rock: Rock, nextId: number, wave: number): Rock[] {
  if (rock.size === 1) {
    return [];
  }

  const nextSize = (rock.size - 1) as RockSize;
  const spread = randomRange(0, Math.PI * 2);

  return [0, 1].map((index) => {
    const child = createRock(nextId + index, { ...rock.position }, nextSize, wave);
    const direction = fromAngle(spread + index * Math.PI + randomRange(-0.45, 0.45));
    child.velocity = add(scale(rock.velocity, 0.6), scale(direction, randomRange(70, 135)));
    return child;
  });
}

export function getRockRadius(size: RockSize): number {
  if (size === 3) {
    return LARGE_ROCK_RADIUS;
  }

  if (size === 2) {
    return MEDIUM_ROCK_RADIUS;
  }

  return SMALL_ROCK_RADIUS;
}

function createRockVertices(): number[] {
  const count = randomInt(ROCK_MIN_VERTICES, ROCK_MAX_VERTICES);

  return Array.from({ length: count }, () => randomRange(0.72, 1.24));
}
