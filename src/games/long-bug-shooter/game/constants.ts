export const CANVAS = {
  width: 960,
  height: 720,
};

export const HUD = {
  height: 52,
};

export const PLAYFIELD = {
  left: 24,
  right: CANVAS.width - 24,
  top: HUD.height + 18,
  bottom: CANVAS.height - 24,
  playerZoneTop: CANVAS.height - 188,
};

export const PLAYER = {
  width: 28,
  height: 30,
  speed: 340,
  maxBullets: 3,
  fireCooldown: 0.17,
  invulnerableSeconds: 1.7,
  startLives: 3,
};

export const BULLET = {
  width: 5,
  height: 16,
  speed: 590,
  obstacleDamage: 1,
};

export const BUG = {
  segmentSize: 22,
  segmentGap: 3,
  rowHeight: 28,
  baseSpeed: 78,
  speedPerLevel: 12,
  baseSegments: 12,
  maxSegments: 18,
  descendOnBlock: 28,
};

export const MUSHROOM = {
  width: 24,
  height: 24,
  health: 3,
  baseCount: 42,
  countPerLevel: 5,
};

export const ENEMIES = {
  runnerWidth: 34,
  runnerHeight: 20,
  runnerBaseSpeed: 250,
  dropperSize: 26,
  dropperBaseSpeed: 88,
};

export const SCORING = {
  bugSegment: 15,
  obstacle: 3,
  runner: 80,
  dropper: 120,
  levelClear: 250,
};
