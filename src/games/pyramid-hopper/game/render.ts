import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CUBE_DEPTH,
  CUBE_TOP_HEIGHT,
  CUBE_WIDTH,
  PYRAMID_TOP_X,
  PYRAMID_TOP_Y,
  ROW_Y_STEP,
} from "./constants";
import type { Disc, Entity, GameState, GridPosition } from "./types";
import { getTileIndex } from "./gameLogic";

type ScreenPoint = {
  x: number;
  y: number;
};

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawBackdrop(ctx);
  drawDiscs(ctx, state.discs);
  drawPyramid(ctx, state);
  state.entities.forEach((entity) => drawEntity(ctx, entity));
  drawPlayer(ctx, state);
  drawOverlay(ctx, state);
}

export function getCubeCenter(position: GridPosition): ScreenPoint {
  return {
    x: PYRAMID_TOP_X + (position.col - position.row / 2) * CUBE_WIDTH,
    y: PYRAMID_TOP_Y + position.row * ROW_Y_STEP,
  };
}

export function getDiscCenter(disc: Pick<Disc, "anchor" | "side">): ScreenPoint {
  const anchor = getCubeCenter(disc.anchor);
  const sideOffset = disc.side === "left" ? -CUBE_WIDTH * 0.92 : CUBE_WIDTH * 0.92;

  return {
    x: anchor.x + sideOffset,
    y: anchor.y + CUBE_TOP_HEIGHT * 0.72,
  };
}

function drawBackdrop(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, "#0c1020");
  gradient.addColorStop(0.62, "#12182b");
  gradient.addColorStop(1, "#070911");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.strokeStyle = "rgba(120, 229, 255, 0.08)";
  ctx.lineWidth = 1;

  for (let x = 28; x < CANVAS_WIDTH; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 180, CANVAS_HEIGHT);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 246, 181, 0.08)";
  ctx.beginPath();
  ctx.ellipse(CANVAS_WIDTH / 2, 590, 270, 36, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPyramid(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      const position = { row, col };
      drawCube(ctx, position, state.tiles[getTileIndex(position)], state.requiredHits);
    }
  }
}

function drawCube(ctx: CanvasRenderingContext2D, position: GridPosition, progress: number, requiredHits: number): void {
  const center = getCubeCenter(position);
  const halfWidth = CUBE_WIDTH / 2;
  const halfTop = CUBE_TOP_HEIGHT / 2;
  const topColor = getTopColor(progress, requiredHits);
  const rightColor = progress >= requiredHits ? "#a96f2d" : "#253a66";
  const leftColor = progress >= requiredHits ? "#7c4a26" : "#1b2c52";

  const top = { x: center.x, y: center.y };
  const right = { x: center.x + halfWidth, y: center.y + halfTop };
  const bottom = { x: center.x, y: center.y + CUBE_TOP_HEIGHT };
  const left = { x: center.x - halfWidth, y: center.y + halfTop };
  const lower = { x: center.x, y: center.y + CUBE_TOP_HEIGHT + CUBE_DEPTH };

  ctx.fillStyle = leftColor;
  drawPolygon(ctx, [left, bottom, lower, { x: left.x, y: left.y + CUBE_DEPTH }]);
  ctx.fill();

  ctx.fillStyle = rightColor;
  drawPolygon(ctx, [right, bottom, lower, { x: right.x, y: right.y + CUBE_DEPTH }]);
  ctx.fill();

  ctx.fillStyle = topColor;
  drawPolygon(ctx, [top, right, bottom, left]);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
  ctx.lineWidth = 2;
  drawPolygon(ctx, [top, right, bottom, left]);
  ctx.stroke();

  ctx.strokeStyle = "rgba(5, 8, 18, 0.55)";
  ctx.lineWidth = 1;
  drawPolygon(ctx, [left, bottom, lower, { x: left.x, y: left.y + CUBE_DEPTH }]);
  ctx.stroke();
  drawPolygon(ctx, [right, bottom, lower, { x: right.x, y: right.y + CUBE_DEPTH }]);
  ctx.stroke();
}

function getTopColor(progress: number, requiredHits: number): string {
  if (progress >= requiredHits) {
    return "#ffd95f";
  }

  if (progress > 0) {
    return "#54d6c7";
  }

  return "#3c527c";
}

