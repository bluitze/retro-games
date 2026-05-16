import { useEffect, useRef, useState } from "react";
import "./styles.css";

type Phase = "playing" | "wave-clear" | "game-over";
type CannonPhase = "idle" | "warning" | "active";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Player = {
  x: number;
  y: number;
  shotCooldown: number;
  biteCooldown: number;
  invulnerable: number;
};

type Shot = Rect & {
  velocityX: number;
};

type ShieldCell = Rect & {
  alive: boolean;
};

type Seeker = {
  x: number;
  y: number;
  radius: number;
};

type Swirl = {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  timer: number;
};

type Cannon = {
  phase: CannonPhase;
  y: number;
  timer: number;
};

type InputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fireQueued: boolean;
  cannonQueued: boolean;
  restartQueued: boolean;
};

type GameState = {
  phase: Phase;
  width: number;
  height: number;
  score: number;
  lives: number;
  wave: number;
  cannonCharge: number;
  waveTimer: number;
  swirlCooldown: number;
  messageTimer: number;
  message: string;
  player: Player;
  shots: Shot[];
  shieldCells: ShieldCell[];
  seeker: Seeker;
  swirl: Swirl;
  cannon: Cannon;
};

type HudState = {
  score: number;
  lives: number;
  wave: number;
  cannonCharge: number;
  phase: Phase;
  status: string;
};

const FIELD_WIDTH = 960;
const FIELD_HEIGHT = 600;
const PLAYER_WIDTH = 42;
const PLAYER_HEIGHT = 24;
const PLAYER_SPEED = 300;
const SHOT_SPEED = 560;
const CORE = {
  x: 850,
  y: 252,
  width: 68,
  height: 96,
};
const NEUTRAL_ZONE = {
  x: 404,
  width: 116,
};
const MAX_CHARGE = 100;

function createInput(): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    fireQueued: false,
    cannonQueued: false,
    restartQueued: false,
  };
}

function createGame(): GameState {
  const game: GameState = {
    phase: "playing",
    width: FIELD_WIDTH,
    height: FIELD_HEIGHT,
    score: 0,
    lives: 3,
    wave: 1,
    cannonCharge: 0,
    waveTimer: 0,
    swirlCooldown: 3.2,
    messageTimer: 2.2,
    message: "Break the shield, charge the cannon, crack the core.",
    player: {
      x: 150,
      y: FIELD_HEIGHT / 2,
      shotCooldown: 0,
      biteCooldown: 0,
      invulnerable: 1.2,
    },
    shots: [],
    shieldCells: [],
    seeker: {
      x: CORE.x + CORE.width / 2,
      y: CORE.y + CORE.height / 2,
      radius: 11,
    },
    swirl: {
      active: false,
      x: 0,
      y: 0,
      radius: 18,
      velocityX: 0,
      velocityY: 0,
      timer: 0,
    },
    cannon: {
      phase: "idle",
      y: FIELD_HEIGHT / 2,
      timer: 0,
    },
  };

  startWave(game, 1);
  return game;
}

function startWave(game: GameState, wave: number): void {
  game.phase = "playing";
  game.wave = wave;
  game.waveTimer = 0;
  game.swirlCooldown = Math.max(1.45, 3.6 - wave * 0.18);
  game.messageTimer = 1.8;
  game.message = wave === 1 ? "Neutral zone blocks seekers, but also blocks normal fire." : `Wave ${wave}. Shield rebuilt.`;
  game.player.x = 150;
  game.player.y = FIELD_HEIGHT / 2;
  game.player.shotCooldown = 0;
  game.player.biteCooldown = 0;
  game.player.invulnerable = 1.15;
  game.shots = [];
  game.shieldCells = createShieldCells(wave);
  game.seeker.x = CORE.x + CORE.width / 2;
  game.seeker.y = CORE.y + CORE.height / 2;
  game.swirl.active = false;
  game.cannon.phase = "idle";
  game.cannon.timer = 0;
}

