import { BUG, CANVAS, HUD, MUSHROOM, PLAYFIELD, PLAYER } from "../constants";
import type { GameMode } from "../types";
import type { GameState } from "../game-state";
import type { Mushroom } from "../entities/mushroom";
import type { Player } from "../entities/player";
import type { SegmentedBugChain } from "../entities/segmented-bug";
import type { Bullet } from "../entities/bullet";
import type { FallingDropper, FastRunner } from "../entities/enemies";

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas rendering context unavailable.");
    }

    this.ctx = context;
  }

  render(game: GameState): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackground();
    this.drawMushrooms(game.mushrooms);
    this.drawBugChains(game.bugChains);
    this.drawRunners(game.runners);
    this.drawDroppers(game.droppers);
    this.drawBullets(game.bullets);
    this.drawPlayer(game.player);
    this.drawHud(game);
    this.drawOverlay(game.mode, game.level);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS.height);
    gradient.addColorStop(0, "#0c1620");
    gradient.addColorStop(0.58, "#0b1b21");
    gradient.addColorStop(1, "#10141f");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);

    this.ctx.fillStyle = "#071018";
    this.ctx.fillRect(0, 0, CANVAS.width, HUD.height);

    this.ctx.strokeStyle = "rgba(151, 238, 214, 0.16)";
    this.ctx.lineWidth = 1;
    for (let x = PLAYFIELD.left; x <= PLAYFIELD.right; x += 48) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, PLAYFIELD.top);
      this.ctx.lineTo(x, PLAYFIELD.bottom);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.045)";
    this.ctx.fillRect(PLAYFIELD.left, PLAYFIELD.playerZoneTop, PLAYFIELD.right - PLAYFIELD.left, 2);
  }

  private drawHud(game: GameState): void {
    this.ctx.fillStyle = "#eaf7ff";
    this.ctx.font = "700 20px Inter, sans-serif";
    this.ctx.textBaseline = "middle";
    this.ctx.textAlign = "left";
    this.ctx.fillText(`Score ${game.score.toString().padStart(5, "0")}`, 28, 27);
    this.ctx.fillText(`Level ${game.level}`, 394, 27);
    this.ctx.fillText(`Lives ${game.player.lives}`, 548, 27);

    this.ctx.textAlign = "right";
    this.ctx.fillStyle = "#92e7d4";
    this.ctx.fillText("Long Bug Shooter", CANVAS.width - 28, 27);
  }

  private drawPlayer(player: Player): void {
    const rect = player.rect;
    const blinking = player.invulnerableTimer > 0 && Math.floor(player.invulnerableTimer * 12) % 2 === 0;

    if (blinking) {
      this.ctx.globalAlpha = 0.48;
    }

    this.ctx.fillStyle = "#f8f3d0";
    this.ctx.beginPath();
    this.ctx.moveTo(player.x, rect.y);
    this.ctx.lineTo(rect.x + rect.width, rect.y + rect.height);
    this.ctx.lineTo(rect.x, rect.y + rect.height);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = "#49d8ff";
    this.ctx.fillRect(player.x - 4, rect.y + 8, 8, PLAYER.height - 10);
    this.ctx.globalAlpha = 1;
  }

  private drawBullets(bullets: Bullet[]): void {
    this.ctx.fillStyle = "#fff86b";
    for (const bullet of bullets) {
      const rect = bullet.rect;
      this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
  }

  private drawMushrooms(mushrooms: Mushroom[]): void {
    for (const mushroom of mushrooms) {
      const healthRatio = mushroom.health / MUSHROOM.health;
      const capColor = healthRatio > 0.66 ? "#ff6f91" : healthRatio > 0.33 ? "#f9a348" : "#b45cff";
      this.ctx.fillStyle = "#315f58";
      this.ctx.fillRect(mushroom.x + 7, mushroom.y + 10, 10, 13);
      this.ctx.fillStyle = capColor;
      this.ctx.beginPath();
      this.ctx.roundRect(mushroom.x + 2, mushroom.y + 2, 20, 15, 6);
      this.ctx.fill();
      this.ctx.fillStyle = "rgba(255,255,255,0.65)";
      this.ctx.fillRect(mushroom.x + 7, mushroom.y + 6, 4, 3);
      this.ctx.fillRect(mushroom.x + 15, mushroom.y + 9, 3, 3);
    }
  }

  private drawBugChains(chains: SegmentedBugChain[]): void {
    for (const chain of chains) {
      this.drawBugChain(chain);
    }
  }

  private drawBugChain(chain: SegmentedBugChain): void {
    chain.segments.forEach((segment, index) => {
      const rect = chain.rectFor(segment);
      const glow = 0.5 + Math.sin(segment.pulse * 8) * 0.12;
      this.ctx.fillStyle = index === 0 ? "#79f27c" : `rgba(84, 214, 124, ${glow})`;
      this.ctx.beginPath();
      this.ctx.roundRect(rect.x, rect.y, BUG.segmentSize, BUG.segmentSize, 7);
      this.ctx.fill();

      this.ctx.fillStyle = index === 0 ? "#122319" : "#17311f";
      this.ctx.fillRect(segment.x - 6, segment.y - 3, 4, 4);
      this.ctx.fillRect(segment.x + 3, segment.y - 3, 4, 4);
    });
  }

  private drawRunners(runners: FastRunner[]): void {
    for (const runner of runners) {
      const rect = runner.rect;
      this.ctx.fillStyle = "#ffcc48";
      this.ctx.fillRect(rect.x, rect.y + 6, rect.width, 8);
      this.ctx.fillStyle = "#ff7b3d";
      this.ctx.fillRect(rect.x + 5, rect.y, rect.width - 10, rect.height);
      this.ctx.fillStyle = "#1a1010";
      this.ctx.fillRect(runner.direction > 0 ? rect.x + rect.width - 8 : rect.x + 4, rect.y + 5, 4, 4);
    }
  }

  private drawDroppers(droppers: FallingDropper[]): void {
    for (const dropper of droppers) {
      const rect = dropper.rect;
      this.ctx.fillStyle = "#7fe4ff";
      this.ctx.beginPath();
      this.ctx.moveTo(dropper.x, rect.y);
      this.ctx.lineTo(rect.x + rect.width, dropper.y);
      this.ctx.lineTo(dropper.x, rect.y + rect.height);
      this.ctx.lineTo(rect.x, dropper.y);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.fillStyle = "#0b2b35";
      this.ctx.fillRect(dropper.x - 4, dropper.y - 4, 8, 8);
    }
  }

  private drawOverlay(mode: GameMode, level: number): void {
    if (mode === "playing") {
      return;
    }

    const text = this.overlayText(mode, level);
    if (!text) {
      return;
    }

    this.ctx.fillStyle = "rgba(3, 8, 14, 0.72)";
    this.ctx.fillRect(0, HUD.height, CANVAS.width, CANVAS.height - HUD.height);

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "#f8f3d0";
    this.ctx.font = "800 54px Inter, sans-serif";
    this.ctx.fillText(text.title, CANVAS.width / 2, CANVAS.height / 2 - 48);
    this.ctx.fillStyle = "#aeeedf";
    this.ctx.font = "700 22px Inter, sans-serif";
    this.ctx.fillText(text.subtitle, CANVAS.width / 2, CANVAS.height / 2 + 14);
  }

  private overlayText(mode: GameMode, level: number): { title: string; subtitle: string } | undefined {
    switch (mode) {
      case "start":
        return { title: "Long Bug Shooter", subtitle: "Press Space or Enter" };
      case "paused":
        return { title: "Paused", subtitle: "Press P to resume" };
      case "levelClear":
        return { title: `Level ${level} Clear`, subtitle: "Next wave incoming" };
      case "gameOver":
        return { title: "Game Over", subtitle: "Press R to restart" };
      default:
        return undefined;
    }
  }
}
