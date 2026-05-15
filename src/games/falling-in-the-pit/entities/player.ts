import {
  DAMAGE_INVULNERABILITY_SECONDS,
  GRAVITY,
  MAX_FALL_SPEED,
  PLAYER_CLIMB_SPEED,
  PLAYER_HEIGHT,
  PLAYER_JUMP_SPEED,
  PLAYER_MAX_HEALTH,
  PLAYER_SPEED,
  PLAYER_START_LIVES,
  PLAYER_WIDTH,
} from '../game/constants';
import type { Input } from '../game/input';
import { clamp, intersects, resolveHorizontal, resolveVertical, type MovingRect, type Rect } from '../world/collision';
import type { Level } from '../world/level';

export type DamageResult = 'ignored' | 'damaged' | 'lost-life' | 'game-over';

export class Player implements MovingRect {
  x: number;
  y: number;
  width = PLAYER_WIDTH;
  height = PLAYER_HEIGHT;
  velocityX = 0;
  velocityY = 0;
  health = PLAYER_MAX_HEALTH;
  lives = PLAYER_START_LIVES;
  onGround = false;
  climbing = false;
  facing: -1 | 1 = 1;
  invulnerableSeconds = 0;
  checkpointX: number;
  checkpointY: number;

  constructor(spawnX: number, spawnY: number) {
    this.x = spawnX;
    this.y = spawnY;
    this.checkpointX = spawnX;
    this.checkpointY = spawnY;
  }

  get rect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  resetForNewRun(spawnX: number, spawnY: number): void {
    this.x = spawnX;
    this.y = spawnY;
    this.checkpointX = spawnX;
    this.checkpointY = spawnY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.health = PLAYER_MAX_HEALTH;
    this.lives = PLAYER_START_LIVES;
    this.onGround = false;
    this.climbing = false;
    this.invulnerableSeconds = 0;
  }

  update(deltaSeconds: number, input: Input, level: Level): void {
    if (this.invulnerableSeconds > 0) {
      this.invulnerableSeconds = Math.max(0, this.invulnerableSeconds - deltaSeconds);
    }

    const moveDirection = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    const climbDirection = (input.isDown('down') ? 1 : 0) - (input.isDown('up') ? 1 : 0);
    const jumpPressed = input.consumePress('jump');
    const touchingVine = level.climbables.some((vine) => intersects(this.rect, vine));

    if (moveDirection !== 0) {
      this.facing = moveDirection > 0 ? 1 : -1;
    }

    if (touchingVine && (input.isDown('up') || input.isDown('down'))) {
      this.climbing = true;
      this.velocityY = 0;
    }

    if (!touchingVine || jumpPressed) {
      this.climbing = false;
    }

    this.velocityX = moveDirection * PLAYER_SPEED;

    if (this.climbing) {
      this.velocityY = climbDirection * PLAYER_CLIMB_SPEED;
    } else {
      if (jumpPressed && this.onGround) {
        this.velocityY = -PLAYER_JUMP_SPEED;
        this.onGround = false;
      }

      this.velocityY = clamp(this.velocityY + GRAVITY * deltaSeconds, -PLAYER_JUMP_SPEED, MAX_FALL_SPEED);
    }

    this.x += this.velocityX * deltaSeconds;
    resolveHorizontal(this, level.platforms);
    this.x = clamp(this.x, 0, level.width - this.width);

    this.y += this.velocityY * deltaSeconds;
    this.onGround = resolveVertical(this, level.platforms);
    this.y = clamp(this.y, -80, level.height + 160);
  }

  takeDamage(): DamageResult {
    if (this.invulnerableSeconds > 0) {
      return 'ignored';
    }

    this.health -= 1;
    this.invulnerableSeconds = DAMAGE_INVULNERABILITY_SECONDS;

    if (this.health > 0) {
      return 'damaged';
    }

    this.lives -= 1;

    if (this.lives <= 0) {
      return 'game-over';
    }

    this.health = PLAYER_MAX_HEALTH;
    return 'lost-life';
  }

  respawnAtCheckpoint(): void {
    this.x = this.checkpointX;
    this.y = this.checkpointY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.climbing = false;
    this.onGround = false;
    this.invulnerableSeconds = DAMAGE_INVULNERABILITY_SECONDS;
  }

  setCheckpoint(x: number, y: number): void {
    this.checkpointX = x;
    this.checkpointY = y;
  }
}