function createShieldCells(wave: number): ShieldCell[] {
  const cells: ShieldCell[] = [];
  const columns = Math.min(9, 6 + Math.floor(wave / 2));
  const rows = Math.min(10, 7 + Math.floor(wave / 3));
  const cellWidth = 22;
  const cellHeight = 30;
  const gap = 5;
  const left = CORE.x - 58 - columns * (cellWidth + gap);
  const top = CORE.y + CORE.height / 2 - (rows * (cellHeight + gap)) / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const edgeGap = (row === 0 || row === rows - 1) && column < 2 && wave < 3;
      const staggerGap = wave > 2 && row % 3 === 1 && column === columns - 1;

      if (edgeGap || staggerGap) {
        continue;
      }

      cells.push({
        x: left + column * (cellWidth + gap),
        y: top + row * (cellHeight + gap),
        width: cellWidth,
        height: cellHeight,
        alive: true,
      });
    }
  }

  return cells;
}

function updateGame(game: GameState, input: InputState, deltaSeconds: number): void {
  if (input.restartQueued) {
    input.restartQueued = false;

    if (game.phase === "game-over") {
      Object.assign(game, createGame());
      return;
    }
  }

  if (game.phase === "wave-clear") {
    updateCannon(game, deltaSeconds);
    game.waveTimer -= deltaSeconds;

    if (game.waveTimer <= 0) {
      startWave(game, game.wave + 1);
    }

    return;
  }

  if (game.phase === "game-over") {
    input.fireQueued = false;
    input.cannonQueued = false;
    return;
  }

  game.messageTimer = Math.max(0, game.messageTimer - deltaSeconds);
  updatePlayer(game, input, deltaSeconds);
  updateShots(game, deltaSeconds);
  updateSeeker(game, deltaSeconds);
  updateSwirl(game, deltaSeconds);
  updateCannon(game, deltaSeconds);
  resolveCollisions(game);
}

function updatePlayer(game: GameState, input: InputState, deltaSeconds: number): void {
  const horizontal = Number(input.right) - Number(input.left);
  const vertical = Number(input.down) - Number(input.up);
  const length = Math.hypot(horizontal, vertical) || 1;

  game.player.x = clamp(
    game.player.x + (horizontal / length) * PLAYER_SPEED * deltaSeconds,
    PLAYER_WIDTH / 2 + 14,
    CORE.x - 38,
  );
  game.player.y = clamp(
    game.player.y + (vertical / length) * PLAYER_SPEED * deltaSeconds,
    PLAYER_HEIGHT / 2 + 58,
    game.height - PLAYER_HEIGHT / 2 - 26,
  );
  game.player.shotCooldown = Math.max(0, game.player.shotCooldown - deltaSeconds);
  game.player.biteCooldown = Math.max(0, game.player.biteCooldown - deltaSeconds);
  game.player.invulnerable = Math.max(0, game.player.invulnerable - deltaSeconds);

  if (input.fireQueued) {
    if (isPlayerInNeutralZone(game)) {
      setMessage(game, "Neutral zone blocks normal fire.");
    } else if (game.player.shotCooldown <= 0) {
      game.shots.push({
        x: game.player.x + PLAYER_WIDTH / 2 - 2,
        y: game.player.y - 3,
        width: 18,
        height: 6,
        velocityX: SHOT_SPEED,
      });
      game.player.shotCooldown = 0.18;
    }
  }

  if (input.cannonQueued) {
    if (game.cannonCharge >= MAX_CHARGE && game.cannon.phase === "idle") {
      game.cannon = {
        phase: "warning",
        y: game.player.y,
        timer: 0.34,
      };
      game.cannonCharge = 0;
      setMessage(game, "Cannon locked. Clear the beam lane.");
    } else if (game.cannon.phase === "idle") {
      setMessage(game, "Cannon still charging.");
    }
  }

  input.fireQueued = false;
  input.cannonQueued = false;
}

function updateShots(game: GameState, deltaSeconds: number): void {
  for (const shot of game.shots) {
    shot.x += shot.velocityX * deltaSeconds;
  }

  game.shots = game.shots.filter((shot) => shot.x < game.width + 24);
}

function updateSeeker(game: GameState, deltaSeconds: number): void {
  const dx = game.player.x - game.seeker.x;
  const dy = game.player.y - game.seeker.y;
  const distance = Math.hypot(dx, dy) || 1;
  const speed = 104 + game.wave * 13;

  game.seeker.x += (dx / distance) * speed * deltaSeconds;
  game.seeker.y += (dy / distance) * speed * deltaSeconds;
}

