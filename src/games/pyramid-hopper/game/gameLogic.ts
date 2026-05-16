import {
  BASE_HAZARD_SPAWN_SECONDS,
  BASE_PEST_SPAWN_SECONDS,
  BOARD_ROWS,
  CHASER_DELAY_SECONDS,
  DISC_SECONDS,
  HOP_SECONDS,
  STARTING_LIVES,
} from "./constants";
import type { Disc, Entity, GameState, GridPosition, MoveDirection } from "./types";

const directionVectors: Record<MoveDirection, GridPosition> = {
  upLeft: { row: -1, col: -1 },
  upRight: { row: -1, col: 0 },
  downLeft: { row: 1, col: 0 },
  downRight: { row: 1, col: 1 },
};

const allDirections: MoveDirection[] = ["upLeft", "upRight", "downLeft", "downRight"];
const downwardDirections: MoveDirection[] = ["downLeft", "downRight"];

export function createInitialState(): GameState {
  return createLevelState({
    level: 1,
    score: 0,
    lives: STARTING_LIVES,
    status: "ready",
    message: "Flip every cube face while hazards roll through the pyramid.",
  });
}

export function startGame(state: GameState): GameState {
  if (state.status === "paused") {
    return { ...state, status: "playing", message: "Keep climbing." };
  }

  if (state.status === "roundWon") {
    return createLevelState({
      level: state.level + 1,
      score: state.score,
      lives: state.lives,
      status: "playing",
      message: "The pyramid shifts. Flip every cube again.",
    });
  }

  if (state.status === "gameOver") {
    return { ...createInitialState(), status: "playing", message: "Fresh run. Claim the pyramid." };
  }

  return { ...state, status: "playing", message: "Claim every cube face." };
}

export function restartGame(): GameState {
  return { ...createInitialState(), status: "playing", message: "Fresh run. Claim the pyramid." };
}

export function togglePause(state: GameState): GameState {
  if (state.status === "playing") {
    return { ...state, status: "paused", message: "Paused." };
  }

  if (state.status === "paused") {
    return { ...state, status: "playing", message: "Keep climbing." };
  }

  return state;
}

export function handlePlayerMove(state: GameState, direction: MoveDirection): GameState {
  if (state.status !== "playing" || state.hop || state.discRide) {
    return state;
  }

  const target = getMoveTarget(state.player, direction);

  if (isValidPosition(target)) {
    const movedState: GameState = {
      ...state,
      player: target,
      hop: {
        from: state.player,
        to: target,
        elapsed: 0,
        duration: HOP_SECONDS,
      },
    };

    return resolveLanding(touchCube(movedState, target), target);
  }

  const disc = findDiscForMove(state.player, direction, state.discs);

  if (disc) {
    const removedChaser = state.entities.some(
      (entity) => entity.kind === "chaser" && gridDistance(entity.position, state.player) <= 1,
    );

    return {
      ...state,
      score: state.score + (removedChaser ? 500 : 0),
      discs: state.discs.map((current) => (current.id === disc.id ? { ...current, used: true } : current)),
      entities: removedChaser ? state.entities.filter((entity) => entity.kind !== "chaser") : state.entities,
      discRide: {
        discId: disc.id,
        side: disc.side,
        from: state.player,
        elapsed: 0,
        duration: DISC_SECONDS,
        removedChaser,
      },
      message: removedChaser ? "Escape disc cleared a close pursuer." : "Escape disc to the peak.",
    };
  }

  return loseLife(state, "That jump missed the pyramid.");
}

export function updateGame(state: GameState, deltaSeconds: number): GameState {
  const animated = advanceAnimation(state, deltaSeconds);

  if (animated.status !== "playing" || animated.hop || animated.discRide) {
    return animated;
  }

  let next = spawnEntities(animated, deltaSeconds);
  next = moveEntities(next, deltaSeconds);
  next = resolvePlayerContacts(next);

  return next;
}

export function getTileIndex(position: GridPosition): number {
  return (position.row * (position.row + 1)) / 2 + position.col;
}

export function isValidPosition(position: GridPosition): boolean {
  return position.row >= 0 && position.row < BOARD_ROWS && position.col >= 0 && position.col <= position.row;
}

export function getMoveTarget(position: GridPosition, direction: MoveDirection): GridPosition {
  const vector = directionVectors[direction];
  return {
    row: position.row + vector.row,
    col: position.col + vector.col,
  };
}

