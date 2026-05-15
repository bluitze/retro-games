import { BULLET, MUSHROOM, PLAYER, SCORING } from "./constants";
import { rectsOverlap } from "./collision";
import type { GameMode, Hostile } from "./types";
import type { Input } from "./input";
import { Bullet } from "./entities/bullet";
import { FallingDropper, FastRunner } from "./entities/enemies";
import { Mushroom } from "./entities/mushroom";
import { Player } from "./entities/player";
import { SegmentedBugChain } from "./entities/segmented-bug";
import { makeObstacleNear, obstacleAtPoint, spawnBugChain, spawnDropper, spawnMushrooms, spawnRunner } from "./spawners";

export class GameState {
  mode: GameMode = "start";
  score = 0;
  level = 1;
  player = new Player();
  bullets: Bullet[] = [];
  mushrooms: Mushroom[] = [];
  bugChains: SegmentedBugChain[] = [];
  runners: FastRunner[] = [];
  droppers: FallingDropper[] = [];
  messageTimer = 0;
  private runnerTimer = 2.5;
  private dropperTimer = 5;

  constructor(private input: Input) {
    this.prepareLevel();
  }

  get activeHostiles(): Hostile[] {
    return [
      ...this.bugChains.flatMap((chain) => chain.hostileRects.map((rect) => ({ rect, active: chain.active }))),
      ...this.runners,
      ...this.droppers,
    ];
  }

  update(deltaSeconds: number): void {
    this.handleGlobalInput();

    if (this.mode === "paused" || this.mode === "start" || this.mode === "gameOver") {
      return;
    }

    if (this.mode === "levelClear") {
      this.messageTimer -= deltaSeconds;
      if (this.messageTimer <= 0) {
        this.level += 1;
        this.prepareLevel();
        this.mode = "playing";
      }
      return;
    }

    this.player.update(deltaSeconds, this.input);
    this.updateShooting();
    this.updateBullets(deltaSeconds);
    this.updateEnemies(deltaSeconds);
    this.resolveBulletHits();
    this.resolvePlayerHits();
    this.checkLevelClear();
  }

  restart(): void {
    this.mode = "start";
    this.score = 0;
    this.level = 1;
    this.player.resetAll();
    this.bullets = [];
    this.runners = [];
    this.droppers = [];
    this.prepareLevel();
  }

  private handleGlobalInput(): void {
    if ((this.mode === "start" || this.mode === "gameOver") && this.input.pressedStart) {
      this.mode = "playing";
      return;
    }

    if (this.mode === "gameOver" && this.input.pressedRestart) {
      this.restart();
      this.mode = "playing";
      return;
    }

    if ((this.mode === "playing" || this.mode === "paused") && this.input.pressedPause) {
      this.mode = this.mode === "playing" ? "paused" : "playing";
    }
  }

  private prepareLevel(): void {
    this.bullets = [];
    this.runners = [];
    this.droppers = [];
    this.mushrooms = spawnMushrooms(this.level, {
      x: this.player.x - 80,
      y: this.player.y - 52,
      width: 160,
      height: 100,
    });
    this.bugChains = [spawnBugChain(this.level)];
    this.runnerTimer = Math.max(0.8, 2.8 - this.level * 0.16);
    this.dropperTimer = Math.max(1.6, 5.4 - this.level * 0.24);
  }

  private updateShooting(): void {
    if (this.input.wantsShoot && this.player.canFire(this.bullets.length)) {
      this.bullets.push(new Bullet(this.player.x, this.player.y - PLAYER.height / 2));
      this.player.didFire();
    }
  }

  private updateBullets(deltaSeconds: number): void {
    for (const bullet of this.bullets) {
      bullet.update(deltaSeconds);
    }

    this.bullets = this.bullets.filter((bullet) => bullet.active);
  }