function updateSwirl(game: GameState, deltaSeconds: number): void {
  if (game.swirl.active) {
    game.swirl.x += game.swirl.velocityX * deltaSeconds;
    game.swirl.y += game.swirl.velocityY * deltaSeconds;
    game.swirl.timer -= deltaSeconds;

    if (
      game.swirl.timer <= 0 ||
      game.swirl.x < -50 ||
      game.swirl.x > game.width + 50 ||
      game.swirl.y < -50 ||
      game.swirl.y > game.height + 50
    ) {
      game.swirl.active = false;
    }

    return;
  }

  game.swirlCooldown -= deltaSeconds;

  if (game.swirlCooldown <= 0) {
    const originX = CORE.x + 10;
    const originY = CORE.y + CORE.height / 2;
    const dx = game.player.x - originX;
    const dy = game.player.y - originY;
    const distance = Math.hypot(dx, dy) || 1;
    const speed = 300 + game.wave * 28;

    game.swirl = {
      active: true,
      x: originX,
      y: originY,
      radius: 18 + Math.min(8, game.wave),
      velocityX: (dx / distance) * speed,
      velocityY: (dy / distance) * speed,
      timer: 3.2,
    };
    game.swirlCooldown = Math.max(1.15, 3.7 - game.wave * 0.22);
    setMessage(game, "Swirl launched.");
  }
}

function updateCannon(game: GameState, deltaSeconds: number): void {
  if (game.cannon.phase === "idle") {
    return;
  }

  game.cannon.timer -= deltaSeconds;

  if (game.cannon.phase === "warning" && game.cannon.timer <= 0) {
    game.cannon.phase = "active";
    game.cannon.timer = 0.18;
    fireCannonBeam(game);
  } else if (game.cannon.phase === "active" && game.cannon.timer <= 0) {
    game.cannon.phase = "idle";
  }
}

function resolveCollisions(game: GameState): void {
  const playerBounds = getPlayerBounds(game);

  for (const shot of [...game.shots]) {
    const cell = game.shieldCells.find((candidate) => candidate.alive && intersects(shot, candidate));

    if (cell) {
      removeShieldCell(game, cell, 10);
      game.shots = game.shots.filter((candidate) => candidate !== shot);
    }
  }

  if (game.player.biteCooldown <= 0) {
    const touchedCell = game.shieldCells.find((cell) => cell.alive && intersects(playerBounds, cell));

    if (touchedCell) {
      removeShieldCell(game, touchedCell, 15);
      game.player.biteCooldown = 0.16;
      setMessage(game, "Shield cell bitten away.");
    }
  }

  if (game.player.invulnerable <= 0 && !isPlayerInNeutralZone(game) && circleIntersectsRect(game.seeker, playerBounds)) {
    loseLife(game, "Seeker hit. Neutral zone would have blocked it.");
    return;
  }

  if (game.player.invulnerable <= 0 && game.swirl.active && circleIntersectsRect(game.swirl, playerBounds)) {
    game.swirl.active = false;
    loseLife(game, "Swirl impact.");
  }
}

function fireCannonBeam(game: GameState): void {
  const beam = getCannonRect(game);
  const playerBounds = getPlayerBounds(game);
  const blockingCells = game.shieldCells.filter((cell) => cell.alive && intersects(beam, cell) && cell.x < CORE.x);

  if (intersects(beam, playerBounds) && game.player.invulnerable <= 0) {
    loseLife(game, "Caught in your own cannon beam.");

    if (game.phase === "game-over") {
      return;
    }
  }

  if (blockingCells.length > 0) {
    for (const cell of blockingCells) {
      cell.alive = false;
    }
    game.score += blockingCells.length * 8;
    setMessage(game, "Cannon burned shield cells, but the core held.");
    return;
  }

  if (intersects(beam, CORE)) {
    game.score += 650 + game.wave * 175;
    game.phase = "wave-clear";
    game.waveTimer = 1.8;
    game.shots = [];
    game.swirl.active = false;
    setMessage(game, "Core breached. Wave clear.");
  }
}

