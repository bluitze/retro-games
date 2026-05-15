export type GameStatus = "start" | "playing" | "paused" | "gameover";

export interface Vector {
  x: number;
  y: number;
}

export interface Ship {
  position: Vector;
  velocity: Vector;
  angle: number;
  radius: number;
  thrusting: boolean;
  invulnerableUntil: number;
}

export interface Bullet {
  id: number;
  position: Vector;
  velocity: Vector;
  radius: number;
  age: number;
  lifetime: number;
}

export type RockSize = 1 | 2 | 3;

export interface Rock {
  id: number;
  position: Vector;
  velocity: Vector;
  angle: number;
  angularVelocity: number;
  radius: number;
  size: RockSize;
  vertices: number[];
}

export interface Star {
  position: Vector;
  radius: number;
  alpha: number;
}

export interface GameState {
  width: number;
  height: number;
  status: GameStatus;
  score: number;
  lives: number;
  wave: number;
  ship: Ship;
  bullets: Bullet[];
  rocks: Rock[];
  stars: Star[];
  nextBulletId: number;
  nextRockId: number;
  lastShotAt: number;
}
