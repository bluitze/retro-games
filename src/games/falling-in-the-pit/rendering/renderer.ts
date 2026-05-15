import { INTERNAL_HEIGHT, INTERNAL_WIDTH } from '../game/constants';
import type { GameState } from '../game/state';
import type { Camera } from '../world/camera';
import type { Level } from '../world/level';
import type { Collectible } from '../entities/collectible';
import type { Hazard } from '../entities/hazard';
import type { Player } from '../entities/player';
import { drawHud } from '../ui/hud';
import { drawScreenOverlay } from '../ui/screens';
import {
  drawCheckpoint,
  drawCollectible,
  drawGoal,
  drawHazard,
  drawMud,
  drawPit,
  drawPlatform,
  drawPlayer,
  drawVine,
} from './sprites';

type RenderData = {
  state: GameState;
  level: Level;
  camera: Camera;
  player: Player;
  hazards: Hazard[];
  collectibles: Collectible[];
  activeCheckpoints: Set<string>;
  score: number;
  timeRemaining: number;
  objective: string;
  elapsedSeconds: number;
};

export class Renderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('2D canvas context is unavailable.');
    }

    this.context = context;
    this.context.imageSmoothingEnabled = false;
  }

  render(data: RenderData): void {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackground(ctx, data.camera.x);

    ctx.save();
    ctx.translate(-Math.round(data.camera.x), -Math.round(data.camera.y));
    this.drawLevel(ctx, data);
    ctx.restore();

    drawHud(ctx, {
      score: data.score,
      lives: data.player.lives,
      health: data.player.health,
      timeRemaining: data.timeRemaining,
      collected: data.collectibles.filter((collectible) => collectible.collected).length,
      totalCollectibles: data.collectibles.length,
      objective: data.objective,
    });

    drawScreenOverlay(ctx, data.state, {
      score: data.score,
      collected: data.collectibles.filter((collectible) => collectible.collected).length,
      totalCollectibles: data.collectibles.length,
    });
  }

  private drawBackground(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const sky = ctx.createLinearGradient(0, 0, 0, INTERNAL_HEIGHT);
    sky.addColorStop(0, '#163f45');
    sky.addColorStop(0.52, '#255d3b');
    sky.addColorStop(1, '#102014');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

    ctx.fillStyle = '#183f2a';
    for (let i = -1; i < 18; i += 1) {
      const x = i * 80 - (cameraX * 0.2) % 80;
      ctx.fillRect(x + 28, 96, 18, 292);
      ctx.fillRect(x, 120, 76, 34);
      ctx.fillRect(x + 14, 82, 52, 30);
    }

    ctx.fillStyle = '#0c2719';
    for (let i = -1; i < 14; i += 1) {
      const x = i * 100 - (cameraX * 0.42) % 100;
      ctx.fillRect(x + 34, 178, 22, 260);
      ctx.fillRect(x + 5, 205, 88, 40);
      ctx.fillRect(x + 18, 156, 58, 38);
    }
  }

  private drawLevel(ctx: CanvasRenderingContext2D, data: RenderData): void {
    for (const pit of data.level.pits) {
      drawPit(ctx, pit);
    }

    for (const platform of data.level.platforms) {
      drawPlatform(ctx, platform);
    }

    for (const mud of data.level.mud) {
      drawMud(ctx, mud, data.elapsedSeconds);
    }

    for (const vine of data.level.climbables) {
      drawVine(ctx, vine);
    }

    for (const checkpoint of data.level.checkpoints) {
      drawCheckpoint(ctx, checkpoint, data.activeCheckpoints.has(checkpoint.id));
    }

    drawGoal(ctx, data.level.goal);

    for (const collectible of data.collectibles) {
      if (!collectible.collected) {
        drawCollectible(ctx, collectible.rect, data.elapsedSeconds);
      }
    }

    for (const hazard of data.hazards) {
      drawHazard(ctx, hazard);
    }

    drawPlayer(ctx, data.player);
  }
}
