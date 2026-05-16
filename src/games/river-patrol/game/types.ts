export type GameStatus = "playing" | "paused" | "gameover";

export type EnemyKind = "boat" | "helicopter" | "jet" | "tank";

export type SoundEvent =
  | "shoot"
  | "explosion"
  | "fuel"
  | "lowFuel"
  | "bridge";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Player extends Rect {
  invulnerable: number;
}

export interface Shot extends Rect {
  id: number;
  velocityY: number;
}

export interface Enemy extends Rect {
  id: number;
  kind: EnemyKind;
  score: number;
  velocityY: number;
}

export interface FuelDepot extends Rect {
  id: number;
  amount: number;
}

export interface Bridge extends Rect {
  id: number;
  bonus: number;
}

export interface ExplosionParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface InputState {
  isDown: (codes: string | string[]) => boolean;
  consumePressed: (codes: string | string[]) => boolean;
  finishFrame: () => void;
  destroy: () => void;
}

export interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
  lives: number;
  sector: number;
  fuel: number;
  throttle: number;
  speed: number;
  worldY: number;
  distanceSinceBridge: number;
  spawnTimer: number;
  fuelTimer: number;
  lowFuelTimer: number;
  shotCooldown: number;
  nextId: number;
  seed: number;
  player: Player;
  shots: Shot[];
  enemies: Enemy[];
  fuelDepots: FuelDepot[];
  bridges: Bridge[];
  particles: ExplosionParticle[];
  message: string;
  messageTimer: number;
}

