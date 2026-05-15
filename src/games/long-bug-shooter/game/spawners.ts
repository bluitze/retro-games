import { BUG, ENEMIES, MUSHROOM, PLAYFIELD } from "./constants";
import { rectsOverlap } from "./collision";
import type { Direction, Rect, Vector } from "./types";
import { FallingDropper, FastRunner } from "./entities/enemies";
import { Mushroom } from "./entities/mushroom";
import { SegmentedBugChain, type BugSegment } from "./entities/segmented-bug";

export function spawnMushrooms(level: number, playerSafeRect: Rect): Mushroom[] {
  const mushrooms: Mushroom[] = [];
  const count = MUSHROOM.baseCount + level * MUSHROOM.countPerLevel;
  let attempts = 0;

  while (mushrooms.length < count && attempts < count * 20) {
    attempts += 1;
    const column = Math.floor(randomBetween(1, 37));
    const row = Math.floor(randomBetween(0, 21));
    const x = PLAYFIELD.left + column * MUSHROOM.width;
    const y = PLAYFIELD.top + 28 + row * MUSHROOM.height;
    const candidate = new Mushroom(x, y);

    if (
      y > PLAYFIELD.playerZoneTop - 28 ||
      rectsOverlap(candidate.rect, playerSafeRect) ||
      mushrooms.some((mushroom) => rectsOverlap(mushroom.rect, candidate.rect))
    ) {
      continue;
    }

    mushrooms.push(candidate);
  }

  return mushrooms;
}

export function spawnBugChain(level: number): SegmentedBugChain {
  const segmentCount = Math.min(BUG.maxSegments, BUG.baseSegments + Math.floor(level / 2));
  const segments: BugSegment[] = [];
  const startX = PLAYFIELD.left + 68;
  const y = PLAYFIELD.top + 28;

  for (let index = 0; index < segmentCount; index += 1) {
    segments.push({
      x: startX - index * (BUG.segmentSize + BUG.segmentGap),
      y,
      pulse: index * 0.08,
    });
  }

  return new SegmentedBugChain(segments, 1, BUG.baseSpeed + level * BUG.speedPerLevel);
}

export function spawnRunner(level: number): FastRunner {
  const direction: Direction = Math.random() < 0.5 ? 1 : -1;
  const x = direction === 1 ? -ENEMIES.runnerWidth : PLAYFIELD.right + ENEMIES.runnerWidth;
  return new FastRunner(x, direction, ENEMIES.runnerBaseSpeed + level * 22);
}

export function spawnDropper(level: number): FallingDropper {
  return new FallingDropper(randomBetween(PLAYFIELD.left + 40, PLAYFIELD.right - 40), PLAYFIELD.top - 24, ENEMIES.dropperBaseSpeed + level * 12);
}

export function obstacleAtPoint(mushrooms: Mushroom[], point: Vector): Mushroom | undefined {
  return mushrooms.find((mushroom) => Math.hypot(mushroom.x + MUSHROOM.width / 2 - point.x, mushroom.y + MUSHROOM.height / 2 - point.y) < MUSHROOM.width);
}

export function makeObstacleNear(point: Vector): Mushroom {
  const x = Math.round((point.x - MUSHROOM.width / 2) / MUSHROOM.width) * MUSHROOM.width;
  const y = Math.round((point.y - MUSHROOM.height / 2) / MUSHROOM.height) * MUSHROOM.height;
  return new Mushroom(
    Math.max(PLAYFIELD.left, Math.min(PLAYFIELD.right - MUSHROOM.width, x)),
    Math.max(PLAYFIELD.top, Math.min(PLAYFIELD.playerZoneTop - MUSHROOM.height, y)),
    2,
  );
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
