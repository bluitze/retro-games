import { useEffect, useRef, useState } from "react";

type Phase = "playing" | "wave-clear" | "game-over";
type ProjectileOwner = "player" | "enemy";

type Enemy = {
  x: number;
  y: number;
  row: number;
  col: number;
  kind: number;
  alive: boolean;
};

type Projectile = {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  owner: ProjectileOwner;
};

type ShieldBlock = {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
};

type BonusTarget = {
  active: boolean;
  x: number;
  y: number;
  direction: number;
  timer: number;
};

type InputState = {
  left: boolean;
  right: boolean;
  fireQueued: boolean;
  restartQueued: boolean;
};

type GameState = {
  width: number;
  height: number;
  phase: Phase;
  score: number;
  lives: number;
  wave: number;
  playerX: number;
  playerCooldown: number;
  playerInvulnerable: number;
  enemyDirection: number;
  enemyFireTimer: number;
  waveClearTimer: number;
  rngSeed: number;
  enemies: Enemy[];
  playerShots: Projectile[];
  enemyShots: Projectile[];
  shields: ShieldBlock[];
  bonus: BonusTarget;
};

const PLAYER_WIDTH = 58;
const PLAYER_HEIGHT = 24;
const PLAYER_SPEED = 420;
const PLAYER_SHOT_SPEED = 560;
const ENEMY_SHOT_SPEED = 250;
const MAX_PLAYER_SHOTS = 2;
const ENEMY_WIDTH = 34;
const ENEMY_HEIGHT = 24;
const ENEMY_COLUMNS = 10;
const ENEMY_ROWS = 5;
const ENEMY_GAP_X = 26;
const ENEMY_GAP_Y = 22;

function createInput(): InputState {
  return {
    left: false,
    right: false,
    fireQueued: false,
    restartQueued: false,
  };
}

function createGame(width: number, height: number): GameState {
  const game: GameState = {
    width,
    height,
    phase: "playing",
    score: 0,
    lives: 3,
    wave: 1,
    playerX: width / 2,
    playerCooldown: 0,
    playerInvulnerable: 0,
    enemyDirection: 1,
    enemyFireTimer: 1.1,
    waveClearTimer: 0,
    rngSeed: 0x5f3759df,
    enemies: [],
    playerShots: [],
    enemyShots: [],
    shields: [],
    bonus: {
      active: false,
      x: -80,
      y: 46,
      direction: 1,
      timer: 7,
    },
  };

  startWave(game, 1);
  return game;
}

function startWave(game: GameState, wave: number): void {
  game.phase = "playing";
  game.wave = wave;
  game.playerX = game.width / 2;
  game.playerCooldown = 0;
  game.playerInvulnerable = wave === 1 ? 0 : 1.2;
  game.enemyDirection = 1;
  game.enemyFireTimer = Math.max(0.45, 1.2 - wave * 0.08);
  game.waveClearTimer = 0;
  game.playerShots = [];
  game.enemyShots = [];
  game.enemies = createEnemies(game.width, wave);
  game.shields = createShields(game.width, game.height);
  game.bonus = {
    active: false,
    x: -90,
    y: Math.max(36, game.height * 0.08),
    direction: 1,
    timer: Math.max(4, 8 - wave * 0.4),
  };
}

function createEnemies(width: number, wave: number): Enemy[] {
  const formationWidth = ENEMY_COLUMNS * ENEMY_WIDTH + (ENEMY_COLUMNS - 1) * ENEMY_GAP_X;
  const startX = Math.max(36, (width - formationWidth) / 2);
  const startY = 86 + Math.min(30, wave * 4);
  const enemies: Enemy[] = [];

  for (let row = 0; row < ENEMY_ROWS; row += 1) {
    for (let col = 0; col < ENEMY_COLUMNS; col += 1) {
      enemies.push({
        x: startX + col * (ENEMY_WIDTH + ENEMY_GAP_X),
        y: startY + row * (ENEMY_HEIGHT + ENEMY_GAP_Y),
        row,
        col,
        kind: row % 3,
        alive: true,
      });
    }
  }

  return enemies;
}

