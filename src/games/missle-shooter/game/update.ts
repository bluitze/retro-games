import { BASE_SLOTS, CITY_SLOTS, TUNING } from "./constants";
import {
  distance,
  hasReachedTarget,
  missileInsideExplosion,
  moveToward,
} from "./collision";
import type {
  City,
  DefenseMissile,
  EnemyMissile,
  Explosion,
  GameState,
  InputCommand,
  MissileBase,
  Point,
  TargetKind,
} from "./types";

export function createInitialState(width: number, height: number): GameState {
  const state: GameState = {
    width,
    height,
    phase: "ready",
    wave: 1,
    score: 0,
    cities: createCities(width, height),
    bases: createBases(width, height),
    enemyMissiles: [],
    defenseMissiles: [],
    explosions: [],
    selectedBaseId: null,
    enemySpawned: 0,
    enemiesThisWave: 0,
    enemySpawnTimer: 0,
    waveTimer: 0,
    waveSummary: null,
    message: "Click or tap to begin",
    screenShake: 0,
    impactFlash: 0,
    nextId: 1,
  };

  return state;
}

export function resizeState(state: GameState, width: number, height: number): void {
  state.width = width;
  state.height = height;

  for (const city of state.cities) {
    city.position = groundPoint(width, height, city.slot);
    city.width = cityWidth(width);
  }

  for (const base of state.bases) {
    base.position = groundPoint(width, height, base.slot);
  }
}

export function handleCommand(state: GameState, command: InputCommand): void {
  if (command.type === "pause") {
    togglePause(state);
    return;
  }

  if (command.type === "selectBase") {
    const base = state.bases.find((candidate) => candidate.id === command.baseId);

    if (base && !base.destroyed && base.ammo > 0) {
      state.selectedBaseId = base.id;
    }

    return;
  }

  if (command.type === "aim") {
    if (state.phase === "ready") {
      beginWave(state);
    }

    if (state.phase === "playing") {
      launchDefenseMissile(state, command.point);
    }
  }
}

export function beginWave(state: GameState): void {
  state.phase = "playing";
  state.enemyMissiles = [];
  state.defenseMissiles = [];
  state.explosions = [];
  state.enemySpawned = 0;
  state.enemiesThisWave = enemiesForWave(state.wave);
  state.enemySpawnTimer = 0.65;
  state.waveSummary = null;
  state.message = "";

  for (const base of state.bases) {
    base.ammo = base.maxAmmo;
    base.destroyed = false;
  }
}

export function updateGame(state: GameState, deltaSeconds: number): void {
  const dt = Math.min(deltaSeconds, 0.05);

  state.screenShake = Math.max(0, state.screenShake - TUNING.shakeDecay * dt);
  state.impactFlash = Math.max(0, state.impactFlash - TUNING.flashDecay * dt);

  if (state.phase === "paused" || state.phase === "ready" || state.phase === "gameOver") {
    return;
  }

  if (state.phase === "waveClear") {
    updateExplosions(state, dt);
    state.waveTimer -= dt;

    if (state.waveTimer <= 0) {
      state.wave += 1;
      beginWave(state);
    }

    return;
  }

  updateSpawning(state, dt);
  updateDefenseMissiles(state, dt);
  updateEnemyMissiles(state, dt);
  updateExplosions(state, dt);
  resolveExplosionHits(state);
  checkEndConditions(state);
}

function togglePause(state: GameState): void {
  if (state.phase === "playing") {
    state.phase = "paused";
    state.message = "Paused";
    return;
  }

  if (state.phase === "paused") {
    state.phase = "playing";
    state.message = "";
  }
}

function updateSpawning(state: GameState, dt: number): void {
  if (state.enemySpawned >= state.enemiesThisWave) {
    return;
  }

  state.enemySpawnTimer -= dt;

  while (state.enemySpawnTimer <= 0 && state.enemySpawned < state.enemiesThisWave) {
    spawnEnemyMissile(state);
    state.enemySpawned += 1;
    state.enemySpawnTimer += spawnDelayForWave(state.wave);
  }
}

