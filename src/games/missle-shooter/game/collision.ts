import type { EnemyMissile, Explosion, Point } from "./types";

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function moveToward(current: Point, target: Point, distanceToMove: number): Point {
  const totalDistance = distance(current, target);

  if (totalDistance <= distanceToMove || totalDistance === 0) {
    return { ...target };
  }

  const scale = distanceToMove / totalDistance;

  return {
    x: current.x + (target.x - current.x) * scale,
    y: current.y + (target.y - current.y) * scale,
  };
}

export function hasReachedTarget(current: Point, target: Point, threshold = 2): boolean {
  return distance(current, target) <= threshold;
}

export function missileInsideExplosion(missile: EnemyMissile, explosion: Explosion): boolean {
  if (explosion.owner !== "player") {
    return false;
  }

  return distance(missile.position, explosion.position) <= explosion.radius;
}