function createLevelState({
  level,
  score,
  lives,
  status,
  message,
}: {
  level: number;
  score: number;
  lives: number;
  status: GameState["status"];
  message: string;
}): GameState {
  const requiredHits = level >= 3 ? 2 : 1;

  return {
    status,
    score,
    lives,
    level,
    requiredHits,
    tiles: Array.from({ length: getTileIndex({ row: BOARD_ROWS - 1, col: BOARD_ROWS - 1 }) + 1 }, () => 0),
    player: { row: 0, col: 0 },
    discs: createDiscs(),
    entities: [],
    nextEntityId: 1,
    hazardSpawnTimer: Math.max(0.85, BASE_HAZARD_SPAWN_SECONDS - level * 0.08),
    pestSpawnTimer: BASE_PEST_SPAWN_SECONDS,
    chaserSpawnTimer: Math.max(3.5, CHASER_DELAY_SECONDS - level * 0.35),
    message,
  };
}

function createDiscs(): Disc[] {
  return [
    {
      id: "left-ledge",
      side: "left",
      anchor: { row: 3, col: 0 },
      entryDirection: "upLeft",
      used: false,
    },
    {
      id: "right-ledge",
      side: "right",
      anchor: { row: 4, col: 4 },
      entryDirection: "upRight",
      used: false,
    },
  ];
}

function advanceAnimation(state: GameState, deltaSeconds: number): GameState {
  let next = state;

  if (state.hop) {
    const hop = { ...state.hop, elapsed: state.hop.elapsed + deltaSeconds };
    next = hop.elapsed >= hop.duration ? { ...state, hop: undefined } : { ...state, hop };
  }

  if (next.discRide) {
    const ride = { ...next.discRide, elapsed: next.discRide.elapsed + deltaSeconds };

    if (ride.elapsed >= ride.duration) {
      next = {
        ...next,
        player: { row: 0, col: 0 },
        discRide: undefined,
        message: ride.removedChaser ? "Back at the peak with a bonus." : "Back at the peak.",
      };
      return resolveLanding(touchCube(next, next.player), next.player);
    }

    next = { ...next, discRide: ride };
  }

  return next;
}

function spawnEntities(state: GameState, deltaSeconds: number): GameState {
  let hazardSpawnTimer = state.hazardSpawnTimer - deltaSeconds;
  let pestSpawnTimer = state.pestSpawnTimer - deltaSeconds;
  let chaserSpawnTimer = state.chaserSpawnTimer - deltaSeconds;
  let nextEntityId = state.nextEntityId;
  const entities = [...state.entities];
  const levelPressure = Math.min(0.45, state.level * 0.035);

  if (hazardSpawnTimer <= 0 && entities.filter((entity) => entity.kind === "hazard").length < 5) {
    entities.push({
      id: nextEntityId,
      kind: "hazard",
      position: { row: 0, col: 0 },
      moveTimer: 0.28,
      moveEvery: Math.max(0.38, 0.74 - levelPressure),
    });
    nextEntityId += 1;
    hazardSpawnTimer = Math.max(0.78, BASE_HAZARD_SPAWN_SECONDS - state.level * 0.1);
  }

  if (pestSpawnTimer <= 0 && entities.filter((entity) => entity.kind === "pest").length < 2) {
    entities.push({
      id: nextEntityId,
      kind: "pest",
      position: { row: 0, col: 0 },
      moveTimer: 0.46,
      moveEvery: Math.max(0.56, 1.08 - levelPressure),
    });
    nextEntityId += 1;
    pestSpawnTimer = Math.max(4.2, BASE_PEST_SPAWN_SECONDS - state.level * 0.2);
  }

  if (!entities.some((entity) => entity.kind === "chaser")) {
    if (chaserSpawnTimer <= 0) {
      entities.push({
        id: nextEntityId,
        kind: "chaser",
        position: { row: 0, col: 0 },
        moveTimer: 0.78,
        moveEvery: Math.max(0.44, 0.88 - state.level * 0.04),
      });
      nextEntityId += 1;
      chaserSpawnTimer = CHASER_DELAY_SECONDS;
    }
  } else {
    chaserSpawnTimer = Math.max(1, chaserSpawnTimer);
  }

  return {
    ...state,
    entities,
    nextEntityId,
    hazardSpawnTimer,
    pestSpawnTimer,
    chaserSpawnTimer,
  };
}