function updateDefenseMissiles(state: GameState, dt: number): void {
  const survivingMissiles: DefenseMissile[] = [];

  for (const missile of state.defenseMissiles) {
    addTrailPoint(missile.trail, missile.position);
    missile.position = moveToward(missile.position, missile.target, missile.speed * dt);

    if (hasReachedTarget(missile.position, missile.target)) {
      addExplosion(state, missile.target, "player");
    } else {
      survivingMissiles.push(missile);
    }
  }

  state.defenseMissiles = survivingMissiles;
}

function updateEnemyMissiles(state: GameState, dt: number): void {
  const survivingMissiles: EnemyMissile[] = [];

  for (const missile of state.enemyMissiles) {
    addTrailPoint(missile.trail, missile.position);
    missile.position = moveToward(missile.position, missile.target, missile.speed * dt);

    if (hasReachedTarget(missile.position, missile.target, 3)) {
      resolveEnemyImpact(state, missile);
    } else {
      survivingMissiles.push(missile);
    }
  }

  state.enemyMissiles = survivingMissiles;
}

function updateExplosions(state: GameState, dt: number): void {
  const activeExplosions: Explosion[] = [];

  for (const explosion of state.explosions) {
    explosion.age += dt;

    if (explosion.radius < explosion.maxRadius) {
      explosion.radius = Math.min(explosion.maxRadius, explosion.radius + explosion.growRate * dt);
    }

    if (explosion.age <= explosionDuration(explosion)) {
      activeExplosions.push(explosion);
    }
  }

  state.explosions = activeExplosions;
}

function resolveExplosionHits(state: GameState): void {
  const survivingMissiles: EnemyMissile[] = [];

  for (const missile of state.enemyMissiles) {
    const wasDestroyed = state.explosions.some((explosion) =>
      missileInsideExplosion(missile, explosion),
    );

    if (wasDestroyed) {
      state.score += TUNING.playerMissileScore;
      addExplosion(state, missile.position, "enemy", TUNING.explosionMaxRadius * 0.55);
    } else {
      survivingMissiles.push(missile);
    }
  }

  state.enemyMissiles = survivingMissiles;
}

function checkEndConditions(state: GameState): void {
  if (state.cities.every((city) => city.destroyed)) {
    state.phase = "gameOver";
    state.message = "All cities lost - press R to restart";
    state.enemyMissiles = [];
    state.defenseMissiles = [];
    return;
  }

  const waveIsComplete =
    state.enemySpawned >= state.enemiesThisWave &&
    state.enemyMissiles.length === 0 &&
    state.defenseMissiles.length === 0;

  if (waveIsComplete) {
    completeWave(state);
  }
}

function completeWave(state: GameState): void {
  const cityBonus = state.cities.filter((city) => !city.destroyed).length * TUNING.cityBonus;
  const ammoBonus = state.bases.reduce((total, base) => total + base.ammo, 0) * TUNING.ammoBonus;
  const total = cityBonus + ammoBonus;

  state.score += total;
  state.phase = "waveClear";
  state.waveTimer = TUNING.waveClearDelay;
  state.waveSummary = { cityBonus, ammoBonus, total };
  state.message = "Wave clear";
}

function launchDefenseMissile(state: GameState, target: Point): void {
  const base = chooseBase(state, target);

  if (!base) {
    state.message = "No ammo";
    return;
  }

  base.ammo -= 1;
  state.selectedBaseId = base.ammo > 0 ? base.id : null;
  state.message = "";

  state.defenseMissiles.push({
    id: nextId(state),
    position: { ...base.position },
    start: { ...base.position },
    target: clampTarget(target, state),
    speed: TUNING.defenseMissileSpeed,
    trail: [],
    baseId: base.id,
  });
}

function chooseBase(state: GameState, target: Point): MissileBase | null {
  const selectedBase = state.bases.find(
    (base) => base.id === state.selectedBaseId && !base.destroyed && base.ammo > 0,
  );

  if (selectedBase) {
    return selectedBase;
  }

  const availableBases = state.bases.filter((base) => !base.destroyed && base.ammo > 0);

  if (availableBases.length === 0) {
    return null;
  }

  return availableBases.reduce((nearest, base) =>
    distance(base.position, target) < distance(nearest.position, target) ? base : nearest,
  );
}

