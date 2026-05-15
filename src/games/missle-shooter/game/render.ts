import { COLORS, TUNING } from "./constants";
import type {
  City,
  DefenseMissile,
  EnemyMissile,
  Explosion,
  GameState,
  MissileBase,
  Point,
} from "./types";

const HUD = {
  margin: 20,
  lineHeight: 22,
  panelPadding: 12,
  messageOffset: 94,
  smallFont: "13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  mediumFont: "16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  largeFont: "28px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

export function renderGame(context: CanvasRenderingContext2D, state: GameState): void {
  context.clearRect(0, 0, state.width, state.height);
  drawSky(context, state);

  context.save();
  applyShake(context, state);
  drawGround(context, state);
  drawCities(context, state.cities);
  drawBases(context, state.bases, state.selectedBaseId);
  drawMissileGroup(context, state.enemyMissiles, COLORS.enemyTrail, COLORS.enemy);
  drawMissileGroup(context, state.defenseMissiles, COLORS.playerTrail, COLORS.player);
  drawExplosions(context, state.explosions);
  context.restore();

  drawImpactFlash(context, state);
  drawHud(context, state);
}

function drawSky(context: CanvasRenderingContext2D, state: GameState): void {
  const gradient = context.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, COLORS.skyTop);
  gradient.addColorStop(0.64, COLORS.skyBottom);
  gradient.addColorStop(1, "#0a1015");

  context.fillStyle = gradient;
  context.fillRect(0, 0, state.width, state.height);

  context.fillStyle = "rgba(220, 248, 255, 0.7)";

  for (let index = 0; index < TUNING.starCount; index += 1) {
    const x = pseudoRandom(index * 2 + 3) * state.width;
    const y = pseudoRandom(index * 2 + 9) * state.height * 0.62;
    const radius = 0.55 + pseudoRandom(index + 17) * 1.15;
    context.globalAlpha = 0.28 + pseudoRandom(index + 31) * 0.5;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
}

function applyShake(context: CanvasRenderingContext2D, state: GameState): void {
  if (state.screenShake <= 0) {
    return;
  }

  const shakeAmount = state.screenShake * 9;
  context.translate(
    (Math.random() - 0.5) * shakeAmount,
    (Math.random() - 0.5) * shakeAmount,
  );
}

function drawGround(context: CanvasRenderingContext2D, state: GameState): void {
  const groundY = state.height - TUNING.groundInset + 20;

  context.fillStyle = COLORS.ground;
  context.fillRect(0, groundY, state.width, state.height - groundY);

  context.strokeStyle = COLORS.groundGlow;
  context.globalAlpha = 0.7;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, groundY);
  context.lineTo(state.width, groundY);
  context.stroke();
  context.globalAlpha = 1;
}

function drawCities(context: CanvasRenderingContext2D, cities: City[]): void {
  for (const city of cities) {
    if (city.destroyed) {
      drawDestroyedCity(context, city);
    } else {
      drawCity(context, city);
    }
  }
}

function drawCity(context: CanvasRenderingContext2D, city: City): void {
  const baseY = city.position.y + 18;
  const left = city.position.x - city.width / 2;
  const buildingWidth = city.width / 5;
  const heights = [18, 27, 23, 31, 20];

  context.fillStyle = COLORS.cityDark;
  context.fillRect(left - 4, baseY - 5, city.width + 8, 8);

  for (let index = 0; index < heights.length; index += 1) {
    const height = heights[index];
    const x = left + index * buildingWidth;
    context.fillStyle = index % 2 === 0 ? COLORS.city : "#91f1c6";
    context.fillRect(x + 1, baseY - height, buildingWidth - 2, height);

    context.fillStyle = "rgba(5, 7, 18, 0.45)";
    context.fillRect(x + buildingWidth * 0.32, baseY - height + 7, 3, 4);
    context.fillRect(x + buildingWidth * 0.58, baseY - height + 15, 3, 4);
  }
}

