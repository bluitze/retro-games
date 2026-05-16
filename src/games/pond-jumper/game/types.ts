export type GameStatus = "ready" | "playing" | "paused" | "roundWon" | "gameOver";

export type LaneKind = "home" | "water" | "safe" | "road";

export type Direction = -1 | 1;

export type MoveDirection = "up" | "down" | "left" | "right";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LaneConfig {
  row: number;
  kind: LaneKind;
  speed: number;
  direction: Direction;
  entityWidth: number;
  gap: number;
  color: string;
}

export interface LaneEntity extends Rect {
  laneRow: number;
  kind: "vehicle" | "platform";
  color: string;
  speed: number;
  direction: Direction;
}

export interface Player {
  col: number;
  row: number;
  rideOffset: number;
}

export interface GameState {
  score: number;
  lives: number;
  level: number;
  timer: number;
  player: Player;
  occupiedHomes: boolean[];
  entities: LaneEntity[];
  status: GameStatus;
  message: string;
  lastDeathReason?: string;
}
