import { distance } from "./math";
import type { Vector } from "./types";

export function circlesOverlap(
  firstPosition: Vector,
  firstRadius: number,
  secondPosition: Vector,
  secondRadius: number
): boolean {
  return distance(firstPosition, secondPosition) <= firstRadius + secondRadius;
}
