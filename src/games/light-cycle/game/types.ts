export type Direction = "up" | "down" | "left" | "right";

export type GamePhase = "ready" | "playing" | "paused" | "round-over";

export type PlayerId = "one" | "two";

export interface Position {
  x: number;
  y: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  position: Position;
  direction: Direction;
  pendingDirection: Direction;
  trail: Position[];
  alive: boolean;
  score: number;
  color: string;
}

export interface GameState {
  phase: GamePhase;
  players: Record<PlayerId, PlayerState>;
  winner: PlayerId | null;
  isDraw: boolean;
  round: number;
  message: string;
}

export interface InputState {
  lastKey: string | null;
}
