import {
  BOARD_COLS,
  BOARD_HEIGHT,
  BOARD_ROWS,
  BOARD_WIDTH,
  CELL_SIZE,
  HOME_COLS,
  HOME_COUNT,
  HOME_ROW,
  LANE_CONFIGS,
  ROUND_SECONDS,
  START_COL,
  START_ROW,
  STARTING_LIVES,
  WATER_ROWS,
} from "./constants";
import type { GameState, LaneEntity, MoveDirection, Player, Rect } from "./types";

const PLAYER_MARGIN = 8;
const MIN_ENTITY_WIDTH = 56;

export function createInitialState(): GameState {
  return {
    score: 0,
    lives: STARTING_LIVES,
    level: 1,
    timer: ROUND_SECONDS,
    player: createStartingPlayer(),
    occupiedHomes: Array.from({ length: HOME_COUNT }, () => false),
    entities: createLaneEntities(1),
    status: "ready",
    message: "Guide the hopper to every open cove.",
  };
}

export function createStartingPlayer(): Player {
  return {
    col: START_COL,
    row: START_ROW,
    rideOffset: 0,
  };
}

export function createLaneEntities(level: number): LaneEntity[] {
  return LANE_CONFIGS.flatMap((lane) => {
    const tunedLane = tuneLaneForLevel(lane, level);
    const spacing = tunedLane.entityWidth + tunedLane.gap;
    const count = Math.ceil((BOARD_WIDTH + spacing * 2) / spacing);
    const startX = tunedLane.direction === 1 ? -spacing : BOARD_WIDTH;

    return Array.from({ length: count }, (_, index) => ({
      x: startX + index * spacing * tunedLane.direction,
      y: tunedLane.row * CELL_SIZE + 7,
      width: tunedLane.entityWidth,
      height: CELL_SIZE - 14,
      laneRow: tunedLane.row,
      kind: tunedLane.kind === "road" ? "vehicle" : "platform",
      color: tunedLane.color,
      speed: tunedLane.speed,
      direction: tunedLane.direction,
    }));
  });
}

function tuneLaneForLevel(lane: (typeof LANE_CONFIGS)[number], level: number): (typeof LANE_CONFIGS)[number] {
  const levelIndex = Math.max(0, level - 1);

  if (lane.kind === "road") {
    const speedScale = clamp(0.65 + levelIndex * 0.12, 0.65, 1.85);
    const gapScale = clamp(1.65 - levelIndex * 0.1, 0.72, 1.65);
    const widthScale = clamp(0.86 + levelIndex * 0.035, 0.86, 1.12);

    return {
      ...lane,
      speed: lane.speed * speedScale,
      entityWidth: Math.max(MIN_ENTITY_WIDTH, Math.round(lane.entityWidth * widthScale)),
      gap: Math.round(lane.gap * gapScale),
    };
  }

  const speedScale = clamp(0.82 + levelIndex * 0.08, 0.82, 1.55);
  const gapScale = clamp(0.72 + levelIndex * 0.08, 0.72, 1.45);
  const widthScale = clamp(1.18 - levelIndex * 0.045, 0.82, 1.18);

  return {
    ...lane,
    speed: lane.speed * speedScale,
    entityWidth: Math.max(MIN_ENTITY_WIDTH, Math.round(lane.entityWidth * widthScale)),
    gap: Math.round(lane.gap * gapScale),
  };
}

export function movePlayer(player: Player, direction: MoveDirection): Player {
  const next = { ...player, rideOffset: 0 };

  if (direction === "up") {
    next.row -= 1;
  }

  if (direction === "down") {
    next.row += 1;
  }

  if (direction === "left") {
    next.col -= 1;
  }

  if (direction === "right") {
    next.col += 1;
  }

  next.row = clamp(next.row, 0, BOARD_ROWS - 1);
  next.col = clamp(next.col, 0, BOARD_COLS - 1);

  return next;
}

export function updateGame(state: GameState, deltaSeconds: number): GameState {
  if (state.status !== "playing") {
    return state;
  }

  const next: GameState = {
    ...state,
    timer: Math.max(0, state.timer - deltaSeconds),
    entities: moveEntities(state.entities, deltaSeconds),
    player: { ...state.player },
  };

  if (next.timer <= 0) {
    return loseLife(next, "Time ran out.");
  }

  const rideResult = resolvePlatformRide(next.player, next.entities, deltaSeconds);
  next.player = rideResult.player;

  if (isPlayerOffBoard(next.player)) {
    return loseLife(next, "The current carried you away.");
  }

  const playerRect = getPlayerRect(next.player);

  if (next.entities.some((entity) => entity.kind === "vehicle" && intersects(playerRect, entity))) {
    return loseLife(next, "A road hazard clipped the hopper.");
  }

  if (WATER_ROWS.has(next.player.row) && !rideResult.isRiding) {
    return loseLife(next, "The hopper missed a platform.");
  }

  return next;
}