function removeShieldCell(game: GameState, cell: ShieldCell, points: number): void {
  cell.alive = false;
  game.score += points + game.wave * 2;
  game.cannonCharge = Math.min(MAX_CHARGE, game.cannonCharge + 12);

  if (game.cannonCharge >= MAX_CHARGE) {
    setMessage(game, "Cannon ready. Enter or Shift fires.");
  }
}

function loseLife(game: GameState, message: string): void {
  game.lives -= 1;
  game.shots = [];
  game.player.invulnerable = 1.35;
  game.player.x = 150;
  game.player.y = FIELD_HEIGHT / 2;
  game.seeker.x = CORE.x + CORE.width / 2;
  game.seeker.y = CORE.y + CORE.height / 2;
  game.swirl.active = false;
  game.cannon.phase = "idle";
  game.cannon.timer = 0;

  if (game.lives <= 0) {
    game.phase = "game-over";
    game.message = "Game over. Press R to restart.";
    game.messageTimer = 999;
  } else {
    setMessage(game, message);
  }
}

function setMessage(game: GameState, message: string): void {
  game.message = message;
  game.messageTimer = 2.1;
}

function renderGame(context: CanvasRenderingContext2D, game: GameState, time: number): void {
  drawBackground(context, game, time);
  drawNeutralZone(context, game, time);
  drawHud(context, game);
  drawCore(context, time);
  drawShieldCells(context, game.shieldCells);
  drawShots(context, game.shots);
  drawSeeker(context, game, time);
  drawSwirl(context, game.swirl, time);
  drawCannon(context, game, time);
  drawPlayer(context, game, time);
  drawStatus(context, game);
}

function drawBackground(context: CanvasRenderingContext2D, game: GameState, time: number): void {
  const gradient = context.createLinearGradient(0, 0, game.width, game.height);
  gradient.addColorStop(0, "#09111b");
  gradient.addColorStop(0.55, "#070813");
  gradient.addColorStop(1, "#170b1d");
  context.fillStyle = gradient;
  context.fillRect(0, 0, game.width, game.height);

  context.save();
  context.globalAlpha = 0.38;
  context.fillStyle = "#d8fff6";

  for (let index = 0; index < 90; index += 1) {
    const x = (index * 117.3 + time * (8 + (index % 5))) % game.width;
    const y = (index * 73.9) % game.height;
    const size = index % 11 === 0 ? 2 : 1;
    context.fillRect(x, y, size, size);
  }

  context.globalAlpha = 0.1;
  context.fillStyle = "#ff6f91";
  for (let y = 0; y < game.height; y += 4) {
    context.fillRect(0, y, game.width, 1);
  }

  context.restore();
}

function drawNeutralZone(context: CanvasRenderingContext2D, game: GameState, time: number): void {
  const pulse = 0.22 + Math.sin(time * 5) * 0.05;

  context.save();
  context.globalAlpha = pulse;
  context.fillStyle = "#67e8f9";
  context.fillRect(NEUTRAL_ZONE.x, 0, NEUTRAL_ZONE.width, game.height);
  context.globalAlpha = 0.7;
  context.strokeStyle = "#67e8f9";
  context.setLineDash([10, 10]);
  context.lineWidth = 2;
  context.strokeRect(NEUTRAL_ZONE.x + 4, 46, NEUTRAL_ZONE.width - 8, game.height - 78);
  context.font = "800 16px 'Courier New', monospace";
  context.textAlign = "center";
  context.fillStyle = "#c9fbff";
  context.fillText("NEUTRAL", NEUTRAL_ZONE.x + NEUTRAL_ZONE.width / 2, 82);
  context.restore();
}