function moveEntities(state: GameState, deltaSeconds: number): GameState {
  let tiles = state.tiles;
  const entities: Entity[] = [];

  state.entities.forEach((entity) => {
    let current = { ...entity, moveTimer: entity.moveTimer - deltaSeconds };

    while (current.moveTimer <= 0) {
      const nextPosition = getNextEntityPosition(current, state.player);

      if (!nextPosition) {
        return;
      }

      current = {
        ...current,
        position: nextPosition,
        moveTimer: current.moveTimer + current.moveEvery,
      };

      if (current.kind === "pest") {
        const index = getTileIndex(current.position);
        if (tiles[index] > 0) {
          tiles = tiles.map((value, tileIndex) => (tileIndex === index ? Math.max(0, value - 1) : value));
        }
      }
    }

    entities.push(current);
  });

  return { ...state, tiles, entities };
}

function getNextEntityPosition(entity: Entity, player: GridPosition): GridPosition | null {
  if (entity.kind === "chaser") {
    const candidates = allDirections
      .map((direction) => getMoveTarget(entity.position, direction))
      .filter(isValidPosition)
      .sort((a, b) => gridDistance(a, player) - gridDistance(b, player));

    return candidates[0] ?? null;
  }

  const preferred = downwardDirections[Math.floor(Math.random() * downwardDirections.length)];
  const alternate = preferred === "downLeft" ? "downRight" : "downLeft";
  const preferredTarget = getMoveTarget(entity.position, preferred);

  if (isValidPosition(preferredTarget)) {
    return preferredTarget;
  }

  const alternateTarget = getMoveTarget(entity.position, alternate);
  return isValidPosition(alternateTarget) ? alternateTarget : null;
}

function touchCube(state: GameState, position: GridPosition): GameState {
  const index = getTileIndex(position);
  const current = state.tiles[index];

  if (current >= state.requiredHits) {
    return { ...state, score: state.score + 5 };
  }

  const tiles = state.tiles.map((value, tileIndex) =>
    tileIndex === index ? Math.min(state.requiredHits, value + 1) : value,
  );

  return {
    ...state,
    tiles,
    score: state.score + 25 + state.level * 5,
    message: "Cube flipped.",
  };
}

function resolveLanding(state: GameState, position: GridPosition): GameState {
  const harmfulContact = state.entities.some(
    (entity) => entity.kind !== "pest" && samePosition(entity.position, position),
  );

  if (harmfulContact) {
    return loseLife(state, "A hazard caught the hopper.");
  }

  const pestContact = state.entities.find((entity) => entity.kind === "pest" && samePosition(entity.position, position));

  if (pestContact) {
    return checkRoundClear({
      ...state,
      score: state.score + 150,
      entities: state.entities.filter((entity) => entity.id !== pestContact.id),
      message: "Pest tagged for a bonus.",
    });
  }

  return checkRoundClear(state);
}

function resolvePlayerContacts(state: GameState): GameState {
  return resolveLanding(state, state.player);
}

function checkRoundClear(state: GameState): GameState {
  if (!state.tiles.every((value) => value >= state.requiredHits)) {
    return state;
  }

  return {
    ...state,
    status: "roundWon",
    score: state.score + 900 + state.level * 250 + state.lives * 150,
    hop: undefined,
    discRide: undefined,
    entities: [],
    message: `Level ${state.level} cleared. Press Start for the next pyramid.`,
  };
}

function loseLife(state: GameState, reason: string): GameState {
  const lives = state.lives - 1;

  if (lives <= 0) {
    return {
      ...state,
      lives: 0,
      player: { row: 0, col: 0 },
      hop: undefined,
      discRide: undefined,
      entities: [],
      status: "gameOver",
      message: `${reason} Game over.`,
    };
  }

  return {
    ...state,
    lives,
    player: { row: 0, col: 0 },
    hop: undefined,
    discRide: undefined,
    entities: [],
    hazardSpawnTimer: Math.max(0.85, BASE_HAZARD_SPAWN_SECONDS - state.level * 0.08),
    pestSpawnTimer: BASE_PEST_SPAWN_SECONDS,
    chaserSpawnTimer: Math.max(3.5, CHASER_DELAY_SECONDS - state.level * 0.35),
    message: reason,
  };
}

function findDiscForMove(position: GridPosition, direction: MoveDirection, discs: Disc[]): Disc | undefined {
  return discs.find(
    (disc) =>
      !disc.used &&
      disc.entryDirection === direction &&
      disc.anchor.row === position.row &&
      disc.anchor.col === position.col,
  );
}

function samePosition(a: GridPosition, b: GridPosition): boolean {
  return a.row === b.row && a.col === b.col;
}

function gridDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}
