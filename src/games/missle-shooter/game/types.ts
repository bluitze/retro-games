export type GamePhase = "ready" | "playing" | "paused" | "waveClear" | "gameOver";

export type TargetKind = "city" | "base";

export interface Point {
  x: number;
  y: number;
}

export interface EnemyMissile {
  id: number;
  position: Point;
  start: Point;
  target: Point;
  targetKind: TargetKind;
  targetId: number;
  speed: number;
  trail: Point[];
}

export interface DefenseMissile {
  id: number;
  position: Point;
  start: Point;
  target: Point;
  speed: number;
  trail: Point[];
  baseId: number;
}

export interface Explosion {
  id: number;
  position: Point;
  radius: number;
  maxRadius: number;
  growRate: number;
  holdTime: number;
  fadeTime: number;
  age: number;
  owner: "player" | "enemy";
}

export interface City {
  id: number;
  slot: number;
  position: Point;
  width: number;
  destroyed: boolean;
}

export interface MissileBase {
  id: number;
  slot: number;
  position: Point;
  ammo: number;
  maxAmmo: number;
  destroyed: boolean;
}

export interface WaveSummary {
  cityBonus: number;
  ammoBonus: number;
  total: number;
}

export interface GameState {
  width: number;
  height: number;
  phase: GamePhase;
  wave: number;
  score: number;
  cities: City[];
  bases: MissileBase[];
  enemyMissiles: EnemyMissile[];
  defenseMissiles: DefenseMissile[];
  explosions: Explosion[];
  selectedBaseId: number | null;
  enemySpawned: number;
  enemiesThisWave: number;
  enemySpawnTimer: number;
  waveTimer: number;
  waveSummary: WaveSummary | null;
  message: string;
  screenShake: number;
  impactFlash: number;
  nextId: number;
}

export type InputCommand =
  | { type: "aim"; point: Point }
  | { type: "restart" }
  | { type: "pause" }
  | { type: "selectBase"; baseId: number };
