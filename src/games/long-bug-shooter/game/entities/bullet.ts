import { BULLET, PLAYFIELD } from "../constants";
import type { Rect } from "../types";

export class Bullet {
  active = true;

  constructor(
    public x: number,
    public y: number,
  ) {}

  get rect(): Rect {
    return {
      x: this.x - BULLET.width / 2,
      y: this.y - BULLET.height,
      width: BULLET.width,
      height: BULLET.height,
    };
  }

  update(deltaSeconds: number): void {
    this.y -= BULLET.speed * deltaSeconds;

    if (this.y + BULLET.height < PLAYFIELD.top) {
      this.active = false;
    }
  }
}