function drawDestroyedCity(context: CanvasRenderingContext2D, city: City): void {
  const baseY = city.position.y + 18;
  const left = city.position.x - city.width / 2;

  context.fillStyle = "rgba(255, 122, 127, 0.22)";
  context.beginPath();
  context.arc(city.position.x, baseY - 8, city.width * 0.42, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = COLORS.cityDark;
  for (let index = 0; index < 6; index += 1) {
    const rubbleWidth = city.width / 7;
    const height = 5 + pseudoRandom(city.id * 10 + index) * 13;
    context.fillRect(left + index * rubbleWidth * 1.12, baseY - height, rubbleWidth, height);
  }
}

function drawBases(
  context: CanvasRenderingContext2D,
  bases: MissileBase[],
  selectedBaseId: number | null,
): void {
  for (const base of bases) {
    drawBase(context, base, selectedBaseId === base.id);
  }
}

function drawBase(context: CanvasRenderingContext2D, base: MissileBase, selected: boolean): void {
  const baseY = base.position.y + 19;
  const halfWidth = TUNING.baseWidth / 2;

  if (base.destroyed) {
    context.fillStyle = COLORS.baseDark;
    context.fillRect(base.position.x - halfWidth, baseY - 12, TUNING.baseWidth, 12);
    context.fillStyle = "rgba(255, 95, 103, 0.35)";
    context.beginPath();
    context.arc(base.position.x, baseY - 18, 26, 0, Math.PI * 2);
    context.fill();
    return;
  }

  if (selected) {
    context.strokeStyle = "rgba(249, 248, 113, 0.9)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(base.position.x, baseY - 18, 31, 0, Math.PI * 2);
    context.stroke();
  }

  context.fillStyle = COLORS.baseDark;
  context.fillRect(base.position.x - halfWidth, baseY - 12, TUNING.baseWidth, 12);

  context.fillStyle = COLORS.base;
  context.beginPath();
  context.moveTo(base.position.x - 23, baseY - 12);
  context.lineTo(base.position.x, baseY - TUNING.baseHeight);
  context.lineTo(base.position.x + 23, baseY - 12);
  context.closePath();
  context.fill();

  context.fillStyle = "#fff4c2";
  context.fillRect(base.position.x - 3, baseY - TUNING.baseHeight + 11, 6, 16);
  drawAmmoPips(context, base);
}

function drawAmmoPips(context: CanvasRenderingContext2D, base: MissileBase): void {
  const pipSize = 4;
  const totalWidth = base.maxAmmo * (pipSize + 2) - 2;
  const startX = base.position.x - totalWidth / 2;
  const y = base.position.y + 28;

  for (let index = 0; index < base.maxAmmo; index += 1) {
    context.fillStyle = index < base.ammo ? COLORS.base : "rgba(255, 209, 102, 0.18)";
    context.fillRect(startX + index * (pipSize + 2), y, pipSize, pipSize);
  }
}

function drawMissileGroup(
  context: CanvasRenderingContext2D,
  missiles: Array<EnemyMissile | DefenseMissile>,
  trailColor: string,
  headColor: string,
): void {
  for (const missile of missiles) {
    drawTrail(context, missile.trail, missile.position, trailColor);

    context.fillStyle = headColor;
    context.beginPath();
    context.arc(missile.position.x, missile.position.y, 3.2, 0, Math.PI * 2);
    context.fill();
  }
}

function drawTrail(
  context: CanvasRenderingContext2D,
  trail: Point[],
  position: Point,
  color: string,
): void {
  if (trail.length === 0) {
    return;
  }

  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(trail[0].x, trail[0].y);

  for (const point of trail) {
    context.lineTo(point.x, point.y);
  }

  context.lineTo(position.x, position.y);
  context.stroke();
}

function drawExplosions(context: CanvasRenderingContext2D, explosions: Explosion[]): void {
  for (const explosion of explosions) {
    const alpha = explosionAlpha(explosion);
    const gradient = context.createRadialGradient(
      explosion.position.x,
      explosion.position.y,
      0,
      explosion.position.x,
      explosion.position.y,
      explosion.radius,
    );

    gradient.addColorStop(0, withAlpha(COLORS.explosionCore, alpha * 0.9));
    gradient.addColorStop(0.36, withAlpha(COLORS.explosion, alpha * 0.6));
    gradient.addColorStop(1, "rgba(255, 112, 82, 0)");

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(explosion.position.x, explosion.position.y, explosion.radius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = withAlpha(COLORS.explosion, alpha * 0.8);
    context.lineWidth = 2;
    context.stroke();
  }
}

function drawImpactFlash(context: CanvasRenderingContext2D, state: GameState): void {
  if (state.impactFlash <= 0) {
    return;
  }

  context.fillStyle = `rgba(255, 95, 103, ${state.impactFlash * 0.1})`;
  context.fillRect(0, 0, state.width, state.height);
}

function drawHud(context: CanvasRenderingContext2D, state: GameState): void {
  const aliveCities = state.cities.filter((city) => !city.destroyed).length;
  const ammo = state.bases.map((base, index) => `${index + 1}:${base.ammo}`).join("  ");

  context.font = HUD.mediumFont;
  context.textBaseline = "top";
  context.fillStyle = "rgba(5, 8, 18, 0.45)";
  context.fillRect(
    HUD.margin - HUD.panelPadding,
    HUD.margin - HUD.panelPadding,
    Math.min(480, state.width - HUD.margin * 2),
    78,
  );

  context.fillStyle = COLORS.hud;
  context.fillText(`Score ${state.score.toString().padStart(5, "0")}`, HUD.margin, HUD.margin);
  context.fillText(`Wave ${state.wave}`, HUD.margin, HUD.margin + HUD.lineHeight);
  context.fillText(`Cities ${aliveCities}/${state.cities.length}`, HUD.margin + 122, HUD.margin + HUD.lineHeight);
  context.fillStyle = COLORS.mutedHud;
  context.fillText(`Ammo ${ammo}`, HUD.margin, HUD.margin + HUD.lineHeight * 2);

  drawStatusMessage(context, state);
}

function drawStatusMessage(context: CanvasRenderingContext2D, state: GameState): void {
  const hasMessage = state.message.length > 0;
  const hasSummary = state.phase === "waveClear" && state.waveSummary;

  if (!hasMessage && !hasSummary) {
    return;
  }

  const centerX = state.width / 2;
  const centerY = Math.max(130, state.height * 0.3);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(5, 8, 18, 0.62)";
  context.fillRect(centerX - 230, centerY - 54, 460, hasSummary ? 134 : 108);

  context.font = HUD.largeFont;
  context.fillStyle = state.phase === "gameOver" ? COLORS.warning : COLORS.hud;
  context.fillText(state.message, centerX, centerY - 14);

  context.font = HUD.smallFont;
  context.fillStyle = COLORS.mutedHud;

  if (state.phase === "ready") {
    context.fillText("Click to fire. P pauses. R restarts.", centerX, centerY + 28);
  } else if (state.phase === "paused") {
    context.fillText("Press P to resume", centerX, centerY + 28);
  } else if (state.phase === "gameOver") {
    context.fillText("Your final score will remain until restart", centerX, centerY + 28);
  }

  if (hasSummary && state.waveSummary) {
    context.fillText(`City bonus ${state.waveSummary.cityBonus}`, centerX, centerY + 28);
    context.fillText(`Ammo bonus ${state.waveSummary.ammoBonus}`, centerX, centerY + 50);
    context.fillText(`Wave bonus ${state.waveSummary.total}`, centerX, centerY + 72);
  }

  context.textAlign = "left";
}

function explosionAlpha(explosion: Explosion): number {
  const growTime = explosion.maxRadius / explosion.growRate;
  const fadeStart = growTime + explosion.holdTime;

  if (explosion.age <= fadeStart) {
    return 1;
  }

  return Math.max(0, 1 - (explosion.age - fadeStart) / explosion.fadeTime);
}

function withAlpha(hex: string, alpha: number): string {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}