function createShields(width: number, height: number): ShieldBlock[] {
  const blocks: ShieldBlock[] = [];
  const bunkerCount = 4;
  const blockWidth = 16;
  const blockHeight = 12;
  const columns = 7;
  const rows = 4;
  const bunkerWidth = columns * blockWidth;
  const spacing = width / (bunkerCount + 1);
  const top = height - 186;

  for (let bunker = 0; bunker < bunkerCount; bunker += 1) {
    const left = spacing * (bunker + 1) - bunkerWidth / 2;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const isTopCorner = row === 0 && (col === 0 || col === columns - 1);
        const isLowerGap = row >= 2 && col >= 2 && col <= 4;

        if (isTopCorner || isLowerGap) {
          continue;
        }

        blocks.push({
          x: left + col * blockWidth,
          y: top + row * blockHeight,
          width: blockWidth - 2,
          height: blockHeight - 2,
          hp: 3,
        });
      }
    }
  }

  return blocks;
}

function resizeGame(game: GameState, width: number, height: number): void {
  const oldWidth = game.width;
  const oldHeight = game.height;
  const xScale = width / oldWidth;
  const yScale = height / oldHeight;

  game.width = width;
  game.height = height;
  game.playerX *= xScale;

  for (const enemy of game.enemies) {
    enemy.x *= xScale;
    enemy.y *= yScale;
  }

  for (const shot of [...game.playerShots, ...game.enemyShots]) {
    shot.x *= xScale;
    shot.y *= yScale;
  }

  if (game.bonus.active) {
    game.bonus.x *= xScale;
    game.bonus.y *= yScale;
  } else {
    game.bonus.y = Math.max(36, height * 0.08);
  }

  game.shields = createShields(width, height);
  game.playerX = clamp(game.playerX, PLAYER_WIDTH / 2 + 12, width - PLAYER_WIDTH / 2 - 12);
}

function updateGame(game: GameState, input: InputState, deltaSeconds: number): void {
  if (input.restartQueued) {
    input.restartQueued = false;

    if (game.phase === "game-over") {
      const freshGame = createGame(game.width, game.height);
      Object.assign(game, freshGame);
      return;
    }
  }

  if (game.phase === "wave-clear") {
    game.waveClearTimer -= deltaSeconds;

    if (game.waveClearTimer <= 0) {
      startWave(game, game.wave + 1);
    }

    return;
  }

  if (game.phase === "game-over") {
    input.fireQueued = false;
    return;
  }

  updatePlayer(game, input, deltaSeconds);
  updateEnemies(game, deltaSeconds);
  updateProjectiles(game, deltaSeconds);
  updateBonusTarget(game, deltaSeconds);
  resolveCollisions(game);

  if (game.enemies.every((enemy) => !enemy.alive)) {
    game.score += game.wave * 100;
    game.phase = "wave-clear";
    game.waveClearTimer = 1.55;
    game.playerShots = [];
    game.enemyShots = [];
  }
}

function updatePlayer(game: GameState, input: InputState, deltaSeconds: number): void {
  const direction = Number(input.right) - Number(input.left);
  game.playerX = clamp(
    game.playerX + direction * PLAYER_SPEED * deltaSeconds,
    PLAYER_WIDTH / 2 + 12,
    game.width - PLAYER_WIDTH / 2 - 12,
  );
  game.playerCooldown = Math.max(0, game.playerCooldown - deltaSeconds);
  game.playerInvulnerable = Math.max(0, game.playerInvulnerable - deltaSeconds);

  if (input.fireQueued && game.playerCooldown <= 0 && game.playerShots.length < MAX_PLAYER_SHOTS) {
    const playerY = getPlayerY(game);
    game.playerShots.push({
      x: game.playerX - 3,
      y: playerY - PLAYER_HEIGHT - 12,
      width: 6,
      height: 18,
      velocityY: -PLAYER_SHOT_SPEED,
      owner: "player",
    });
    game.playerCooldown = 0.22;
  }

  input.fireQueued = false;
}

