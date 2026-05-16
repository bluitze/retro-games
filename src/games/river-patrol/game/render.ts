import { FIELD_HEIGHT, FIELD_WIDTH, SEGMENT_HEIGHT, STARTING_FUEL } from "./constants";
import { getRiverBanks, getRiverTerrain } from "./game";
import type { Bridge, Enemy, FuelDepot, GameState, Player, Shot } from "./types";

export function renderGame(
  context: CanvasRenderingContext2D,
  game: GameState,
  now: number,
  muted: boolean,
): void {
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  drawTerrain(context, game);
  drawFuelDepots(context, game.fuelDepots);
  drawBridges(context, game.bridges);
  drawEnemies(context, game.enemies);
  drawShots(context, game.shots);
  drawPlayer(context, game.player, now);
  drawParticles(context, game);
  drawHud(context, game, muted);

  if (game.status === "paused") {
    drawCenterMessage(context, "PAUSED", "P resumes patrol");
  } else if (game.status === "gameover") {
    drawCenterMessage(context, "GAME OVER", "R restarts  M toggles sound");
  }
}

function drawTerrain(context: CanvasRenderingContext2D, game: GameState): void {
  context.fillStyle = "#123d9b";
  context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  for (let y = -SEGMENT_HEIGHT; y < FIELD_HEIGHT + SEGMENT_HEIGHT; y += SEGMENT_HEIGHT) {
    const terrainTop = getRiverTerrain(game.worldY - y, game.sector);
    const terrainBottom = getRiverTerrain(game.worldY - (y + SEGMENT_HEIGHT), game.sector);

    context.fillStyle = "#2c7c31";
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(terrainTop.left, y);
    context.lineTo(terrainBottom.left, y + SEGMENT_HEIGHT);
    context.lineTo(0, y + SEGMENT_HEIGHT);
    context.closePath();
    context.fill();

    context.beginPath();
    context.moveTo(terrainTop.right, y);
    context.lineTo(FIELD_WIDTH, y);
    context.lineTo(FIELD_WIDTH, y + SEGMENT_HEIGHT);
    context.lineTo(terrainBottom.right, y + SEGMENT_HEIGHT);
    context.closePath();
    context.fill();

    drawBankEdge(context, terrainTop.left, terrainBottom.left, y, "left");
    drawBankEdge(context, terrainTop.right, terrainBottom.right, y, "right");

    for (const [index, island] of terrainTop.islands.entries()) {
      const bottomIsland = terrainBottom.islands[index] ?? island;
      context.fillStyle = "#1f7025";
      context.beginPath();
      context.moveTo(island.left, y);
      context.lineTo(island.right, y);
      context.lineTo(bottomIsland.right, y + SEGMENT_HEIGHT);
      context.lineTo(bottomIsland.left, y + SEGMENT_HEIGHT);
      context.closePath();
      context.fill();
      drawBankEdge(context, island.left, bottomIsland.left, y, "left");
      drawBankEdge(context, island.right, bottomIsland.right, y, "right");
    }

    if ((Math.floor((game.worldY - y) / SEGMENT_HEIGHT) & 3) === 0) {
      context.fillStyle = "#4a9a35";
      context.fillRect(10, y + 2, 18, 4);
      context.fillRect(FIELD_WIDTH - 34, y + 8, 22, 4);
    }
  }

  context.fillStyle = "rgba(150, 217, 255, 0.08)";
  for (let y = positiveModulo(game.worldY, 56) - 56; y < FIELD_HEIGHT; y += 56) {
    const banks = getRiverBanks(game.worldY - y, game.sector);
    context.fillRect(banks.left + 28, y, Math.max(10, banks.right - banks.left - 56), 1);
  }
}

function drawBankEdge(
  context: CanvasRenderingContext2D,
  topX: number,
  bottomX: number,
  y: number,
  side: "left" | "right",
): void {
  const innerOffset = side === "left" ? 1 : -1;
  const outerOffset = side === "left" ? -2 : 2;

  context.fillStyle = "#9d913e";
  context.beginPath();
  context.moveTo(Math.round(topX + outerOffset), y);
  context.lineTo(Math.round(topX + innerOffset), y);
  context.lineTo(Math.round(bottomX + innerOffset), y + SEGMENT_HEIGHT + 1);
  context.lineTo(Math.round(bottomX + outerOffset), y + SEGMENT_HEIGHT + 1);
  context.closePath();
  context.fill();
}

function drawPlayer(context: CanvasRenderingContext2D, player: Player, now: number): void {
  if (player.invulnerable > 0 && Math.floor(now * 14) % 2 === 0) {
    return;
  }

  const x = Math.round(player.x);
  const y = Math.round(player.y);

  context.fillStyle = "#e7f6ff";
  context.fillRect(x + 7, y, 4, 5);
  context.fillRect(x + 5, y + 5, 8, 13);
  context.fillStyle = "#ffef7a";
  context.fillRect(x + 2, y + 11, 14, 4);
  context.fillStyle = "#9fdcff";
  context.fillRect(x + 7, y + 4, 4, 4);
  context.fillStyle = "#ff7043";
  context.fillRect(x + 6, y + 18, 2, 4);
  context.fillRect(x + 10, y + 18, 2, 4);
}

function drawShots(context: CanvasRenderingContext2D, shots: Shot[]): void {
  context.fillStyle = "#f9fbff";
  for (const shot of shots) {
    context.fillRect(Math.round(shot.x), Math.round(shot.y), shot.width, shot.height);
  }
}