function drawHud(context: CanvasRenderingContext2D, game: GameState): void {
  const chargeWidth = 190;
  const charge = game.cannonCharge / MAX_CHARGE;

  context.save();
  context.font = "800 18px 'Courier New', monospace";
  context.textBaseline = "top";
  context.fillStyle = "#ecfbff";
  context.fillText(`SCORE ${String(game.score).padStart(6, "0")}`, 20, 18);
  context.textAlign = "center";
  context.fillText(`SHIELD WING  WAVE ${game.wave}`, game.width / 2, 18);
  context.textAlign = "right";
  context.fillText(`LIVES ${game.lives}`, game.width - 20, 18);

  context.textAlign = "left";
  context.font = "800 13px 'Courier New', monospace";
  context.fillStyle = "#9eb5c8";
  context.fillText("CANNON", 20, 50);
  context.strokeStyle = "#3d5366";
  context.strokeRect(92, 50, chargeWidth, 12);
  context.fillStyle = charge >= 1 ? "#f8d66d" : "#67e8f9";
  context.fillRect(94, 52, Math.max(0, (chargeWidth - 4) * charge), 8);
  context.fillStyle = "#9eb5c8";
  context.fillText(`${game.cannonCharge}%`, 294, 50);
  context.restore();
}

function drawPlayer(context: CanvasRenderingContext2D, game: GameState, time: number): void {
  const flicker = game.player.invulnerable > 0 && Math.floor(time * 18) % 2 === 0;

  if (flicker) {
    return;
  }

  context.save();
  context.translate(game.player.x, game.player.y);
  context.shadowColor = "#b8f36e";
  context.shadowBlur = 15;
  context.fillStyle = "#b8f36e";
  context.beginPath();
  context.moveTo(20, 0);
  context.lineTo(-8, -10);
  context.lineTo(-22, -20);
  context.lineTo(-15, -4);
  context.lineTo(-22, 20);
  context.lineTo(-8, 10);
  context.closePath();
  context.fill();
  context.fillStyle = "#fff7d6";
  context.fillRect(-5, -3, 10, 6);
  context.fillStyle = "#ff6f91";
  context.fillRect(-28, -3, 8, 6);
  context.restore();
}

