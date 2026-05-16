import {
  BOARD_COLS,
  BOARD_HEIGHT,
  BOARD_ROWS,
  BOARD_WIDTH,
  CELL_SIZE,
  HOME_COLS,
  HOME_ROW,
  ROAD_ROWS,
  SAFE_ROWS,
  WATER_ROWS,
} from "./constants";
import { getPlayerRect } from "./gameLogic";
import type { GameState, LaneEntity } from "./types";

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  drawLanes(ctx);
  drawHomes(ctx, state);
  state.entities.forEach((entity) => drawEntity(ctx, entity));
  drawGrid(ctx);
  drawPlayer(ctx, state);
  drawOverlay(ctx, state);
}

function drawLanes(ctx: CanvasRenderingContext2D): void {
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    if (row === HOME_ROW) {
      ctx.fillStyle = "#2e7d50";
    } else if (WATER_ROWS.has(row)) {
      ctx.fillStyle = row % 2 === 0 ? "#1b7293" : "#166782";
    } else if (ROAD_ROWS.has(row)) {
      ctx.fillStyle = row % 2 === 0 ? "#3c4148" : "#343941";
    } else if (SAFE_ROWS.has(row)) {
      ctx.fillStyle = row === BOARD_ROWS - 1 ? "#477c3e" : "#567642";
    } else {
      ctx.fillStyle = "#4f7042";
    }

    ctx.fillRect(0, row * CELL_SIZE, BOARD_WIDTH, CELL_SIZE);

    if (ROAD_ROWS.has(row)) {
      drawRoadMarks(ctx, row);
    }
  }
}

function drawRoadMarks(ctx: CanvasRenderingContext2D, row: number): void {
  ctx.fillStyle = "rgba(244, 238, 196, 0.62)";
  const y = row * CELL_SIZE + CELL_SIZE / 2 - 2;

  for (let x = 12; x < BOARD_WIDTH; x += 72) {
    ctx.fillRect(x, y, 34, 4);
  }
}

function drawHomes(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = "#204d36";
  ctx.fillRect(0, 0, BOARD_WIDTH, CELL_SIZE);

  HOME_COLS.forEach((col, index) => {
    const x = col * CELL_SIZE + 5;
    const occupied = state.occupiedHomes[index];

    ctx.fillStyle = occupied ? "#a7e06f" : "#102c29";
    roundedRect(ctx, x, 7, CELL_SIZE - 10, CELL_SIZE - 14, 10);
    ctx.fill();

    ctx.strokeStyle = occupied ? "#e5ffc0" : "#6fb088";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (occupied) {
      drawMiniHopper(ctx, col * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2, 0.52);
    }
  });
}

function drawEntity(ctx: CanvasRenderingContext2D, entity: LaneEntity): void {
  if (entity.kind === "platform") {
    drawPlatform(ctx, entity);
    return;
  }

  drawVehicle(ctx, entity);
}

function drawPlatform(ctx: CanvasRenderingContext2D, entity: LaneEntity): void {
  ctx.fillStyle = entity.color;
  roundedRect(ctx, entity.x, entity.y, entity.width, entity.height, 12);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 239, 188, 0.25)";
  for (let x = entity.x + 14; x < entity.x + entity.width - 10; x += 34) {
    ctx.fillRect(x, entity.y + 8, 18, 4);
  }
}

function drawVehicle(ctx: CanvasRenderingContext2D, entity: LaneEntity): void {
  ctx.fillStyle = entity.color;
  roundedRect(ctx, entity.x, entity.y, entity.width, entity.height, 8);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  const cabinX = entity.direction === 1 ? entity.x + entity.width - 28 : entity.x + 10;
  ctx.fillRect(cabinX, entity.y + 7, 18, entity.height - 14);

  ctx.fillStyle = "#20242a";
  ctx.beginPath();
  ctx.arc(entity.x + 15, entity.y + entity.height, 5, 0, Math.PI * 2);
  ctx.arc(entity.x + entity.width - 15, entity.y + entity.height, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;

  for (let col = 0; col <= BOARD_COLS; col += 1) {
    ctx.beginPath();
    ctx.moveTo(col * CELL_SIZE, 0);
    ctx.lineTo(col * CELL_SIZE, BOARD_HEIGHT);
    ctx.stroke();
  }

  for (let row = 0; row <= BOARD_ROWS; row += 1) {
    ctx.beginPath();
    ctx.moveTo(0, row * CELL_SIZE);
    ctx.lineTo(BOARD_WIDTH, row * CELL_SIZE);
    ctx.stroke();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
  const rect = getPlayerRect(state.player);
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  drawMiniHopper(ctx, centerX, centerY, 1);
}

function drawMiniHopper(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number): void {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#80d65b";
  ctx.beginPath();
  ctx.ellipse(0, 3, 15, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9af070";
  ctx.beginPath();
  ctx.ellipse(-8, -8, 7, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(8, -8, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#16351e";
  ctx.beginPath();
  ctx.arc(-8, -10, 2.5, 0, Math.PI * 2);
  ctx.arc(8, -10, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#245c2f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-11, 12);
  ctx.lineTo(-18, 17);
  ctx.moveTo(11, 12);
  ctx.lineTo(18, 17);
  ctx.stroke();

  ctx.restore();
}

function drawOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.status === "playing") {
    return;
  }

  ctx.fillStyle = "rgba(12, 20, 24, 0.64)";
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  ctx.fillStyle = "#f7ffe6";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 34px system-ui, sans-serif";

  const title =
    state.status === "ready"
      ? "Pond Jumper"
      : state.status === "paused"
        ? "Paused"
        : state.status === "gameOver"
          ? "Game Over"
          : "Round Complete";

  ctx.fillText(title, BOARD_WIDTH / 2, BOARD_HEIGHT / 2 - 28);
  ctx.font = "500 17px system-ui, sans-serif";
  ctx.fillText(state.message, BOARD_WIDTH / 2, BOARD_HEIGHT / 2 + 18);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