function updateEnemies(game: GameState, deltaSeconds: number): void {
  const aliveEnemies = game.enemies.filter((enemy) => enemy.alive);

  if (aliveEnemies.length === 0) {
    return;
  }

  const defeated = ENEMY_COLUMNS * ENEMY_ROWS - aliveEnemies.length;
  const speed = 24 + game.wave * 8 + defeated * 2.8;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const enemy of aliveEnemies) {
    left = Math.min(left, enemy.x);
    right = Math.max(right, enemy.x + ENEMY_WIDTH);
    bottom = Math.max(bottom, enemy.y + ENEMY_HEIGHT);
  }

  const nextLeft = left + game.enemyDirection * speed * deltaSeconds;
  const nextRight = right + game.enemyDirection * speed * deltaSeconds;
  let descend = false;

  if (nextLeft <= 18 || nextRight >= game.width - 18) {
    game.enemyDirection *= -1;
    descend = true;
  }

  for (const enemy of aliveEnemies) {
    enemy.x += game.enemyDirection * speed * deltaSeconds;

    if (descend) {
      enemy.y += 18 + Math.min(12, game.wave * 2);
    }
  }

  if (bottom >= getPlayerY(game) - 34) {
    game.phase = "game-over";
  }

  game.enemyFireTimer -= deltaSeconds;

  if (game.enemyFireTimer <= 0) {
    fireEnemyShot(game, aliveEnemies);
    const pressure = 1 - aliveEnemies.length / (ENEMY_COLUMNS * ENEMY_ROWS);
    game.enemyFireTimer = 0.35 + random(game) * Math.max(0.35, 1.15 - game.wave * 0.05 - pressure * 0.4);
  }
}

function fireEnemyShot(game: GameState, aliveEnemies: Enemy[]): void {
  const columns = new Map<number, Enemy>();

  for (const enemy of aliveEnemies) {
    const current = columns.get(enemy.col);

    if (!current || enemy.y > current.y) {
      columns.set(enemy.col, enemy);
    }
  }

  const shooters = Array.from(columns.values());
  const targetBias = Math.min(0.72, 0.35 + game.wave * 0.05);
  const shooter =
    random(game) < targetBias
      ? shooters.reduce((closest, enemy) =>
          Math.abs(enemy.x + ENEMY_WIDTH / 2 - game.playerX) <
          Math.abs(closest.x + ENEMY_WIDTH / 2 - game.playerX)
            ? enemy
            : closest,
        )
      : shooters[Math.floor(random(game) * shooters.length)];

  if (!shooter) {
    return;
  }

  game.enemyShots.push({
    x: shooter.x + ENEMY_WIDTH / 2 - 4,
    y: shooter.y + ENEMY_HEIGHT + 6,
    width: 8,
    height: 16,
    velocityY: ENEMY_SHOT_SPEED + game.wave * 18,
    owner: "enemy",
  });
}

function updateProjectiles(game: GameState, deltaSeconds: number): void {
  for (const shot of [...game.playerShots, ...game.enemyShots]) {
    shot.y += shot.velocityY * deltaSeconds;
  }

  game.playerShots = game.playerShots.filter((shot) => shot.y + shot.height > -20);
  game.enemyShots = game.enemyShots.filter((shot) => shot.y < game.height + 24);
}

function updateBonusTarget(game: GameState, deltaSeconds: number): void {
  const bonus = game.bonus;

  if (!bonus.active) {
    bonus.timer -= deltaSeconds;

    if (bonus.timer <= 0) {
      bonus.active = true;
      bonus.direction = random(game) > 0.5 ? 1 : -1;
      bonus.x = bonus.direction > 0 ? -80 : game.width + 80;
      bonus.y = Math.max(34, game.height * 0.075);
    }

    return;
  }

  bonus.x += bonus.direction * (120 + game.wave * 12) * deltaSeconds;

  if ((bonus.direction > 0 && bonus.x > game.width + 90) || (bonus.direction < 0 && bonus.x < -90)) {
    bonus.active = false;
    bonus.timer = 6 + random(game) * 6;
  }
}

function resolveCollisions(game: GameState): void {
  for (const shot of [...game.playerShots, ...game.enemyShots]) {
    const block = game.shields.find((shield) => intersects(shot, shield));

    if (block) {
      block.hp -= 1;
      removeProjectile(game, shot);
    }
  }

  game.shields = game.shields.filter((block) => block.hp > 0);

  for (const shot of [...game.playerShots]) {
    const enemy = game.enemies.find(
      (candidate) => candidate.alive && intersects(shot, getEnemyBounds(candidate)),
    );

    if (enemy) {
      enemy.alive = false;
      game.score += (ENEMY_ROWS - enemy.row) * 20 + game.wave * 5;
      removeProjectile(game, shot);
      continue;
    }

    if (game.bonus.active && intersects(shot, getBonusBounds(game.bonus))) {
      game.bonus.active = false;
      game.bonus.timer = 7 + random(game) * 6;
      game.score += 150 + game.wave * 50;
      removeProjectile(game, shot);
    }
  }

  if (game.playerInvulnerable <= 0) {
    const playerBounds = getPlayerBounds(game);
    const playerHit = game.enemyShots.find((shot) => intersects(shot, playerBounds));

    if (playerHit) {
      removeProjectile(game, playerHit);
      game.lives -= 1;
      game.enemyShots = [];
      game.playerShots = [];

      if (game.lives <= 0) {
        game.phase = "game-over";
      } else {
        game.playerInvulnerable = 1.4;
        game.playerX = game.width / 2;
      }
    }
  }
}

