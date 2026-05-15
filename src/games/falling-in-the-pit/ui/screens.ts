import { INTERNAL_HEIGHT, INTERNAL_WIDTH } from '../game/constants';
import { GameState } from '../game/state';

type ScreenData = {
  score: number;
  collected: number;
  totalCollectibles: number;
};

export function drawScreenOverlay(ctx: CanvasRenderingContext2D, state: GameState, data: ScreenData): void {
  if (state === GameState.Playing) {
    return;
  }

  ctx.save();
  ctx.fillStyle = state === GameState.Title ? '#10281d' : 'rgba(5, 10, 8, 0.72)';
  ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (state === GameState.Title) {
    drawTitle(ctx);
  } else if (state === GameState.Paused) {
    drawPanel(ctx, 'PAUSED', 'Escape resumes the expedition.');
  } else if (state === GameState.GameOver) {
    drawPanel(ctx, 'GAME OVER', `Score ${data.score} | Relics ${data.collected}/${data.totalCollectibles}`);
    drawSmall(ctx, 'Press Enter to try again.', 342);
  } else if (state === GameState.Victory) {
    drawPanel(ctx, 'VICTORY', `Score ${data.score} | Relics ${data.collected}/${data.totalCollectibles}`);
    drawSmall(ctx, 'Press Enter for a fresh run.', 342);
  }

  ctx.restore();
}

function drawTitle(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#07140d';
  ctx.fillRect(0, 370, INTERNAL_WIDTH, 170);
  ctx.fillStyle = '#1b5a2e';
  for (let x = 0; x < INTERNAL_WIDTH; x += 60) {
    ctx.fillRect(x, 350 + ((x / 60) % 3) * 8, 42, 70);
  }

  ctx.fillStyle = '#f2cf65';
  ctx.font = '48px "Courier New", monospace';
  ctx.fillText('FALLING IN THE PIT', INTERNAL_WIDTH / 2, 158);
  ctx.fillStyle = '#bfe0a5';
  ctx.font = '20px "Courier New", monospace';
  ctx.fillText('An original jungle relic platformer', INTERNAL_WIDTH / 2, 204);
  ctx.fillStyle = '#f7e8af';
  ctx.font = '18px "Courier New", monospace';
  ctx.fillText('Enter starts | Arrows or WASD move | Space jumps | Escape pauses', INTERNAL_WIDTH / 2, 278);
  ctx.fillText('Collect relics, hit checkpoints, and reach the flag before time runs out.', INTERNAL_WIDTH / 2, 310);
}

function drawPanel(ctx: CanvasRenderingContext2D, title: string, subtitle: string): void {
  ctx.fillStyle = '#142a20';
  ctx.fillRect(252, 164, 456, 176);
  ctx.strokeStyle = '#f2cf65';
  ctx.lineWidth = 4;
  ctx.strokeRect(252, 164, 456, 176);
  ctx.fillStyle = '#f2cf65';
  ctx.font = '42px "Courier New", monospace';
  ctx.fillText(title, INTERNAL_WIDTH / 2, 222);
  ctx.fillStyle = '#f7e8af';
  ctx.font = '19px "Courier New", monospace';
  ctx.fillText(subtitle, INTERNAL_WIDTH / 2, 278);
}

function drawSmall(ctx: CanvasRenderingContext2D, text: string, y: number): void {
  ctx.fillStyle = '#bfe0a5';
  ctx.font = '18px "Courier New", monospace';
  ctx.fillText(text, INTERNAL_WIDTH / 2, y);
}
