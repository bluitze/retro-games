import { INTERNAL_WIDTH, PLAYER_MAX_HEALTH } from '../game/constants';

type HudData = {
  score: number;
  lives: number;
  health: number;
  timeRemaining: number;
  collected: number;
  totalCollectibles: number;
  objective: string;
};

export function drawHud(ctx: CanvasRenderingContext2D, data: HudData): void {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 17, 12, 0.78)';
  ctx.fillRect(0, 0, INTERNAL_WIDTH, 66);

  ctx.font = '18px "Courier New", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f7e8af';
  ctx.fillText(`SCORE ${data.score.toString().padStart(5, '0')}`, 18, 21);
  ctx.fillText(`LIVES ${data.lives}`, 196, 21);

  for (let i = 0; i < PLAYER_MAX_HEALTH; i += 1) {
    ctx.fillStyle = i < data.health ? '#d94c3d' : '#54312e';
    ctx.fillRect(292 + i * 22, 14, 15, 14);
  }

  ctx.fillStyle = '#f7e8af';
  ctx.fillText(`TIME ${Math.max(0, Math.ceil(data.timeRemaining)).toString().padStart(3, '0')}`, 388, 21);
  ctx.fillText(`RELICS ${data.collected}/${data.totalCollectibles}`, 510, 21);

  ctx.font = '15px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#c7daa0';
  ctx.fillText(data.objective, 18, 50);
  ctx.restore();
}