function drawCore(context: CanvasRenderingContext2D, time: number): void {
  context.save();
  context.shadowColor = "#ff6f91";
  context.shadowBlur = 22;
  context.fillStyle = "#351022";
  context.fillRect(CORE.x, CORE.y, CORE.width, CORE.height);
  context.strokeStyle = "#ff6f91";
  context.lineWidth = 3;
  context.strokeRect(CORE.x, CORE.y, CORE.width, CORE.height);
  context.fillStyle = Math.floor(time * 8) % 2 === 0 ? "#f8d66d" : "#ff6f91";
  context.beginPath();
  context.arc(CORE.x + CORE.width / 2, CORE.y + CORE.height / 2, 22, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#160711";
  context.fillRect(CORE.x + 12, CORE.y + 12, 10, CORE.height - 24);
  context.fillRect(CORE.x + CORE.width - 22, CORE.y + 12, 10, CORE.height - 24);
  context.restore();
}

function drawShieldCells(context: CanvasRenderingContext2D, cells: ShieldCell[]): void {
  context.save();

  for (const cell of cells) {
    if (!cell.alive) {
      continue;
    }

    context.shadowColor = "#26d9ff";
    context.shadowBlur = 8;
    context.fillStyle = "#26d9ff";
    context.fillRect(cell.x, cell.y, cell.width, cell.height);
    context.fillStyle = "rgba(5, 7, 13, 0.42)";
    context.fillRect(cell.x + 4, cell.y + 4, cell.width - 8, 5);
    context.fillRect(cell.x + 4, cell.y + cell.height - 9, cell.width - 8, 5);
  }

  context.restore();
}

function drawShots(context: CanvasRenderingContext2D, shots: Shot[]): void {
  context.save();
  context.shadowColor = "#fff7d6";
  context.shadowBlur = 14;
  context.fillStyle = "#fff7d6";

  for (const shot of shots) {
    context.fillRect(shot.x, shot.y, shot.width, shot.height);
    context.fillStyle = "#67e8f9";
    context.fillRect(shot.x + shot.width - 5, shot.y + 1, 4, shot.height - 2);
    context.fillStyle = "#fff7d6";
  }

  context.restore();
}

function drawSeeker(context: CanvasRenderingContext2D, game: GameState, time: number): void {
  const safe = isPlayerInNeutralZone(game);

  context.save();
  context.translate(game.seeker.x, game.seeker.y);
  context.rotate(time * 5);
  context.shadowColor = safe ? "#67e8f9" : "#ff6f91";
  context.shadowBlur = 18;
  context.strokeStyle = safe ? "#67e8f9" : "#ff6f91";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(0, -game.seeker.radius);
  context.lineTo(game.seeker.radius, 0);
  context.lineTo(0, game.seeker.radius);
  context.lineTo(-game.seeker.radius, 0);
  context.closePath();
  context.stroke();
  context.restore();
}

function drawSwirl(context: CanvasRenderingContext2D, swirl: Swirl, time: number): void {
  if (!swirl.active) {
    return;
  }

  context.save();
  context.translate(swirl.x, swirl.y);
  context.rotate(-time * 10);
  context.shadowColor = "#f8d66d";
  context.shadowBlur = 24;
  context.strokeStyle = "#f8d66d";
  context.lineWidth = 5;
  context.beginPath();

  for (let angle = 0; angle < Math.PI * 3.3; angle += 0.3) {
    const radius = 2 + angle * 2.2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (angle === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.stroke();
  context.restore();
}

function drawCannon(context: CanvasRenderingContext2D, game: GameState, time: number): void {
  if (game.cannon.phase === "idle") {
    return;
  }

  const beam = getCannonRect(game);

  context.save();

  if (game.cannon.phase === "warning") {
    context.globalAlpha = 0.45 + Math.sin(time * 42) * 0.18;
    context.strokeStyle = "#f8d66d";
    context.setLineDash([18, 14]);
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, game.cannon.y);
    context.lineTo(game.width, game.cannon.y);
    context.stroke();
  } else {
    context.shadowColor = "#fff7d6";
    context.shadowBlur = 26;
    context.fillStyle = "#fff7d6";
    context.fillRect(beam.x, beam.y, beam.width, beam.height);
    context.fillStyle = "#ff6f91";
    context.fillRect(beam.x, beam.y + 5, beam.width, beam.height - 10);
  }

  context.restore();
}

function drawStatus(context: CanvasRenderingContext2D, game: GameState): void {
  const status = getStatusText(game);
  const controls = "Move Arrow/WASD  Space fire  Enter/Shift cannon  R restart";

  context.save();
  context.font = "800 16px 'Courier New', monospace";
  context.textAlign = "center";
  context.fillStyle = "#fff7d6";
  context.fillText(status, game.width / 2, game.height - 50);
  context.font = "700 13px 'Courier New', monospace";
  context.fillStyle = "#9eb5c8";
  context.fillText(controls, game.width / 2, game.height - 24);

  if (game.phase === "wave-clear" || game.phase === "game-over") {
    const headline = game.phase === "wave-clear" ? "WAVE CLEAR" : "GAME OVER";
    const detail = game.phase === "wave-clear" ? `Wave ${game.wave + 1} forming` : "Press R or the Restart button";

    context.fillStyle = "rgba(5, 7, 13, 0.82)";
    context.fillRect(game.width / 2 - 230, game.height / 2 - 72, 460, 144);
    context.strokeStyle = "#67e8f9";
    context.lineWidth = 2;
    context.strokeRect(game.width / 2 - 230, game.height / 2 - 72, 460, 144);
    context.font = "900 34px 'Courier New', monospace";
    context.fillStyle = "#fff7d6";
    context.fillText(headline, game.width / 2, game.height / 2 - 12);
    context.font = "800 17px 'Courier New', monospace";
    context.fillStyle = "#c7d2df";
    context.fillText(detail, game.width / 2, game.height / 2 + 28);
  }

  context.restore();
}

function getStatusText(game: GameState): string {
  if (game.phase === "game-over") {
    return "Game over. Press R to restart.";
  }

  if (game.phase === "wave-clear") {
    return "Wave clear.";
  }

  if (game.cannon.phase === "warning") {
    return "Cannon warning. Leave the beam lane.";
  }

  if (game.cannon.phase === "active") {
    return "Cannon firing.";
  }

  if (game.messageTimer > 0) {
    return game.message;
  }

  if (isPlayerInNeutralZone(game)) {
    return "Neutral zone: seeker-safe, normal fire disabled.";
  }

  if (game.cannonCharge >= MAX_CHARGE) {
    return "Cannon ready.";
  }

  return "Break or bite shield cells to charge the cannon.";
}

function getPlayerBounds(game: GameState): Rect {
  return {
    x: game.player.x - PLAYER_WIDTH / 2,
    y: game.player.y - PLAYER_HEIGHT / 2,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
  };
}

function getCannonRect(game: GameState): Rect {
  return {
    x: 0,
    y: game.cannon.y - 9,
    width: game.width,
    height: 18,
  };
}

function isPlayerInNeutralZone(game: GameState): boolean {
  return (
    game.player.x + PLAYER_WIDTH / 2 > NEUTRAL_ZONE.x &&
    game.player.x - PLAYER_WIDTH / 2 < NEUTRAL_ZONE.x + NEUTRAL_ZONE.width
  );
}

function circleIntersectsRect(circle: { x: number; y: number; radius: number }, rect: Rect): boolean {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;

  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createHudState(game: GameState): HudState {
  return {
    score: game.score,
    lives: game.lives,
    wave: game.wave,
    cannonCharge: game.cannonCharge,
    phase: game.phase,
    status: getStatusText(game),
  };
}

function isSameHudState(a: HudState, b: HudState): boolean {
  return (
    a.score === b.score &&
    a.lives === b.lives &&
    a.wave === b.wave &&
    a.cannonCharge === b.cannonCharge &&
    a.phase === b.phase &&
    a.status === b.status
  );
}

export function ShieldWingGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const [hud, setHud] = useState<HudState>(() => createHudState(createGame()));

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
    const game = createGame();
    gameRef.current = game;
    let lastTime = performance.now();
    let animationId = 0;
    let lastHud = createHudState(game);

    const syncHud = () => {
      const nextHud = createHudState(game);

      if (!isSameHudState(lastHud, nextHud)) {
        lastHud = nextHud;
        setHud(nextHud);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "Space",
          "Enter",
          "ShiftLeft",
          "ShiftRight",
          "KeyR",
        ].includes(event.code)
      ) {
        event.preventDefault();
      }

      if (event.code === "ArrowUp" || event.code === "KeyW") {
        input.up = true;
      } else if (event.code === "ArrowDown" || event.code === "KeyS") {
        input.down = true;
      } else if (event.code === "ArrowLeft" || event.code === "KeyA") {
        input.left = true;
      } else if (event.code === "ArrowRight" || event.code === "KeyD") {
        input.right = true;
      } else if (event.code === "Space" && !event.repeat) {
        input.fireQueued = true;
      } else if ((event.code === "Enter" || event.code === "ShiftLeft" || event.code === "ShiftRight") && !event.repeat) {
        input.cannonQueued = true;
      } else if (event.code === "KeyR" && !event.repeat) {
        input.restartQueued = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "ArrowUp" || event.code === "KeyW") {
        input.up = false;
      } else if (event.code === "ArrowDown" || event.code === "KeyS") {
        input.down = false;
      } else if (event.code === "ArrowLeft" || event.code === "KeyA") {
        input.left = false;
      } else if (event.code === "ArrowRight" || event.code === "KeyD") {
        input.right = false;
      }
    };

    const frame = (time: number) => {
      const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      updateGame(game, input, deltaSeconds);
      renderGame(context, game, time / 1000);
      syncHud();
      animationId = requestAnimationFrame(frame);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    renderGame(context, game, 0);
    animationId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      gameRef.current = null;
    };
  }, []);

  const restartGame = () => {
    if (!gameRef.current) {
      return;
    }

    Object.assign(gameRef.current, createGame());
    setHud(createHudState(gameRef.current));
  };

  return (
    <div className="shield-wing" aria-label="Shield Wing game">
      <canvas
        ref={canvasRef}
        width={FIELD_WIDTH}
        height={FIELD_HEIGHT}
        className="game-canvas shield-wing__canvas"
        aria-label="Shield Wing play field"
      />
      <div className="shield-wing__panel" aria-live="polite">
        <span>Score {hud.score.toLocaleString()}</span>
        <span>Lives {hud.lives}</span>
        <span>Wave {hud.wave}</span>
        <span>Charge {hud.cannonCharge}%</span>
      </div>
      <p className="shield-wing__status">{hud.status}</p>
      {hud.phase === "game-over" ? (
        <button type="button" className="shield-wing__restart" onClick={restartGame}>
          Restart
        </button>
      ) : null}
    </div>
  );
}
