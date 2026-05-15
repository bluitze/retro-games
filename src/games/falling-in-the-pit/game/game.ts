import { CHECKPOINT_SCORE, START_TIME_SECONDS, VICTORY_SCORE } from './constants';
import { Input } from './input';
import { GameState } from './state';
import { Collectible } from '../entities/collectible';
import { Hazard } from '../entities/hazard';
import { DamageResult, Player } from '../entities/player';
import type { Renderer } from '../rendering/renderer';
import { Camera } from '../world/camera';
import { intersects } from '../world/collision';
import { createLevel, type Level } from '../world/level';

export class Game {
  private state = GameState.Title;
  private readonly level: Level;
  private readonly player: Player;
  private readonly camera: Camera;
  private hazards: Hazard[];
  private collectibles: Collectible[];
  private readonly activeCheckpoints = new Set<string>();
  private score = 0;
  private timeRemaining = START_TIME_SECONDS;
  private elapsedSeconds = 0;
  private objective = 'Press Enter to begin the expedition.';

  constructor(
    private readonly input: Input,
    private readonly renderer: Renderer,
  ) {
    this.level = createLevel();
    this.player = new Player(this.level.spawn.x, this.level.spawn.y);
    this.camera = new Camera(this.level.width);
    this.hazards = this.level.hazards.map((hazard) => new Hazard(hazard));
    this.collectibles = this.level.collectibles.map((collectible) => new Collectible(collectible));
  }

  update(deltaSeconds: number): void {
    if (this.input.consumePress('start') && this.state !== GameState.Playing && this.state !== GameState.Paused) {
      this.startNewRun();
      this.input.endFrame();
      return;
    }

    if (this.input.consumePress('pause')) {
      if (this.state === GameState.Playing) {
        this.state = GameState.Paused;
      } else if (this.state === GameState.Paused) {
        this.state = GameState.Playing;
      }
    }

    if (this.state !== GameState.Playing) {
      this.input.endFrame();
      return;
    }

    this.elapsedSeconds += deltaSeconds;
    this.timeRemaining -= deltaSeconds;

    if (this.timeRemaining <= 0) {
      this.state = GameState.GameOver;
      this.objective = 'Time ran out. Press Enter to restart.';
      this.input.endFrame();
      return;
    }

    this.player.update(deltaSeconds, this.input, this.level);
    this.updateHazards(deltaSeconds);
    this.updateCollectibles();
    this.updateCheckpoints();
    this.updateHazardDamage();
    this.updatePitFalls();
    this.updateVictory();
    this.updateObjectiveHint();
    this.camera.update(this.player.x + this.player.width / 2, deltaSeconds);
    this.input.endFrame();
  }

  render(): void {
    this.renderer.render({
      state: this.state,
      level: this.level,
      camera: this.camera,
      player: this.player,
      hazards: this.hazards,
      collectibles: this.collectibles,
      activeCheckpoints: this.activeCheckpoints,
      score: this.score,
      timeRemaining: this.timeRemaining,
      objective: this.objective,
      elapsedSeconds: this.elapsedSeconds,
    });
  }

  private startNewRun(): void {
    this.state = GameState.Playing;
    this.score = 0;
    this.timeRemaining = START_TIME_SECONDS;
    this.elapsedSeconds = 0;
    this.activeCheckpoints.clear();
    this.objective = this.level.objective;
    this.player.resetForNewRun(this.level.spawn.x, this.level.spawn.y);
    this.hazards = this.level.hazards.map((hazard) => new Hazard(hazard));
    this.collectibles = this.level.collectibles.map((collectible) => new Collectible(collectible));
    this.camera.snapTo(this.player.x);
  }

  private updateHazards(deltaSeconds: number): void {
    for (const hazard of this.hazards) {
      hazard.update(deltaSeconds);
    }
  }

  private updateCollectibles(): void {
    for (const collectible of this.collectibles) {
      if (collectible.collectIfTouched(this.player.rect)) {
        this.score += collectible.value;
      }
    }
  }

  private updateCheckpoints(): void {
    for (const checkpoint of this.level.checkpoints) {
      if (this.activeCheckpoints.has(checkpoint.id) || !intersects(this.player.rect, checkpoint)) {
        continue;
      }

      this.activeCheckpoints.add(checkpoint.id);
      this.player.setCheckpoint(checkpoint.spawnX, checkpoint.spawnY);
      this.score += CHECKPOINT_SCORE;
    }
  }

  private updateHazardDamage(): void {
    for (const mud of this.level.mud) {
      if (intersects(this.player.rect, mud)) {
        this.applyDamage(this.player.takeDamage(), false);
      }
    }

    for (const hazard of this.hazards) {
      if (hazard.touches(this.player.rect)) {
        const result = this.player.takeDamage();
        this.applyDamage(result, false);

        if (result === 'damaged') {
          this.player.velocityY = -260;
        }
      }
    }
  }

  private updatePitFalls(): void {
    if (this.player.y < this.level.height + 60) {
      return;
    }

    const result = this.player.takeDamage();
    this.applyDamage(result, true);
  }

  private applyDamage(result: DamageResult, respawnAfterDamage: boolean): void {
    if (result === 'game-over') {
      this.state = GameState.GameOver;
      this.objective = 'The expedition is over. Press Enter to restart.';
      return;
    }

    if (result === 'lost-life' || respawnAfterDamage) {
      this.player.respawnAtCheckpoint();
      this.camera.snapTo(this.player.x);
    }
  }

  private updateVictory(): void {
    if (!intersects(this.player.rect, this.level.goal)) {
      return;
    }

    this.score += VICTORY_SCORE + Math.ceil(this.timeRemaining) * 10;
    this.state = GameState.Victory;
    this.objective = 'Relics secured. Press Enter to play again.';
  }

  private updateObjectiveHint(): void {
    if (this.state !== GameState.Playing) {
      return;
    }

    const collected = this.collectibles.filter((collectible) => collectible.collected).length;

    if (this.player.climbing) {
      this.objective = 'Climb, then jump clear when ready.';
    } else if (collected < this.collectibles.length) {
      this.objective = 'Collect relics and keep moving east.';
    } else {
      this.objective = 'All relics found. Reach the expedition flag.';
    }
  }
}