function spawnEnemyMissile(state: GameState): void {
  const target = chooseEnemyTarget(state);
  const start: Point = {
    x: randomBetween(28, state.width - 28),
    y: -12,
  };

  state.enemyMissiles.push({
    id: nextId(state),
    position: { ...start },
    start,
    target: { ...target.point },
    targetKind: target.kind,
    targetId: target.id,
    speed: enemySpeedForWave(state.wave),
    trail: [],
  });
}

function chooseEnemyTarget(state: GameState): { point: Point; kind: TargetKind; id: number } {
  const aliveCities = state.cities.filter((city) => !city.destroyed);
  const aliveBases = state.bases.filter((base) => !base.destroyed);
  const baseChance = aliveBases.length > 0 && Math.random() < 0.22;

  if (baseChance || aliveCities.length === 0) {
    const base = aliveBases[Math.floor(Math.random() * aliveBases.length)];
    return { point: base.position, kind: "base", id: base.id };
  }

  const city = aliveCities[Math.floor(Math.random() * aliveCities.length)];
  return { point: city.position, kind: "city", id: city.id };
}

function resolveEnemyImpact(state: GameState, missile: EnemyMissile): void {
  addExplosion(state, missile.target, "enemy", TUNING.enemyImpactRadius);
  state.screenShake = 1;
  state.impactFlash = 1;

  if (missile.targetKind === "city") {
    const city = state.cities.find((candidate) => candidate.id === missile.targetId);

    if (city) {
      city.destroyed = true;
    }
  } else {
    const base = state.bases.find((candidate) => candidate.id === missile.targetId);

    if (base) {
      base.destroyed = true;
      base.ammo = 0;
    }
  }
}

function addExplosion(
  state: GameState,
  position: Point,
  owner: Explosion["owner"],
  maxRadius: number = TUNING.explosionMaxRadius,
): void {
  state.explosions.push({
    id: nextId(state),
    position: { ...position },
    radius: 2,
    maxRadius,
    growRate: TUNING.explosionGrowRate,
    holdTime: TUNING.explosionHoldTime,
    fadeTime: TUNING.explosionFadeTime,
    age: 0,
    owner,
  });
}

function createCities(width: number, height: number): City[] {
  return CITY_SLOTS.map((slot, id) => ({
    id,
    slot,
    position: groundPoint(width, height, slot),
    width: cityWidth(width),
    destroyed: false,
  }));
}

function createBases(width: number, height: number): MissileBase[] {
  return BASE_SLOTS.map((slot, id) => ({
    id,
    slot,
    position: groundPoint(width, height, slot),
    ammo: TUNING.baseAmmo,
    maxAmmo: TUNING.baseAmmo,
    destroyed: false,
  }));
}

function groundPoint(width: number, height: number, slot: number): Point {
  return {
    x: width * slot,
    y: height - TUNING.groundInset,
  };
}

function cityWidth(width: number): number {
  return Math.max(32, Math.min(TUNING.cityWidth, width * 0.055));
}

function clampTarget(point: Point, state: GameState): Point {
  return {
    x: Math.max(0, Math.min(state.width, point.x)),
    y: Math.max(24, Math.min(state.height - TUNING.groundInset - 20, point.y)),
  };
}

function addTrailPoint(trail: Point[], point: Point): void {
  trail.push({ ...point });

  if (trail.length > TUNING.trailLimit) {
    trail.shift();
  }
}

function enemySpeedForWave(wave: number): number {
  return TUNING.enemyBaseSpeed + wave * TUNING.enemyWaveSpeedIncrease + randomBetween(0, 18);
}

function enemiesForWave(wave: number): number {
  return TUNING.enemyWaveCountBase + (wave - 1) * TUNING.enemyWaveCountIncrease;
}

function spawnDelayForWave(wave: number): number {
  return Math.max(
    TUNING.enemySpawnMinimumDelay,
    TUNING.enemySpawnBaseDelay - (wave - 1) * 0.09,
  );
}

function explosionDuration(explosion: Explosion): number {
  return explosion.maxRadius / explosion.growRate + explosion.holdTime + explosion.fadeTime;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function nextId(state: GameState): number {
  const id = state.nextId;
  state.nextId += 1;
  return id;
}