function drawDiscs(ctx: CanvasRenderingContext2D, discs: Disc[]): void {
  discs.forEach((disc) => {
    if (disc.used) {
      return;
    }

    const center = getDiscCenter(disc);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.scale(1.08, 0.52);
    ctx.fillStyle = "#ffcf4a";
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff4a8";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#8c4e1c";
    ctx.fillRect(center.x - 18, center.y + 8, 36, 8);
  });
}

function drawEntity(ctx: CanvasRenderingContext2D, entity: Entity): void {
  const center = getCubeCenter(entity.position);

  if (entity.kind === "pest") {
    drawPest(ctx, center.x, center.y + 17);
    return;
  }

  if (entity.kind === "chaser") {
    drawChaser(ctx, center.x, center.y + 15);
    return;
  }

  drawHazard(ctx, center.x, center.y + 14);
}

function drawHazard(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const gradient = ctx.createRadialGradient(x - 8, y - 8, 3, x, y, 20);
  gradient.addColorStop(0, "#fff1a0");
  gradient.addColorStop(0.42, "#ff7a5c");
  gradient.addColorStop(1, "#b22a4f");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffd0b8";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawPest(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#cf8cff";
  drawPolygon(ctx, [
    { x: 0, y: -18 },
    { x: 18, y: 0 },
    { x: 0, y: 18 },
    { x: -18, y: 0 },
  ]);
  ctx.fill();
  ctx.fillStyle = "#2b113e";
  ctx.fillRect(-8, -4, 16, 8);
  ctx.restore();
}

function drawChaser(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#76ff7a";
  ctx.beginPath();
  ctx.ellipse(-10, 4, 13, 10, -0.32, 0, Math.PI * 2);
  ctx.ellipse(6, -3, 16, 13, 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d8ffd0";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#112414";
  ctx.beginPath();
  ctx.arc(11, -7, 2.6, 0, Math.PI * 2);
  ctx.arc(15, 0, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
  const center = getPlayerCenter(state);

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 19, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#62e7ff";
  ctx.beginPath();
  ctx.arc(0, -3, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f9ffb8";
  drawPolygon(ctx, [
    { x: 0, y: -30 },
    { x: 13, y: -8 },
    { x: 0, y: 13 },
    { x: -13, y: -8 },
  ]);
  ctx.fill();

  ctx.strokeStyle = "#10263d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -3, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function getPlayerCenter(state: GameState): ScreenPoint {
  if (state.discRide) {
    const progress = easeOut(Math.min(1, state.discRide.elapsed / state.discRide.duration));
    const fromDisc = getDiscCenter({ anchor: state.discRide.from, side: state.discRide.side });
    const top = getCubeCenter({ row: 0, col: 0 });
    const arc = Math.sin(progress * Math.PI) * 86;

    return {
      x: lerp(fromDisc.x, top.x, progress),
      y: lerp(fromDisc.y, top.y + 12, progress) - arc,
    };
  }

  if (state.hop) {
    const progress = easeOut(Math.min(1, state.hop.elapsed / state.hop.duration));
    const from = getCubeCenter(state.hop.from);
    const to = getCubeCenter(state.hop.to);
    const arc = Math.sin(progress * Math.PI) * 28;

    return {
      x: lerp(from.x, to.x, progress),
      y: lerp(from.y + 12, to.y + 12, progress) - arc,
    };
  }

  const center = getCubeCenter(state.player);
  return {
    x: center.x,
    y: center.y + 12,
  };
}

function drawOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.status === "playing") {
    return;
  }

  ctx.fillStyle = "rgba(6, 9, 18, 0.68)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const title =
    state.status === "ready"
      ? "Pyramid Hopper"
      : state.status === "paused"
        ? "Paused"
        : state.status === "gameOver"
          ? "Game Over"
          : "Pyramid Cleared";

  ctx.fillStyle = "#fff6cf";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 38px Courier New, monospace";
  ctx.fillText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 34);

  ctx.fillStyle = "#d7e5ff";
  ctx.font = "600 17px system-ui, sans-serif";
  ctx.fillText(state.message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
}

function drawPolygon(ctx: CanvasRenderingContext2D, points: ScreenPoint[]): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }

  ctx.closePath();
}

function easeOut(value: number): number {
  return 1 - (1 - value) * (1 - value);
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}
