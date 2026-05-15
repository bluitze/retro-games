import type { Hazard } from '../entities/hazard';
import type { Player } from '../entities/player';
import type { Platform } from '../world/level';
import type { Rect } from '../world/collision';

export function drawPlatform(ctx: CanvasRenderingContext2D, platform: Platform): void {
  const colors: Record<Platform['kind'], { top: string; body: string; trim: string }> = {
    earth: { top: '#47652d', body: '#6b4a25', trim: '#2b3218' },
    stone: { top: '#a79664', body: '#655d4a', trim: '#36342e' },
    bridge: { top: '#9a6b2b', body: '#6c421c', trim: '#302211' },
    ledge: { top: '#52743b', body: '#744f2a', trim: '#29331d' },
  };
  const color = colors[platform.kind];

  ctx.fillStyle = color.body;
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  ctx.fillStyle = color.top;
  ctx.fillRect(platform.x, platform.y, platform.width, 8);
  ctx.fillStyle = color.trim;
  ctx.fillRect(platform.x, platform.y + platform.height - 8, platform.width, 8);

  if (platform.kind === 'bridge') {
    ctx.fillStyle = '#2f2414';
    for (let x = platform.x + 12; x < platform.x + platform.width; x += 28) {
      ctx.fillRect(x, platform.y + 1, 4, platform.height - 2);
    }
  }
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  const flicker = player.invulnerableSeconds > 0 && Math.floor(player.invulnerableSeconds * 16) % 2 === 0;

  if (flicker) {
    ctx.globalAlpha = 0.45;
  }

  const x = Math.round(player.x);
  const y = Math.round(player.y);

  ctx.fillStyle = '#efc15f';
  ctx.fillRect(x + 8, y + 4, 14, 14);
  ctx.fillStyle = '#234c45';
  ctx.fillRect(x + 5, y + 18, 20, 18);
  ctx.fillStyle = '#d16a3a';
  ctx.fillRect(x + (player.facing > 0 ? 19 : 5), y + 7, 5, 4);
  ctx.fillStyle = '#4b2c1a';
  ctx.fillRect(x + 5, y, 20, 7);
  ctx.fillRect(x + 2, y + 5, 26, 4);
  ctx.fillStyle = '#efc15f';
  ctx.fillRect(x + 1, y + 21, 7, 13);
  ctx.fillRect(x + 22, y + 21, 7, 13);
  ctx.fillStyle = '#342619';
  ctx.fillRect(x + 7, y + 36, 7, 10);
  ctx.fillRect(x + 17, y + 36, 7, 10);

  ctx.globalAlpha = 1;
}

export function drawCollectible(ctx: CanvasRenderingContext2D, rect: Rect, pulse: number): void {
  const glow = Math.sin(pulse * 5) * 2;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  ctx.fillStyle = '#ffdf6b';
  ctx.fillRect(centerX - 8 - glow / 2, centerY - 8 - glow / 2, 16 + glow, 16 + glow);
  ctx.fillStyle = '#2a7649';
  ctx.fillRect(centerX - 4, centerY - 12, 8, 24);
  ctx.fillRect(centerX - 12, centerY - 4, 24, 8);
  ctx.fillStyle = '#fff0a8';
  ctx.fillRect(centerX - 3, centerY - 3, 6, 6);
}

export function drawHazard(ctx: CanvasRenderingContext2D, hazard: Hazard): void {
  const rect = hazard.rect;

  if (hazard.kind === 'roller') {
    ctx.fillStyle = '#3d3126';
    ctx.fillRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
    ctx.fillStyle = '#997245';
    ctx.fillRect(rect.x + 8, rect.y, rect.width - 16, rect.height);
    ctx.fillRect(rect.x, rect.y + 8, rect.width, rect.height - 16);
    return;
  }

  if (hazard.kind === 'crawler') {
    ctx.fillStyle = '#6e2d35';
    ctx.fillRect(rect.x, rect.y + 7, rect.width, rect.height - 7);
    ctx.fillStyle = '#d59755';
    ctx.fillRect(rect.x + 6, rect.y, 10, 10);
    ctx.fillRect(rect.x + rect.width - 16, rect.y, 10, 10);
    return;
  }

  if (hazard.kind === 'swing') {
    ctx.strokeStyle = '#3b2a17';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(rect.x + rect.width / 2, rect.y);
    ctx.lineTo(rect.x + rect.width / 2, rect.y + rect.height);
    ctx.stroke();
    ctx.fillStyle = '#a7372f';
    ctx.fillRect(rect.x, rect.y + rect.height - 28, rect.width, 28);
    ctx.fillStyle = '#f0b25a';
    ctx.fillRect(rect.x + 8, rect.y + rect.height - 20, rect.width - 16, 12);
    return;
  }

  ctx.fillStyle = '#5f513d';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = '#b59b6d';
  ctx.fillRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10);
}

export function drawVine(ctx: CanvasRenderingContext2D, vine: Rect): void {
  ctx.strokeStyle = '#235d31';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(vine.x + vine.width / 2, vine.y);
  ctx.lineTo(vine.x + vine.width / 2, vine.y + vine.height);
  ctx.stroke();
  ctx.fillStyle = '#61a349';
  for (let y = vine.y + 14; y < vine.y + vine.height; y += 22) {
    ctx.fillRect(vine.x + 4, y, vine.width - 8, 5);
  }
}

export function drawCheckpoint(ctx: CanvasRenderingContext2D, checkpoint: Rect, active: boolean): void {
  ctx.fillStyle = '#2c2517';
  ctx.fillRect(checkpoint.x + 18, checkpoint.y + 12, 6, checkpoint.height - 12);
  ctx.fillStyle = active ? '#f0ca54' : '#9d6f3b';
  ctx.fillRect(checkpoint.x + 22, checkpoint.y + 12, 24, 18);
  ctx.fillStyle = active ? '#f8e99a' : '#5f4327';
  ctx.fillRect(checkpoint.x + 25, checkpoint.y + 17, 10, 5);
}

export function drawGoal(ctx: CanvasRenderingContext2D, goal: Rect): void {
  ctx.fillStyle = '#2c2517';
  ctx.fillRect(goal.x + 12, goal.y, 7, goal.height);
  ctx.fillStyle = '#24a1a4';
  ctx.fillRect(goal.x + 19, goal.y + 10, 42, 30);
  ctx.fillStyle = '#f7db7d';
  ctx.fillRect(goal.x + 28, goal.y + 18, 14, 8);
}

export function drawMud(ctx: CanvasRenderingContext2D, mud: Rect, pulse: number): void {
  ctx.fillStyle = '#584028';
  ctx.fillRect(mud.x, mud.y, mud.width, mud.height);
  ctx.fillStyle = '#85603a';
  for (let x = mud.x + 8; x < mud.x + mud.width; x += 28) {
    const bob = Math.sin(pulse * 3 + x * 0.05) * 2;
    ctx.fillRect(x, mud.y + 5 + bob, 14, 4);
  }
}

export function drawPit(ctx: CanvasRenderingContext2D, pit: Rect): void {
  ctx.fillStyle = '#050908';
  ctx.fillRect(pit.x, pit.y, pit.width, pit.height);
  ctx.fillStyle = '#1b2518';
  ctx.fillRect(pit.x, pit.y, pit.width, 8);
}
