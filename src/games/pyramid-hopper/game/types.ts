export type GameStatus = "ready" | "playing" | "paused" | "roundWon" | "gameOver";

export type MoveDirection = "upLeft" | "upRight" | "downLeft" | "downRight";

export type EntityKind = "hazard" | "pest" | "chaser";

export type DiscSide = "left" | "right";

export interface GridPosition {
  row: number;
  col: number;
}

export interface HopAnimation {
  from: GridPosition;
  to: GridPosition;
  elapsed: number;
  duration: number;
}

export interface Disc {
  id: string;
  side: DiscSide;
  anchor: GridPosition;
  entryDirection: MoveDirection;
  used: boolean;
}

export interface DiscRide {
  discId: string;
  side: DiscSide;
  from: GridPosition;
  elapsed: number;
  duration: number;
  removedChaser: boolean;
}

export interface Entity {
  id: number;
  kind: EntityKind;
  position: GridPosition;
  moveTimer: number;
  moveEvery: number;
}

export interface GameState {
  status: GameStatus;
  score: number;
  lives: number;
  level: number;
  requiredHits: number;
  tiles: number[];
  player: GridPosition;
  hop?: HopAnimation;
  discRide?: DiscRide;
  discs: Disc[];
  entities: Entity[];
  nextEntityId: number;
  hazardSpawnTimer: number;
  pestSpawnTimer: number;
  chaserSpawnTimer: number;
  message: string;
}
