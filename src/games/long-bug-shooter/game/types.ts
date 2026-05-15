export type GameMode = "start" | "playing" | "paused" | "levelClear" | "gameOver";

export type Vector = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Direction = -1 | 1;

export type HitResult = {
  destroyed: boolean;
  center: Vector;
};

export interface Hostile {
  rect: Rect;
  active: boolean;
}