function renderGame(context: CanvasRenderingContext2D, game: GameState, time: number): void {
  context.clearRect(0, 0, game.width, game.height);
  drawBackground(context, game, time);
  drawHud(context, game);
  drawBonusTarget(context, game.bonus);
  drawShields(context, game.shields);
  drawEnemies(context, game.enemies, time);
  drawProjectiles(context, game.playerShots, game.enemyShots, time);
  drawPlayer(context, game, time);

  if (game.phase === "wave-clear") {
    drawCenterMessage(context, game, "WAVE CLEARED", `Wave ${game.wave + 1} incoming`);
  } else if (game.phase === "game-over") {
    drawCenterMessage(context, game, "BASE OVERRUN", "Press Enter or restart");
  }
}

function drawBackground(context: CanvasRenderingContext2D, game: GameState, time: number): void {
  const gradient = context.createLinearGradient(0, 0, 0, game.height);
  gradient.addColorStop(0, "#06101a");
  gradient.addColorStop(0.55, "#070912");
  gradient.addColorStop(1, "#10150f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, game.width, game.height);

  context.save();
  context.globalAlpha = 0.35;
  context.fillStyle = "#c9f7ff";

  for (let i = 0; i < 72; i += 1) {
    const x = (i * 137.5) % game.width;
    const y = (i * 61 + time * (8 + (i % 4) * 4)) % game.height;
    const size = i % 9 === 0 ? 2 : 1;
    context.fillRect(x, y, size, size);
  }

  context.globalAlpha = 0.09;
  context.fillStyle = "#7df57a";

  for (let y = 0; y < game.height; y += 4) {
    context.fillRect(0, y, game.width, 1);
  }

  context.restore();
}

function drawHud(context: CanvasRenderingContext2D, game: GameState): void {
  context.save();
  context.font = "700 18px 'Courier New', monospace";
  context.fillStyle = "#dbf8ff";
  context.textBaseline = "top";
  context.fillText(`SCORE ${String(game.score).padStart(5, "0")}`, 20, 18);
  context.textAlign = "center";
  context.fillText(`WAVE ${game.wave}`, game.width / 2, 18);
  context.textAlign = "right";
  context.fillText(`LIVES ${game.lives}`, game.width - 20, 18);
  context.fillStyle = "rgba(125, 245, 122, 0.32)";
  context.fillRect(18, game.height - 64, game.width - 36, 2);
  context.restore();
}

function drawPlayer(context: CanvasRenderingContext2D, game: GameState, time: number): void {
  const y = getPlayerY(game);
  const flicker = game.playerInvulnerable > 0 && Math.floor(time * 16) % 2 === 0;

  if (flicker) {
    return;
  }

  context.save();
  context.translate(game.playerX, y);
  context.shadowColor = "#67e8f9";
  context.shadowBlur = 16;
  context.fillStyle = "#67e8f9";
  context.fillRect(-PLAYER_WIDTH / 2, -12, PLAYER_WIDTH, 14);
  context.fillRect(-18, -22, 36, 12);
  context.fillRect(-5, -34, 10, 18);
  context.fillStyle = "#f8d66d";
  context.fillRect(-PLAYER_WIDTH / 2 + 7, 3, PLAYER_WIDTH - 14, 5);
  context.restore();
}

function drawEnemies(context: CanvasRenderingContext2D, enemies: Enemy[], time: number): void {
  for (const enemy of enemies) {
    if (!enemy.alive) {
      continue;
    }

    context.save();
    context.translate(enemy.x + ENEMY_WIDTH / 2, enemy.y + ENEMY_HEIGHT / 2);
    context.shadowBlur = 10;

    if (enemy.kind === 0) {
      context.shadowColor = "#ff6f91";
      context.fillStyle = "#ff6f91";
      context.beginPath();
      context.moveTo(0, -14);
      context.lineTo(17, 0);
      context.lineTo(0, 14);
      context.lineTo(-17, 0);
      context.closePath();
      context.fill();
      context.fillStyle = "#ffe3ea";
      context.fillRect(-5, -3, 10, 6);
    } else if (enemy.kind === 1) {
      context.shadowColor = "#f8d66d";
      context.fillStyle = "#f8d66d";
      context.fillRect(-15, -8, 30, 16);
      context.fillRect(-23, -2 + Math.sin(time * 8 + enemy.col) * 2, 8, 6);
      context.fillRect(15, -2 + Math.cos(time * 8 + enemy.row) * 2, 8, 6);
      context.fillStyle = "#3b2d09";
      context.fillRect(-8, -3, 4, 5);
      context.fillRect(4, -3, 4, 5);
    } else {
      context.shadowColor = "#7df57a";
      context.fillStyle = "#7df57a";
      context.beginPath();
      context.ellipse(0, 0, 17, 10, 0, 0, Math.PI * 2);
      context.fill();
      context.fillRect(-21, 4, 8, 6);
      context.fillRect(13, 4, 8, 6);
      context.fillStyle = "#08240b";
      context.fillRect(-7, -3, 4, 4);
      context.fillRect(3, -3, 4, 4);
    }

    context.restore();
  }
}

function drawProjectiles(
  context: CanvasRenderingContext2D,
  playerShots: Projectile[],
  enemyShots: Projectile[],
  time: number,
): void {
  context.save();
  context.shadowBlur = 14;

  for (const shot of playerShots) {
    context.shadowColor = "#67e8f9";
    context.fillStyle = "#67e8f9";
    context.fillRect(shot.x, shot.y, shot.width, shot.height);
    context.fillStyle = "#ffffff";
    context.fillRect(shot.x + 2, shot.y + 2, 2, shot.height - 4);
  }

  for (const shot of enemyShots) {
    context.shadowColor = "#ff6f91";
    context.fillStyle = Math.floor(time * 12) % 2 === 0 ? "#ff6f91" : "#f8d66d";
    context.beginPath();
    context.moveTo(shot.x + shot.width / 2, shot.y);
    context.lineTo(shot.x + shot.width, shot.y + shot.height / 2);
    context.lineTo(shot.x + shot.width / 2, shot.y + shot.height);
    context.lineTo(shot.x, shot.y + shot.height / 2);
    context.closePath();
    context.fill();
  }

  context.restore();
}

function drawShields(context: CanvasRenderingContext2D, shields: ShieldBlock[]): void {
  context.save();

  for (const block of shields) {
    context.fillStyle = block.hp === 3 ? "#7df57a" : block.hp === 2 ? "#f8d66d" : "#ff6f91";
    context.shadowColor = context.fillStyle;
    context.shadowBlur = 8;
    context.fillRect(block.x, block.y, block.width, block.height);
    context.fillStyle = "rgba(5, 7, 13, 0.38)";
    context.fillRect(block.x + block.width - 4, block.y + 2, 2, 2);
  }

  context.restore();
}

function drawBonusTarget(context: CanvasRenderingContext2D, bonus: BonusTarget): void {
  if (!bonus.active) {
    return;
  }

  context.save();
  context.translate(bonus.x, bonus.y);
  context.shadowColor = "#ffffff";
  context.shadowBlur = 16;
  context.fillStyle = "#fff7d6";
  context.fillRect(-28, -6, 56, 12);
  context.fillRect(-16, -14, 32, 8);
  context.fillStyle = "#26d9ff";
  context.fillRect(-35, -2, 12, 5);
  context.fillRect(23, -2, 12, 5);
  context.restore();
}

function drawCenterMessage(
  context: CanvasRenderingContext2D,
  game: GameState,
  headline: string,
  detail: string,
): void {
  const boxWidth = Math.min(440, game.width - 32);
  const boxHeight = 144;
  const boxX = game.width / 2 - boxWidth / 2;
  const boxY = game.height / 2 - boxHeight / 2;

  context.save();
  context.fillStyle = "rgba(5, 7, 13, 0.78)";
  context.fillRect(boxX, boxY, boxWidth, boxHeight);
  context.strokeStyle = "#67e8f9";
  context.lineWidth = 2;
  context.strokeRect(boxX, boxY, boxWidth, boxHeight);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "800 34px 'Courier New', monospace";
  context.fillStyle = "#fff7d6";
  context.fillText(headline, game.width / 2, game.height / 2 - 18);
  context.font = "700 17px 'Courier New', monospace";
  context.fillStyle = "#c7d2df";
  context.fillText(detail, game.width / 2, game.height / 2 + 26);
  context.restore();
}

function getPlayerY(game: GameState): number {
  return game.height - 44;
}

function getPlayerBounds(game: GameState) {
  const y = getPlayerY(game);

  return {
    x: game.playerX - PLAYER_WIDTH / 2,
    y: y - 34,
    width: PLAYER_WIDTH,
    height: 38,
  };
}

function getBonusBounds(bonus: BonusTarget) {
  return {
    x: bonus.x - 35,
    y: bonus.y - 14,
    width: 70,
    height: 26,
  };
}

function getEnemyBounds(enemy: Enemy) {
  return {
    x: enemy.x,
    y: enemy.y,
    width: ENEMY_WIDTH,
    height: ENEMY_HEIGHT,
  };
}

function removeProjectile(game: GameState, projectile: Projectile): void {
  if (projectile.owner === "player") {
    game.playerShots = game.playerShots.filter((shot) => shot !== projectile);
  } else {
    game.enemyShots = game.enemyShots.filter((shot) => shot !== projectile);
  }
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function random(game: GameState): number {
  game.rngSeed = (game.rngSeed * 1664525 + 1013904223) >>> 0;
  return game.rngSeed / 0x100000000;
}

export function AlienWaveDefenderGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is not available.");
    }

    const input = createInput();
    const game = createGame(960, 640);
    gameRef.current = game;
    let lastPhase: Phase = game.phase;
    let lastTime = performance.now();
    let animationId = 0;
    let observer: ResizeObserver | null = null;

    const syncPhase = () => {
      if (game.phase !== lastPhase) {
        lastPhase = game.phase;
        setPhase(game.phase);
      }
    };

    const resizeCanvas = () => {
      const host = canvas.parentElement;
      const rect = host?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
      const width = Math.max(360, Math.floor(rect.width));
      const height = Math.max(360, Math.floor(rect.height));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      resizeGame(game, width, height);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "Enter"].includes(event.code)) {
        event.preventDefault();
      }

      if (event.code === "ArrowLeft" || event.code === "KeyA") {
        input.left = true;
      } else if (event.code === "ArrowRight" || event.code === "KeyD") {
        input.right = true;
      } else if (event.code === "Space" && !event.repeat) {
        input.fireQueued = true;
      } else if (event.code === "Enter" && !event.repeat) {
        input.restartQueued = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft" || event.code === "KeyA") {
        input.left = false;
      } else if (event.code === "ArrowRight" || event.code === "KeyD") {
        input.right = false;
      }
    };

    const frame = (time: number) => {
      const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      updateGame(game, input, deltaSeconds);
      syncPhase();
      renderGame(context, game, time / 1000);
      animationId = requestAnimationFrame(frame);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", resizeCanvas);
    if ("ResizeObserver" in window && canvas.parentElement) {
      observer = new ResizeObserver(resizeCanvas);
      observer.observe(canvas.parentElement);
    }
    resizeCanvas();
    renderGame(context, game, 0);
    animationId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationId);
      observer?.disconnect();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", resizeCanvas);
      gameRef.current = null;
    };
  }, []);

  const restartGame = () => {
    if (gameRef.current) {
      gameRef.current.phase = "game-over";
      const freshGame = createGame(gameRef.current.width, gameRef.current.height);
      Object.assign(gameRef.current, freshGame);
      setPhase("playing");
    }
  };

  return (
    <div className="alien-wave-defender">
      <canvas
        ref={canvasRef}
        className="game-canvas game-canvas--alien-wave"
        aria-label="Alien Wave Defender game canvas"
      />
      {phase === "game-over" ? (
        <button type="button" className="alien-wave-defender__restart" onClick={restartGame}>
          Restart
        </button>
      ) : null}
    </div>
  );
}
