import { intersects, type Rect } from '../world/collision';
import type { HazardDefinition, HazardKind } from '../world/level';

export class Hazard {
  readonly kind: HazardKind;
  readonly width: number;
  readonly height: number;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly speed: number;
  readonly phase: number;
  x: number;
  y: number;
  private direction = 1;
  private timer = 0;

  constructor(definition: HazardDefinition) {
    this.kind = definition.kind;
    this.x = definition.x;
    this.y = definition.y;
    this.width = definition.width;
    this.height = definition.height;
    this.minX = definition.minX ?? definition.x;
    this.maxX = definition.maxX ?? definition.x;
    this.minY = definition.minY ?? definition.y;
    this.maxY = definition.maxY ?? definition.y;
    this.speed = definition.speed ?? 100;
    this.phase = definition.phase ?? 0;
    this.timer = this.phase;
  }

  get rect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  update(deltaSeconds: number): void {
    this.timer += deltaSeconds;

    if (this.kind === 'swing') {
      const midpoint = (this.minX + this.maxX) / 2;
      const radius = (this.maxX - this.minX) / 2;
      this.x = midpoint + Math.sin(this.timer * this.speed) * radius - this.width / 2;
      return;
    }

    if (this.kind === 'falling') {
      const travel = this.maxY - this.minY;
      const cycle = Math.max(1, travel / this.speed + 1.15);
      const local = (this.timer + this.phase) % cycle;

      if (local < travel / this.speed) {
        this.y = this.minY + local * this.speed;
      } else {
        this.y = this.minY;
      }

      return;
    }

    this.x += this.direction * this.speed * deltaSeconds;

    if (this.x <= this.minX) {
      this.x = this.minX;
      this.direction = 1;
    } else if (this.x + this.width >= this.maxX) {
      this.x = this.maxX - this.width;
      this.direction = -1;
    }
  }

  touches(rect: Rect): boolean {
    return intersects(this.rect, rect);
  }
}
