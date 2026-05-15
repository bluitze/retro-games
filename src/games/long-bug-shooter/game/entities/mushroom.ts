import { MUSHROOM } from "../constants";
import type { HitResult, Rect } from "../types";

export class Mushroom {
  health = MUSHROOM.health;

  constructor(
    public x: number,
    public y: number,
    health = MUSHROOM.health,
  ) {
    this.health = health;
  }

  get rect(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: MUSHROOM.width,
      height: MUSHROOM.height,
    };
  }

  damage(amount: number): HitResult {
    this.health -= amount;
    return {
      destroyed: this.health <= 0,
      center: {
        x: this.x + MUSHROOM.width / 2,
        y: this.y + MUSHROOM.height / 2,
      },
    };
  }

  strengthen(): void {
    this.health = Math.min(MUSHROOM.health, this.health + 1);
  }
}
