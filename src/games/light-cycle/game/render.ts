import {
  ARENA_BACKGROUND,
  ARENA_PADDING,
  BOARD_COLUMNS,
  BOARD_ROWS,
  GRID_COLOR,
  GRID_MAJOR_COLOR,
  HUD_HEIGHT,
  MUTED_TEXT_COLOR,
  PLAYER_INSET,
  TEXT_COLOR,
  TRAIL_INSET,
  WALL_COLOR,
} from "./config";
import type { GameState, PlayerId, PlayerState, Position } from "./types";

interface ArenaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  cellSize: number;
}

const playerIds: PlayerId[] = ["one", "two"];

const getArenaBounds = (canvasWidth: number, canvasHeight: number): ArenaBounds => {
  const availableWidth = canvasWidth - ARENA_PADDING * 2;
  const availableHeight = canvasHeight - HUD_HEIGHT - ARENA_PADDING * 2;
  const cellSize = Math.floor(Math.min(availableWidth / BOARD_COLUMNS, availableHeight / BOARD_ROWS));
  const width = cellSize * BOARD_COLUMNS;
  const height = cellSize * BOARD_ROWS;

  return {
    x: Math.floor((canvasWidth - width) / 2),
    y: Math.floor(HUD_HEIGHT + (availableHeight - height) / 2),
    width,
    height,
    cellSize,
  };
};

const clear = (context: CanvasRenderingContext2D, width: number, height: number) => {
  context.fillStyle = ARENA_BACKGROUND;
  context.fillRect(0, 0, width, height);
};

const drawHud = (context: CanvasRenderingContext2D, state: GameState, width: number) => {
  const p1 = state.players.one;
  const p2 = state.players.two;

  context.save();
  context.fillStyle = TEXT_COLOR;
  context.textBaseline = "top";
  context.font = "700 30px Inter, system-ui, sans-serif";
  context.fillText("Light Cycle Arena", ARENA_PADDING, 24);

  context.font = "600 18px Inter, system-ui, sans-serif";
  context.fillStyle = p1.color;
  context.fillText(`${p1.name}: ${p1.score}`, ARENA_PADDING, 64);

  context.textAlign = "right";
  context.fillStyle = p2.color;
  context.fillText(`${p2.name}: ${p2.score}`, width - ARENA_PADDING, 64);

  context.textAlign = "center";
  context.fillStyle = TEXT_COLOR;
  context.font = "700 18px Inter, system-ui, sans-serif";
  context.fillText(state.message, width / 2, 26);

  context.fillStyle = MUTED_TEXT_COLOR;
  context.font = "500 13px Inter, system-ui, sans-serif";
  context.fillText("WASD steer  |  NPC opponent  |  Space start  |  P pause  |  R reset", width / 2, 62);
  context.restore();
};

const drawGrid = (context: CanvasRenderingContext2D, arena: ArenaBounds) => {
  context.save();
  context.strokeStyle = GRID_COLOR;
  context.lineWidth = 1;

  for (let column = 0; column <= BOARD_COLUMNS; column += 1) {
    context.beginPath();
    context.strokeStyle = column % 8 === 0 ? GRID_MAJOR_COLOR : GRID_COLOR;
    context.moveTo(arena.x + column * arena.cellSize + 0.5, arena.y);
    context.lineTo(arena.x + column * arena.cellSize + 0.5, arena.y + arena.height);
    context.stroke();
  }

  for (let row = 0; row <= BOARD_ROWS; row += 1) {
    context.beginPath();
    context.strokeStyle = row % 8 === 0 ? GRID_MAJOR_COLOR : GRID_COLOR;
    context.moveTo(arena.x, arena.y + row * arena.cellSize + 0.5);
    context.lineTo(arena.x + arena.width, arena.y + row * arena.cellSize + 0.5);
    context.stroke();
  }

  context.strokeStyle = WALL_COLOR;
  context.lineWidth = 2;
  context.strokeRect(arena.x, arena.y, arena.width, arena.height);
  context.restore();
};

const drawCell = (
  context: CanvasRenderingContext2D,
  arena: ArenaBounds,
  position: Position,
  insetRatio: number,
) => {
  const inset = Math.max(1, arena.cellSize * insetRatio);
  context.fillRect(
    arena.x + position.x * arena.cellSize + inset,
    arena.y + position.y * arena.cellSize + inset,
    arena.cellSize - inset * 2,
    arena.cellSize - inset * 2,
  );
};

const drawPlayer = (context: CanvasRenderingContext2D, arena: ArenaBounds, player: PlayerState) => {
  context.save();
  context.shadowColor = player.color;
  context.shadowBlur = 16;
  context.fillStyle = player.color;

  for (const segment of player.trail) {
    context.globalAlpha = player.alive ? 0.88 : 0.45;
    drawCell(context, arena, segment, TRAIL_INSET);
  }

  context.globalAlpha = player.alive ? 1 : 0.5;
  drawCell(context, arena, player.position, PLAYER_INSET);
  context.restore();
};

const drawOverlay = (
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
) => {
  if (state.phase === "playing") {
    return;
  }

  context.save();
  context.fillStyle = "rgba(5, 7, 13, 0.55)";
  context.fillRect(0, HUD_HEIGHT, width, height - HUD_HEIGHT);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = TEXT_COLOR;
  context.font = "800 34px Inter, system-ui, sans-serif";

  const title =
    state.phase === "paused"
      ? "Paused"
      : state.phase === "round-over"
        ? state.isDraw
          ? "Draw"
          : `${state.players[state.winner ?? "one"].name} wins`
        : "Ready";

  context.fillText(title, width / 2, height / 2 - 22);
  context.fillStyle = MUTED_TEXT_COLOR;
  context.font = "600 16px Inter, system-ui, sans-serif";
  context.fillText(
    state.phase === "paused" ? "Press P to resume" : "Press Space to start",
    width / 2,
    height / 2 + 22,
  );
  context.restore();
};

export const render = (
  context: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
) => {
  clear(context, width, height);
  drawHud(context, state, width);

  const arena = getArenaBounds(width, height);
  drawGrid(context, arena);

  for (const id of playerIds) {
    drawPlayer(context, arena, state.players[id]);
  }

  drawOverlay(context, state, width, height);
};
