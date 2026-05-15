import { PLAYFIELD, PLAYER } from "../constants";
import { clamp } from "../collision";
import type { Rect } from "../types";
import type { Input } from "../input";

export class Player {
  x = 0;
  y = 0;
  lives = PLAYER.startLives;
  fireTimer = 0;
  invulnerableTimer = 0;

  constructor() {
    this.resetPosition();
  }

  get rect(): Rect {
    return {
      x: this.x - PLAYER.width / 2,
      y: this.y - PLAYER.height / 2,
      width: PLAYER.width,
      height: PLAYER.height,
    };
  }

  update(deltaSeconds: number, input: Input): void {
    this.fireTimer = Math.max(0, this.fireTimer - deltaSeconds);
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - deltaSeconds);

    const axisX = input.axisX;
    const axisY = input.axisY;
    const length = Math.hypot(axisX, axisY) || 1;
    const speed = PLAYER.speed * deltaSeconds;

    this.x = clamp(
      this.x + (axisX / length) * speed,
      PLAYFIELD.left + PLAYER.width / 2,
      PLAYFIELD.right - PLAYER.width / 2,
    );
    this.y = clamp(
      this.y + (axisY / length) * speed,
      PLAYFIELD.playerZoneTop + PLAYER.height / 2,
      PLAYFIELD.bottom - PLAYER.height / 2,
    );
  }

  canFire(activeBullets: number): boolean {
    return this.fireTimer <= 0 && activeBullets < PLAYER.maxBullets;
  }

  didFire(): void {
    this.fireTimer = PLAYER.fireCooldown;
  }

  loseLife(): boolean {
    if (this.invulnerableTimer > 0) {
      return false;
    }

    this.lives -= 1;
    this.invulnerableTimer = PLAYER.invulnerableSeconds;
    this.resetPosition();
    return true;
  }

  resetPosition(): void {
    this.x = (PLAYFIELD.left + PLAYFIELD.right) / 2;
    this.y = PLAYFIELD.bottom - 42;
  }

  resetAll(): void {
    this.lives = PLAYER.startLives;
    this.fireTimer = 0;
    this.invulnerableTimer = 0;
    this.resetPosition();
  }
}
