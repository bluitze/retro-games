import { intersects, type Rect } from '../world/collision';
import type { CollectibleDefinition } from '../world/level';

export class Collectible {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly value: number;
  readonly label: string;
  readonly width = 28;
  readonly height = 28;
  collected = false;

  constructor(definition: CollectibleDefinition) {
    this.id = definition.id;
    this.x = definition.x;
    this.y = definition.y;
    this.value = definition.value;
    this.label = definition.label;
  }

  get rect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  collectIfTouched(rect: Rect): boolean {
    if (this.collected || !intersects(this.rect, rect)) {
      return false;
    }

    this.collected = true;
    return true;
  }

  reset(): void {
    this.collected = false;
  }
}
