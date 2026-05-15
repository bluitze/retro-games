import { CANVAS, ENEMIES, PLAYFIELD } from "../constants";
import type { Direction, Hostile, Rect } from "../types";

export class FastRunner implements Hostile {
  active = true;
  y: number;

  constructor(
    public x: number,
    public direction: Direction,
    public speed: number,
  ) {
    this.y = PLAYFIELD.playerZoneTop + 36 + Math.random() * 92;
  }

  get rect(): Rect {
    return {
      x: this.x - ENEMIES.runnerWidth / 2,
      y: this.y - ENEMIES.runnerHeight / 2,
      width: ENEMIES.runnerWidth,
      height: ENEMIES.runnerHeight,
    };
  }

  update(deltaSeconds: number): void {
    this.x += this.direction * this.speed * deltaSeconds;
    if (this.x < -ENEMIES.runnerWidth || this.x > CANVAS.width + ENEMIES.runnerWidth) {
      this.active = false;
    }
  }
}

export class FallingDropper implements Hostile {
  active = true;
  drift = (Math.random() - 0.5) * 36;

  constructor(
    public x: number,
    public y: number,
    public speed: number,
  ) {}

  get rect(): Rect {
    return {
      x: this.x - ENEMIES.dropperSize / 2,
      y: this.y - ENEMIES.dropperSize / 2,
      width: ENEMIES.dropperSize,
      height: ENEMIES.dropperSize,
    };
  }

  update(deltaSeconds: number): void {
    this.y += this.speed * deltaSeconds;
    this.x += this.drift * deltaSeconds;

    if (this.y > PLAYFIELD.bottom + ENEMIES.dropperSize) {
      this.active = false;
    }
  }
}