function drawEnemies(context: CanvasRenderingContext2D, enemies: Enemy[]): void {
  for (const enemy of enemies) {
    const x = Math.round(enemy.x);
    const y = Math.round(enemy.y);

    if (enemy.kind === "boat") {
      context.fillStyle = "#f06f42";
      context.fillRect(x + 3, y + 5, enemy.width - 6, 7);
      context.fillStyle = "#ffe1a3";
      context.fillRect(x + 8, y + 2, 8, 4);
    } else if (enemy.kind === "helicopter") {
      context.fillStyle = "#d9f36e";
      context.fillRect(x + 6, y + 5, 14, 6);
      context.fillRect(x + 1, y + 3, 24, 2);
      context.fillStyle = "#ffef7a";
      context.fillRect(x + 20, y + 7, 5, 2);
    } else if (enemy.kind === "jet") {
      context.fillStyle = "#f9fbff";
      context.fillRect(x + 8, y, 4, 15);
      context.fillStyle = "#ff6f91";
      context.fillRect(x + 2, y + 8, 16, 4);
      context.fillRect(x + 6, y + 14, 8, 3);
    } else {
      context.fillStyle = "#8f8a61";
      context.fillRect(x + 2, y + 6, 16, 7);
      context.fillStyle = "#24261c";
      context.fillRect(x + 6, y + 3, 8, 5);
      context.fillStyle = "#f2d16b";
      context.fillRect(x + 14, y + 2, 8, 2);
    }
  }
}

function drawFuelDepots(context: CanvasRenderingContext2D, fuelDepots: FuelDepot[]): void {
  for (const fuelDepot of fuelDepots) {
    const x = Math.round(fuelDepot.x);
    const y = Math.round(fuelDepot.y);

    context.fillStyle = "#101b18";
    context.fillRect(x, y, fuelDepot.width, fuelDepot.height);
    context.fillStyle = "#39ff88";
    context.fillRect(x + 3, y + 3, fuelDepot.width - 6, fuelDepot.height - 6);
    context.fillStyle = "#123d2b";
    context.fillRect(x + 8, y + 5, 4, 12);
    context.fillRect(x + 5, y + 9, 10, 4);
  }
}

function drawBridges(context: CanvasRenderingContext2D, bridges: Bridge[]): void {
  for (const bridge of bridges) {
    const x = Math.round(bridge.x);
    const y = Math.round(bridge.y);

    context.fillStyle = "#5b4634";
    context.fillRect(x, y, bridge.width, bridge.height);
    context.fillStyle = "#d4b06a";
    for (let column = x + 4; column < x + bridge.width - 4; column += 14) {
      context.fillRect(column, y + 2, 6, bridge.height - 4);
    }
    context.fillStyle = "#241c16";
    context.fillRect(x, y + 7, bridge.width, 3);
  }
}

function drawParticles(context: CanvasRenderingContext2D, game: GameState): void {
  for (const particle of game.particles) {
    context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    context.fillStyle = particle.color;
    context.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
  }
  context.globalAlpha = 1;
}

function drawHud(context: CanvasRenderingContext2D, game: GameState, muted: boolean): void {
  context.fillStyle = "rgba(4, 8, 18, 0.72)";
  context.fillRect(0, 0, FIELD_WIDTH, 42);

  context.fillStyle = "#f9fbff";
  context.font = "8px 'Courier New', monospace";
  context.textBaseline = "top";
  context.fillText(`SCORE ${game.score.toString().padStart(6, "0")}`, 8, 6);
  context.fillText(`HI ${game.highScore.toString().padStart(6, "0")}`, 8, 18);
  context.fillText(`SECTOR ${game.sector}`, 226, 6);
  context.fillText(`SPD ${Math.round(game.throttle * 100).toString().padStart(3, "0")}`, 226, 18);
  context.fillText(`${muted ? "MUTED" : "SOUND"}`, 326, 6);
  context.fillText(`LIVES ${game.lives}`, 326, 18);

  context.strokeStyle = "#f9fbff";
  context.strokeRect(76, 30, 210, 7);
  const fuelWidth = Math.floor((game.fuel / STARTING_FUEL) * 206);
  context.fillStyle = game.fuel < 22 ? "#ff4f4f" : game.fuel < 45 ? "#ffd95f" : "#39ff88";
  context.fillRect(78, 32, fuelWidth, 3);
  context.fillStyle = "#f9fbff";
  context.fillText("FUEL", 34, 29);

  if (game.messageTimer > 0 || game.status === "gameover") {
    context.fillStyle = "rgba(4, 8, 18, 0.64)";
    context.fillRect(20, 50, FIELD_WIDTH - 40, 16);
    context.fillStyle = "#fff7d6";
    context.textAlign = "center";
    context.fillText(game.message, FIELD_WIDTH / 2, 54);
    context.textAlign = "left";
  }
}

function drawCenterMessage(context: CanvasRenderingContext2D, title: string, subtitle: string): void {
  context.fillStyle = "rgba(2, 4, 10, 0.72)";
  context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff7d6";
  context.font = "22px 'Courier New', monospace";
  context.fillText(title, FIELD_WIDTH / 2, FIELD_HEIGHT / 2 - 14);
  context.fillStyle = "#c7d2df";
  context.font = "9px 'Courier New', monospace";
  context.fillText(subtitle, FIELD_WIDTH / 2, FIELD_HEIGHT / 2 + 18);
  context.textAlign = "left";
  context.textBaseline = "top";
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
