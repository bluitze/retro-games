import { INTERNAL_WIDTH } from '../game/constants';
import { clamp } from './collision';

export class Camera {
  x = 0;
  y = 0;

  constructor(private readonly worldWidth: number) {}

  update(targetX: number, deltaSeconds: number): void {
    const desiredX = clamp(targetX - INTERNAL_WIDTH * 0.42, 0, this.worldWidth - INTERNAL_WIDTH);
    const smoothing = 1 - Math.exp(-deltaSeconds * 8);
    this.x += (desiredX - this.x) * smoothing;
  }

  snapTo(targetX: number): void {
    this.x = clamp(targetX - INTERNAL_WIDTH * 0.42, 0, this.worldWidth - INTERNAL_WIDTH);
  }
}
