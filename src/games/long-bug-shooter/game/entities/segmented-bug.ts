import { BUG, PLAYFIELD } from "../constants";
import { rectsOverlap } from "../collision";
import type { Direction, Rect, Vector } from "../types";
import type { Mushroom } from "./mushroom";

export type BugSegment = {
  x: number;
  y: number;
  pulse: number;
};

export class SegmentedBugChain {
  segments: BugSegment[];
  direction: Direction;
  speed: number;
  active = true;
  private moveCarry = 0;
  private descendCooldown = 0;

  constructor(segments: BugSegment[], direction: Direction, speed: number) {
    this.segments = segments;
    this.direction = direction;
    this.speed = speed;
  }

  get head(): BugSegment | undefined {
    return this.segments[0];
  }

  get hostileRects(): Rect[] {
    return this.segments.map((segment) => this.rectFor(segment));
  }

  update(deltaSeconds: number, mushrooms: Mushroom[]): void {
    if (!this.active || this.segments.length === 0) {
      this.active = false;
      return;
    }

    this.descendCooldown = Math.max(0, this.descendCooldown - deltaSeconds);

    const head = this.head;
    if (!head) {
      return;
    }

    const nextHead = {
      x: head.x + this.direction * this.speed * deltaSeconds,
      y: head.y,
    };

    if (this.isBlocked(nextHead, mushrooms)) {
      this.reverseAndDescend();
      return;
    }

    this.moveCarry += Math.abs(nextHead.x - head.x);
    const previousPositions = this.segments.map((segment) => ({ x: segment.x, y: segment.y }));
    head.x = nextHead.x;
    head.y = nextHead.y;

    const step = BUG.segmentSize + BUG.segmentGap;
    if (this.moveCarry >= step) {
      this.moveCarry -= step;
      for (let index = 1; index < this.segments.length; index += 1) {
        this.segments[index].x = previousPositions[index - 1].x;
        this.segments[index].y = previousPositions[index - 1].y;
      }
    } else {
      for (let index = 1; index < this.segments.length; index += 1) {
        const target = previousPositions[index - 1];
        this.segments[index].x += (target.x - this.segments[index].x) * Math.min(1, deltaSeconds * 9);
        this.segments[index].y += (target.y - this.segments[index].y) * Math.min(1, deltaSeconds * 9);
      }
    }

    for (const segment of this.segments) {
      segment.pulse += deltaSeconds;
    }

    if (head.y > PLAYFIELD.bottom + BUG.segmentSize) {
      head.y = PLAYFIELD.top;
    }
  }

  hitSegment(segmentIndex: number): SegmentedBugChain[] {
    const left = this.segments.slice(0, segmentIndex);
    const right = this.segments.slice(segmentIndex + 1);
    this.active = false;

    return [left, right]
      .filter((segments) => segments.length > 0)
      .map((segments, index) => new SegmentedBugChain(segments, index === 0 ? this.direction : ((this.direction * -1) as Direction), this.speed));
  }

  rectFor(segment: BugSegment): Rect {
    return {
      x: segment.x - BUG.segmentSize / 2,
      y: segment.y - BUG.segmentSize / 2,
      width: BUG.segmentSize,
      height: BUG.segmentSize,
    };
  }

  findHit(rect: Rect): { index: number; center: Vector } | undefined {
    const index = this.segments.findIndex((segment) => rectsOverlap(this.rectFor(segment), rect));
    const segment = this.segments[index];

    if (index < 0 || !segment) {
      return undefined;
    }

    return {
      index,
      center: { x: segment.x, y: segment.y },
    };
  }

  private isBlocked(nextHead: Vector, mushrooms: Mushroom[]): boolean {
    const nextRect = {
      x: nextHead.x - BUG.segmentSize / 2,
      y: nextHead.y - BUG.segmentSize / 2,
      width: BUG.segmentSize,
      height: BUG.segmentSize,
    };

    if (nextRect.x <= PLAYFIELD.left || nextRect.x + nextRect.width >= PLAYFIELD.right) {
      return true;
    }

    return mushrooms.some((mushroom) => rectsOverlap(nextRect, mushroom.rect));
  }

  private reverseAndDescend(): void {
    if (this.descendCooldown > 0) {
      return;
    }

    this.direction = (this.direction * -1) as Direction;
    this.descendCooldown = 0.08;

    for (const segment of this.segments) {
      segment.y += BUG.descendOnBlock;
      segment.x += this.direction * 5;
    }
  }
}