export function handlePlayerMove(state: GameState, direction: MoveDirection): GameState {
  if (state.status !== "playing") {
    return state;
  }

  const movedPlayer = movePlayer(state.player, direction);
  const movedState = { ...state, player: movedPlayer, score: state.score + (direction === "up" ? 10 : 0) };

  if (movedPlayer.row === HOME_ROW) {
    return resolveHomeArrival(movedState);
  }

  return movedState;
}

export function startGame(state: GameState): GameState {
  if (state.status === "paused" || state.status === "roundWon") {
    return { ...state, status: "playing", message: "Keep hopping." };
  }

  if (state.status === "gameOver") {
    return { ...createInitialState(), status: "playing", message: "Find the open coves." };
  }

  return { ...state, status: "playing", message: "Find the open coves." };
}

export function togglePause(state: GameState): GameState {
  if (state.status === "playing") {
    return { ...state, status: "paused", message: "Paused." };
  }

  if (state.status === "paused") {
    return { ...state, status: "playing", message: "Keep hopping." };
  }

  return state;
}

export function restartGame(): GameState {
  return { ...createInitialState(), status: "playing", message: "Fresh pond, fresh run." };
}

function moveEntities(entities: LaneEntity[], deltaSeconds: number): LaneEntity[] {
  return entities.map((entity) => {
    const distance = entity.speed * deltaSeconds * entity.direction;
    let x = entity.x + distance;

    if (entity.direction === 1 && x > BOARD_WIDTH + entity.width) {
      x = -entity.width;
    }

    if (entity.direction === -1 && x < -entity.width * 2) {
      x = BOARD_WIDTH + entity.width;
    }

    return { ...entity, x };
  });
}

function resolvePlatformRide(
  player: Player,
  entities: LaneEntity[],
  deltaSeconds: number,
): { player: Player; isRiding: boolean } {
  if (!WATER_ROWS.has(player.row)) {
    return { player, isRiding: false };
  }

  const playerRect = getPlayerRect(player);
  const platform = entities.find((entity) => entity.kind === "platform" && intersects(playerRect, entity));

  if (!platform) {
    return { player, isRiding: false };
  }

  const rideOffset = player.rideOffset + platform.speed * deltaSeconds * platform.direction;
  const frameOffset = platform.speed * deltaSeconds * platform.direction;
  const carriedCol = player.col + frameOffset / CELL_SIZE;

  return {
    player: {
      ...player,
      col: carriedCol,
      rideOffset,
    },
    isRiding: true,
  };
}

function resolveHomeArrival(state: GameState): GameState {
  const homeIndex = HOME_COLS.findIndex((homeCol) => Math.abs(state.player.col - homeCol) <= 0.45);

  if (homeIndex === -1) {
    return loseLife(state, "That cove is closed.");
  }

  if (state.occupiedHomes[homeIndex]) {
    return loseLife(state, "That cove is already full.");
  }

  const occupiedHomes = state.occupiedHomes.map((occupied, index) => (index === homeIndex ? true : occupied));
  const allHomesFilled = occupiedHomes.every(Boolean);
  const homeScore = state.score + 250 + Math.ceil(state.timer) * 5;

  if (allHomesFilled) {
    const nextLevel = state.level + 1;

    return {
      ...state,
      score: homeScore + 1000,
      level: nextLevel,
      timer: ROUND_SECONDS,
      player: createStartingPlayer(),
      occupiedHomes: Array.from({ length: HOME_COUNT }, () => false),
      entities: createLaneEntities(nextLevel),
      status: "roundWon",
      message: `Level ${nextLevel} is ready. The pond speeds up.`,
    };
  }

  return {
    ...state,
    score: homeScore,
    timer: ROUND_SECONDS,
    player: createStartingPlayer(),
    occupiedHomes,
    message: "Cove claimed. Find another.",
  };
}

function loseLife(state: GameState, reason: string): GameState {
  const lives = state.lives - 1;

  if (lives <= 0) {
    return {
      ...state,
      lives: 0,
      player: createStartingPlayer(),
      status: "gameOver",
      message: `${reason} Game over.`,
      lastDeathReason: reason,
    };
  }

  return {
    ...state,
    lives,
    timer: ROUND_SECONDS,
    player: createStartingPlayer(),
    message: reason,
    lastDeathReason: reason,
  };
}

export function getPlayerRect(player: Player): Rect {
  return {
    x: player.col * CELL_SIZE + PLAYER_MARGIN,
    y: player.row * CELL_SIZE + PLAYER_MARGIN,
    width: CELL_SIZE - PLAYER_MARGIN * 2,
    height: CELL_SIZE - PLAYER_MARGIN * 2,
  };
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function isPlayerOffBoard(player: Player): boolean {
  const rect = getPlayerRect(player);
  return rect.x + rect.width < 0 || rect.x > BOARD_WIDTH || rect.y < 0 || rect.y > BOARD_HEIGHT;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