  private updateEnemies(deltaSeconds: number): void {
    for (const chain of this.bugChains) {
      chain.update(deltaSeconds, this.mushrooms);
    }

    this.runnerTimer -= deltaSeconds;
    if (this.runnerTimer <= 0) {
      this.runners.push(spawnRunner(this.level));
      this.runnerTimer = Math.max(0.75, 3 - this.level * 0.18);
    }

    this.dropperTimer -= deltaSeconds;
    if (this.dropperTimer <= 0) {
      this.droppers.push(spawnDropper(this.level));
      this.dropperTimer = Math.max(1.5, 5.8 - this.level * 0.28);
    }

    for (const runner of this.runners) {
      runner.update(deltaSeconds);
    }

    for (const dropper of this.droppers) {
      dropper.update(deltaSeconds);
      this.maybeDropObstacle(dropper);
    }

    this.bugChains = this.bugChains.filter((chain) => chain.active);
    this.runners = this.runners.filter((runner) => runner.active);
    this.droppers = this.droppers.filter((dropper) => dropper.active);
  }

  private resolveBulletHits(): void {
    for (const bullet of this.bullets) {
      if (!bullet.active) {
        continue;
      }

      const mushroom = this.mushrooms.find((candidate) => rectsOverlap(bullet.rect, candidate.rect));
      if (mushroom) {
        const result = mushroom.damage(BULLET.obstacleDamage);
        bullet.active = false;
        if (result.destroyed) {
          this.score += SCORING.obstacle;
          this.mushrooms = this.mushrooms.filter((candidate) => candidate !== mushroom);
        }
        continue;
      }

      const runner = this.runners.find((candidate) => rectsOverlap(bullet.rect, candidate.rect));
      if (runner) {
        runner.active = false;
        bullet.active = false;
        this.score += SCORING.runner;
        continue;
      }

      const dropper = this.droppers.find((candidate) => rectsOverlap(bullet.rect, candidate.rect));
      if (dropper) {
        dropper.active = false;
        bullet.active = false;
        this.score += SCORING.dropper;
        continue;
      }

      for (const chain of this.bugChains) {
        const hit = chain.findHit(bullet.rect);
        if (!hit) {
          continue;
        }

        bullet.active = false;
        this.score += SCORING.bugSegment;
        this.addOrStrengthenObstacle(hit.center);
        const splitChains = chain.hitSegment(hit.index);
        this.bugChains = [...this.bugChains.filter((candidate) => candidate !== chain), ...splitChains];
        break;
      }
    }

    this.bullets = this.bullets.filter((bullet) => bullet.active);
  }

  private resolvePlayerHits(): void {
    if (this.player.invulnerableTimer > 0) {
      return;
    }

    const playerRect = this.player.rect;
    const hit = this.activeHostiles.some((hostile) => hostile.active && rectsOverlap(playerRect, hostile.rect));

    if (!hit) {
      return;
    }

    this.player.loseLife();
    this.bullets = [];

    if (this.player.lives <= 0) {
      this.mode = "gameOver";
    }
  }

  private checkLevelClear(): void {
    if (this.bugChains.length === 0) {
      this.score += SCORING.levelClear;
      this.mode = "levelClear";
      this.messageTimer = 1.6;
    }
  }

  private maybeDropObstacle(dropper: FallingDropper): void {
    if (Math.random() > 0.018 || dropper.y > this.player.y - 80) {
      return;
    }

    const obstacle = new Mushroom(
      Math.round((dropper.x - MUSHROOM.width / 2) / MUSHROOM.width) * MUSHROOM.width,
      Math.round((dropper.y - MUSHROOM.height / 2) / MUSHROOM.height) * MUSHROOM.height,
      1,
    );

    if (!this.mushrooms.some((mushroom) => rectsOverlap(mushroom.rect, obstacle.rect))) {
      this.mushrooms.push(obstacle);
    }
  }

  private addOrStrengthenObstacle(center: { x: number; y: number }): void {
    const existing = obstacleAtPoint(this.mushrooms, center);
    if (existing) {
      existing.strengthen();
      return;
    }

    this.mushrooms.push(makeObstacleNear(center));
  }
}
