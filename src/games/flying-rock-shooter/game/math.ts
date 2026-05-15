import type { Vector } from "./types";

export function add(a: Vector, b: Vector): Vector {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(vector: Vector, amount: number): Vector {
  return { x: vector.x * amount, y: vector.y * amount };
}

export function fromAngle(angle: number): Vector {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function distance(a: Vector, b: Vector): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function wrapPosition(position: Vector, width: number, height: number): Vector {
  return {
    x: ((position.x % width) + width) % width,
    y: ((position.y % height) + height) % height
  };
}

export function isOutOfBounds(
  position: Vector,
  width: number,
  height: number,
  padding: number
): boolean {
  return (
    position.x < -padding ||
    position.x > width + padding ||
    position.y < -padding ||
    position.y > height + padding
  );
}
