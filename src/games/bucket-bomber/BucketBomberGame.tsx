import { useEffect, useRef, useState } from "react";
import "./styles.css";

const FIELD_WIDTH = 320;
const FIELD_HEIGHT = 240;
const LANE_Y = 34;
const GROUND_Y = 218;
const MAX_BUCKETS = 3;
const MAX_SCORE = 999999;
const EXTRA_BUCKET_STEP = 1000;

const BOMB_GROUPS = [
  { bombs: 10, points: 1, fallSpeed: 45, dropInterval: 1.04, bomberSpeed: 48 },
  { bombs: 20, points: 2, fallSpeed: 58, dropInterval: 0.88, bomberSpeed: 62 },
  { bombs: 30, points: 3, fallSpeed: 73, dropInterval: 0.72, bomberSpeed: 80 },
  { bombs: 40, points: 4, fallSpeed: 91, dropInterval: 0.58, bomberSpeed: 101 },
  { bombs: 50, points: 5, fallSpeed: 112, dropInterval: 0.47, bomberSpeed: 124 },
  { bombs: 75, points: 6, fallSpeed: 137, dropInterval: 0.38, bomberSpeed: 150 },
  { bombs: 100, points: 7, fallSpeed: 164, dropInterval: 0.31, bomberSpeed: 178 },
  { bombs: 150, points: 8, fallSpeed: 194, dropInterval: 0.25, bomberSpeed: 208 },
] as const;

type GamePhase = "title" | "turnReady" | "playing" | "paused" | "miss" | "gameOver" | "maxScore";
type GameMode = "one" | "two";
type Difficulty = "normal" | "expert";
type SoundEvent = "start" | "catch" | "tick" | "miss" | "extra" | "gameOver";

type Bomb = {
  id: number;
  x: number;
  y: number;
  wobble: number;
};

type Effect = {
  type: "splash" | "explosion";
  x: number;
  y: number;
  age: number;
  duration: number;
};

type RecoveryState = {
  returnGroupIndex: number;
  remainingBombs: number;
};

type PlayerState = {
  score: number;
  buckets: number;
  groupIndex: number;
  groupProgress: number;
  nextExtraBucketAt: number;
  done: boolean;
  recovery: RecoveryState | null;
};

type GameState = {
  phase: GamePhase;
  mode: GameMode;
  difficulty: Difficulty;
  players: [PlayerState, PlayerState];
  activePlayer: 0 | 1;
  bucketX: number;
  bomberX: number;
  bomberDirection: 1 | -1;
  bomberJukeTimer: number;
  bomberSpeedScale: number;
  bomberWavePhase: number;
  bomberSmileTimer: number;
  bombs: Bomb[];
  effects: Effect[];
  spawnTimer: number;
  missTimer: number;
  nextBombId: number;
  rngSeed: number;
  elapsed: number;
  message: string;
};

type InputState = {
  left: boolean;
  right: boolean;
  pointerActive: boolean;
};

type BucketBomberAudio = {
  unlock: () => void;
  play: (event: SoundEvent) => void;
  setMuted: (muted: boolean) => void;
  destroy: () => void;
};

export function BucketBomberGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<BucketBomberAudio | null>(null);
  const mutedRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return undefined;
    }

    canvas.width = FIELD_WIDTH;
    canvas.height = FIELD_HEIGHT;
    context.imageSmoothingEnabled = false;

    const audio = createAudio();
    audioRef.current = audio;
    audio.setMuted(mutedRef.current);

    const input: InputState = { left: false, right: false, pointerActive: false };
    let game = createInitialGame();
    let lastTime = performance.now();
    let animationId = 0;

    const startOrRestart = () => {
      audio.unlock();

      if (game.phase === "title" || game.phase === "gameOver" || game.phase === "maxScore") {
        game = startNewGame(game.mode, game.difficulty);
        audio.play("start");
        return;
      }

      if (game.phase === "turnReady") {
        game.phase = "playing";
        game.message = `Player ${game.activePlayer + 1}`;
        game.spawnTimer = 0.48;
        audio.play("start");
      }
    };

    const toggleMute = () => {
      const nextMuted = !mutedRef.current;
      mutedRef.current = nextMuted;
      audio.setMuted(nextMuted);
      setIsMuted(nextMuted);
    };

    const keyDown = (event: KeyboardEvent) => {
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "KeyA",
          "KeyD",
          "Enter",
          "Space",
          "KeyP",
          "KeyR",
          "KeyM",
          "Digit1",
          "Digit2",
        ].includes(event.code)
      ) {
        event.preventDefault();
      }

      if (event.code === "ArrowLeft" || event.code === "KeyA") {
        input.left = true;
        input.pointerActive = false;
        return;
      }

      if (event.code === "ArrowRight" || event.code === "KeyD") {
        input.right = true;
        input.pointerActive = false;
        return;
      }

      if (event.repeat) {
        return;
      }

      if (event.code === "Enter" || event.code === "Space") {
        startOrRestart();
        return;
      }

      if (event.code === "KeyP") {
        if (game.phase === "playing") {
          game.phase = "paused";
          game.message = "Paused";
        } else if (game.phase === "paused") {
          game.phase = "playing";
          game.message = `Player ${game.activePlayer + 1}`;
        }
        return;
      }

      if (event.code === "KeyR") {
        audio.unlock();
        game = startNewGame(game.mode, game.difficulty);
        audio.play("start");
        return;
      }

      if (event.code === "KeyM") {
        toggleMute();
        return;
      }

      if (game.phase === "title") {
        if (event.code === "Digit1") {
          game.mode = game.mode === "one" ? "two" : "one";
        } else if (event.code === "Digit2") {
          game.difficulty = game.difficulty === "normal" ? "expert" : "normal";
        }
      }
    };

    const keyUp = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft" || event.code === "KeyA") {
        input.left = false;
      }

      if (event.code === "ArrowRight" || event.code === "KeyD") {
        input.right = false;
      }
    };

    const pointerDown = (event: PointerEvent) => {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      audio.unlock();

      if (handleMenuPointer(game, event)) {
        renderGame(context, game, mutedRef.current);
        return;
      }

      setBucketFromPointer(canvas, game, input, event);
      startOrRestart();
    };

    const pointerMove = (event: PointerEvent) => {
      if (game.phase === "title") {
        return;
      }

      setBucketFromPointer(canvas, game, input, event);
    };

    const pointerUp = (event: PointerEvent) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const frame = (time: number) => {
      const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const events = updateGame(game, input, deltaSeconds);
      for (const event of events) {
        audio.play(event);
      }

      canvas.style.cursor = game.phase === "title" ? "default" : "none";
      renderGame(context, game, mutedRef.current);
      animationId = requestAnimationFrame(frame);
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);

    canvas.style.cursor = "default";
    renderGame(context, game, mutedRef.current);
    animationId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      audio.destroy();
      audioRef.current = null;
    };
  }, []);

  const toggleMuteButton = () => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    audioRef.current?.setMuted(nextMuted);
    audioRef.current?.unlock();
    setIsMuted(nextMuted);
  };

  return (
    <div className="bucket-bomber" aria-label="Bucket Bomber game">
      <canvas
        ref={canvasRef}
        className="game-canvas bucket-bomber__canvas"
        aria-label="Bucket Bomber play field"
      />
      <button type="button" className="bucket-bomber__mute" onClick={toggleMuteButton}>
        {isMuted ? "Unmute" : "Mute"}
      </button>
    </div>
  );
}

function createInitialGame(): GameState {
  return {
    phase: "title",
    mode: "one",
    difficulty: "normal",
    players: [createPlayer(), createPlayer()],
    activePlayer: 0,
    bucketX: FIELD_WIDTH / 2,
    bomberX: 52,
    bomberDirection: 1,
    bomberJukeTimer: 0.85,
    bomberSpeedScale: 1,
    bomberWavePhase: Math.random() * Math.PI * 2,
    bomberSmileTimer: 0,
    bombs: [],
    effects: [],
    spawnTimer: 0.6,
    missTimer: 0,
    nextBombId: 1,
    rngSeed: Math.floor(Math.random() * 2147483646) + 1,
    elapsed: 0,
    message: "Choose options",
  };
}

function createPlayer(): PlayerState {
  return {
    score: 0,
    buckets: MAX_BUCKETS,
    groupIndex: 0,
    groupProgress: 0,
    nextExtraBucketAt: EXTRA_BUCKET_STEP,
    done: false,
    recovery: null,
  };
}

function startNewGame(mode: GameMode, difficulty: Difficulty): GameState {
  return {
    ...createInitialGame(),
    phase: "playing",
    mode,
    difficulty,
    message: mode === "two" ? "Player 1" : "Catch the bombs",
  };
}

function updateGame(game: GameState, input: InputState, deltaSeconds: number): SoundEvent[] {
  const events: SoundEvent[] = [];
  game.elapsed += deltaSeconds;
  game.effects = game.effects
    .map((effect) => ({ ...effect, age: effect.age + deltaSeconds }))
    .filter((effect) => effect.age < effect.duration);

  if (game.bomberSmileTimer > 0) {
    game.bomberSmileTimer = Math.max(0, game.bomberSmileTimer - deltaSeconds);
  }

  if (game.phase === "miss") {
    game.missTimer -= deltaSeconds;
    if (game.missTimer <= 0) {
      finishMissSequence(game, events);
    }
    return events;
  }

  if (game.phase !== "playing") {
    return events;
  }

  const player = getActivePlayer(game);
  const group = BOMB_GROUPS[player.groupIndex];
  const bucketHalfWidth = getBucketWidth(game.difficulty) / 2;
  const stackTop = getBucketStackTop(player.buckets);

  if (!input.pointerActive) {
    const keyboardSpeed = 185;
    if (input.left) {
      game.bucketX -= keyboardSpeed * deltaSeconds;
    }
    if (input.right) {
      game.bucketX += keyboardSpeed * deltaSeconds;
    }
  }
  game.bucketX = clamp(game.bucketX, bucketHalfWidth + 6, FIELD_WIDTH - bucketHalfWidth - 6);

  updateBomberMotion(game, player, deltaSeconds);
  const speedPulse = 1 + Math.sin(game.elapsed * 3.1 + game.bomberWavePhase) * 0.13;
  const bomberSpeed = group.bomberSpeed * Math.max(0.45, game.bomberSpeedScale * speedPulse);
  game.bomberX += bomberSpeed * game.bomberDirection * deltaSeconds;
  if (game.bomberX > FIELD_WIDTH - 34) {
    game.bomberX = FIELD_WIDTH - 34;
    game.bomberDirection = -1;
  } else if (game.bomberX < 34) {
    game.bomberX = 34;
    game.bomberDirection = 1;
  }

  game.spawnTimer -= deltaSeconds;
  if (game.spawnTimer <= 0) {
    game.bombs.push({
      id: game.nextBombId,
      x: game.bomberX,
      y: LANE_Y + 16,
      wobble: (game.nextBombId % 5) - 2,
    });
    game.nextBombId += 1;
    game.spawnTimer += getDropInterval(game);
    events.push("tick");
  }

  const caughtBombIds = new Set<number>();
  for (const bomb of game.bombs) {
    bomb.y += group.fallSpeed * deltaSeconds;
    bomb.x += Math.sin((game.elapsed + bomb.id) * 5.5) * bomb.wobble * deltaSeconds;

    const withinBucketX = Math.abs(bomb.x - game.bucketX) <= bucketHalfWidth + 3;
    const inBucketY = bomb.y + 5 >= stackTop && bomb.y <= GROUND_Y + 3;

    if (withinBucketX && inBucketY) {
      caughtBombIds.add(bomb.id);
      game.effects.push({ type: "splash", x: bomb.x, y: stackTop + 2, age: 0, duration: 0.28 });
      scoreCatch(game, events);
      events.push("catch");
    } else if (bomb.y >= GROUND_Y + 6) {
      triggerMiss(game);
      events.push("miss");
      return events;
    }
  }

  if (caughtBombIds.size > 0) {
    game.bombs = game.bombs.filter((bomb) => !caughtBombIds.has(bomb.id));
  }

  return events;
}

function getDropInterval(game: GameState): number {
  const player = getActivePlayer(game);
  const group = BOMB_GROUPS[player.groupIndex];
  const rhythm = 0.04 * Math.sin(game.nextBombId * 1.7);
  const jitterLimit = Math.min(0.16, group.dropInterval * 0.22);
  const randomJitter = (random01(game) - 0.5) * jitterLimit;

  return Math.max(0.18, group.dropInterval + rhythm + randomJitter);
}

function updateBomberMotion(game: GameState, player: PlayerState, deltaSeconds: number): void {
  game.bomberJukeTimer -= deltaSeconds;

  if (game.bomberJukeTimer > 0) {
    return;
  }

  const groupPressure = player.groupIndex / (BOMB_GROUPS.length - 1);
  game.bomberSpeedScale = 0.68 + random01(game) * (0.72 + groupPressure * 0.28);
  game.bomberWavePhase = random01(game) * Math.PI * 2;

  const farFromEdges = game.bomberX > 58 && game.bomberX < FIELD_WIDTH - 58;
  const jukeChance = 0.22 + groupPressure * 0.24;
  if (farFromEdges && random01(game) < jukeChance) {
    game.bomberDirection = game.bomberDirection === 1 ? -1 : 1;
  }

  const minDelay = 0.24 - groupPressure * 0.07;
  const maxDelay = 1.05 - groupPressure * 0.32;
  game.bomberJukeTimer = minDelay + random01(game) * Math.max(0.2, maxDelay);
}

function random01(game: GameState): number {
  game.rngSeed = (game.rngSeed * 16807) % 2147483647;
  return (game.rngSeed - 1) / 2147483646;
}

function scoreCatch(game: GameState, events: SoundEvent[]): void {
  const player = getActivePlayer(game);
  const group = BOMB_GROUPS[player.groupIndex];
  const previousScore = player.score;
  player.score = Math.min(MAX_SCORE, player.score + group.points);

  while (player.nextExtraBucketAt <= player.score) {
    if (player.buckets < MAX_BUCKETS) {
      player.buckets += 1;
      events.push("extra");
    }
    player.nextExtraBucketAt += EXTRA_BUCKET_STEP;
  }

  if (player.score >= MAX_SCORE && previousScore < MAX_SCORE) {
    game.phase = "maxScore";
    game.bombs = [];
    game.message = `Player ${game.activePlayer + 1} maxed the score`;
    events.push("gameOver");
    return;
  }

  advanceGroupProgress(player);
}

function advanceGroupProgress(player: PlayerState): void {
  player.groupProgress += 1;

  if (player.recovery) {
    player.recovery.remainingBombs -= 1;
    if (player.recovery.remainingBombs <= 0) {
      player.groupIndex = player.recovery.returnGroupIndex;
      player.groupProgress = 0;
      player.recovery = null;
    }
    return;
  }

  const group = BOMB_GROUPS[player.groupIndex];
  if (player.groupProgress >= group.bombs) {
    player.groupIndex = Math.min(player.groupIndex + 1, BOMB_GROUPS.length - 1);
    player.groupProgress = 0;
  }
}

function triggerMiss(game: GameState): void {
  const player = getActivePlayer(game);
  const missedGroupIndex = player.groupIndex;
  const resumeGroupIndex = Math.max(0, missedGroupIndex - 1);

  game.effects.push({ type: "explosion", x: game.bombs[0]?.x ?? game.bucketX, y: GROUND_Y - 6, age: 0, duration: 0.82 });
  game.bombs = [];
  player.buckets = Math.max(0, player.buckets - 1);
  game.bomberSmileTimer = 0.95;
  game.phase = "miss";
  game.missTimer = 1.15;
  game.spawnTimer = 0.72;

  if (missedGroupIndex === 0) {
    player.groupIndex = 0;
    player.groupProgress = 0;
    player.recovery = null;
  } else {
    // Recovery mode: after missing in group N, play half of group N-1 before returning to N.
    player.groupIndex = resumeGroupIndex;
    player.groupProgress = 0;
    player.recovery = {
      returnGroupIndex: missedGroupIndex,
      remainingBombs: Math.ceil(BOMB_GROUPS[resumeGroupIndex].bombs / 2),
    };
  }
}

function finishMissSequence(game: GameState, events: SoundEvent[]): void {
  const player = getActivePlayer(game);

  if (player.buckets > 0) {
    game.phase = "playing";
    game.message = `Player ${game.activePlayer + 1}`;
    return;
  }

  player.done = true;

  if (game.mode === "two") {
    const nextPlayer = game.activePlayer === 0 ? 1 : 0;
    if (!game.players[nextPlayer].done) {
      game.activePlayer = nextPlayer;
      game.bucketX = FIELD_WIDTH / 2;
      game.bombs = [];
      game.effects = [];
      game.phase = "turnReady";
      game.message = `Player ${nextPlayer + 1} ready`;
      return;
    }
  }

  game.phase = "gameOver";
  game.bombs = [];
  game.message = getGameOverMessage(game);
  events.push("gameOver");
}

function getGameOverMessage(game: GameState): string {
  if (game.mode === "one") {
    return "Game over";
  }

  const [playerOne, playerTwo] = game.players;
  if (playerOne.score === playerTwo.score) {
    return "Draw game";
  }

  return playerOne.score > playerTwo.score ? "Player 1 wins" : "Player 2 wins";
}

function handleMenuPointer(game: GameState, event: PointerEvent): boolean {
  if (game.phase !== "title") {
    return false;
  }

  const canvas = event.currentTarget as HTMLCanvasElement;
  const point = getLogicalPoint(canvas, event.clientX, event.clientY);

  if (point.x >= 58 && point.x <= 262 && point.y >= 108 && point.y <= 130) {
    game.mode = game.mode === "one" ? "two" : "one";
    return true;
  }

  if (point.x >= 58 && point.x <= 262 && point.y >= 140 && point.y <= 162) {
    game.difficulty = game.difficulty === "normal" ? "expert" : "normal";
    return true;
  }

  return false;
}

function setBucketFromPointer(
  canvas: HTMLCanvasElement,
  game: GameState,
  input: InputState,
  event: PointerEvent,
): void {
  const point = getLogicalPoint(canvas, event.clientX, event.clientY);
  input.pointerActive = true;
  game.bucketX = point.x;
}

function getLogicalPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();

  return {
    x: clamp(((clientX - rect.left) / rect.width) * FIELD_WIDTH, 0, FIELD_WIDTH),
    y: clamp(((clientY - rect.top) / rect.height) * FIELD_HEIGHT, 0, FIELD_HEIGHT),
  };
}

function renderGame(context: CanvasRenderingContext2D, game: GameState, muted: boolean): void {
  context.save();
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  drawField(context);
  drawHud(context, game, muted);
  drawBomber(context, game.bomberX, LANE_Y, game.bomberSmileTimer > 0);

  for (const bomb of game.bombs) {
    drawBomb(context, bomb, game.elapsed);
  }

  for (const effect of game.effects) {
    if (effect.type === "splash") {
      drawSplash(context, effect);
    } else {
      drawExplosion(context, effect);
    }
  }

  drawBuckets(context, game.bucketX, getActivePlayer(game).buckets, game.difficulty);

  if (game.phase === "title") {
    drawTitleScreen(context, game);
  } else if (game.phase === "paused") {
    drawPanel(context, "PAUSED", "Press P to resume", "#67e8f9");
  } else if (game.phase === "turnReady") {
    drawPanel(context, `PLAYER ${game.activePlayer + 1}`, "Press Enter or click", getPlayerColor(game.activePlayer));
  } else if (game.phase === "gameOver") {
    drawPanel(context, "GAME OVER", `${game.message} - press Enter`, "#ff6f91");
  } else if (game.phase === "maxScore") {
    drawPanel(context, "999999!", "Maximum score - press Enter", "#ffe761");
  }

  context.restore();
}

function drawField(context: CanvasRenderingContext2D): void {
  context.fillStyle = "#050706";
  context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  context.fillStyle = "#535850";
  context.fillRect(8, 21, FIELD_WIDTH - 16, 49);
  context.fillStyle = "#067b0d";
  context.fillRect(8, 70, FIELD_WIDTH - 16, 150);
  context.strokeStyle = "#000000";
  context.lineWidth = 4;
  context.strokeRect(8, 21, FIELD_WIDTH - 16, 199);
  context.fillStyle = "#050706";
  context.fillRect(0, 220, FIELD_WIDTH, 20);
}

function drawHud(context: CanvasRenderingContext2D, game: GameState, muted: boolean): void {
  const playerOne = game.players[0];
  const playerTwo = game.players[1];
  context.font = "bold 10px 'Courier New', monospace";
  context.textBaseline = "top";
  context.fillStyle = getPlayerColor(0);
  context.fillText(`P1 ${formatScore(playerOne.score)}`, 12, 6);

  if (game.mode === "two") {
    context.fillStyle = getPlayerColor(1);
    context.fillText(`P2 ${formatScore(playerTwo.score)}`, 222, 6);
    context.fillStyle = "#ffffff";
    context.fillText(`TURN P${game.activePlayer + 1}`, 132, 6);
  } else {
    context.fillStyle = "#ffffff";
    context.fillText(`GROUP ${getActivePlayer(game).groupIndex + 1}`, 234, 6);
  }

  context.fillStyle = muted ? "#ff6f91" : "#9cff6e";
  context.fillText(muted ? "MUTE" : "SND", 145, 226);
  context.fillStyle = "#8bd5ff";
  context.fillText(game.message.toUpperCase(), 12, 226);
}

function drawTitleScreen(context: CanvasRenderingContext2D, game: GameState): void {
  context.fillStyle = "rgba(5, 7, 6, 0.82)";
  context.fillRect(22, 34, 276, 168);
  context.strokeStyle = "#ffe761";
  context.lineWidth = 2;
  context.strokeRect(22, 34, 276, 168);
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = "#ffe761";
  context.font = "bold 22px 'Courier New', monospace";
  context.fillText("BUCKET BOMBER", FIELD_WIDTH / 2, 47);
  context.font = "bold 8px 'Courier New', monospace";
  context.fillStyle = "#bdefff";
  context.fillText("Pointer or touch moves bucket directly", FIELD_WIDTH / 2, 77);
  context.fillText("Arrows/A-D move  P pause  M mute", FIELD_WIDTH / 2, 89);
  drawOption(context, 58, 108, game.mode === "one" ? "1 PLAYER" : "2 PLAYER ALTERNATING");
  drawOption(context, 58, 140, game.difficulty === "normal" ? "NORMAL BUCKETS" : "EXPERT BUCKETS");
  context.fillStyle = "#ffffff";
  context.fillText("Click field or press Enter/Space", FIELD_WIDTH / 2, 176);
  context.textAlign = "start";
}

function drawOption(context: CanvasRenderingContext2D, x: number, y: number, label: string): void {
  context.fillStyle = "#111722";
  context.fillRect(x, y, 204, 22);
  context.strokeStyle = "#67e8f9";
  context.lineWidth = 1;
  context.strokeRect(x, y, 204, 22);
  context.fillStyle = "#f7fbff";
  context.font = "bold 10px 'Courier New', monospace";
  context.textAlign = "center";
  context.fillText(label, x + 102, y + 7);
}

function drawPanel(context: CanvasRenderingContext2D, title: string, body: string, color: string): void {
  context.fillStyle = "rgba(5, 7, 6, 0.84)";
  context.fillRect(42, 76, 236, 80);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.strokeRect(42, 76, 236, 80);
  context.textAlign = "center";
  context.textBaseline = "top";
  context.font = "bold 18px 'Courier New', monospace";
  context.fillStyle = color;
  context.fillText(title, FIELD_WIDTH / 2, 92);
  context.font = "bold 9px 'Courier New', monospace";
  context.fillStyle = "#ffffff";
  context.fillText(body, FIELD_WIDTH / 2, 124);
  context.textAlign = "start";
}

function drawBomber(context: CanvasRenderingContext2D, x: number, y: number, smiling: boolean): void {
  const left = Math.round(x - 12);
  const top = Math.round(y - 16);
  context.fillStyle = "#d99755";
  context.fillRect(left + 5, top + 8, 14, 12);
  context.fillStyle = "#151515";
  context.fillRect(left + 2, top + 5, 20, 4);
  context.fillStyle = "#bfa32a";
  context.fillRect(left + 6, top + 2, 12, 3);
  context.fillStyle = "#14191d";
  context.fillRect(left + 4, top + 20, 16, 22);
  context.fillStyle = "#e8e8e8";
  for (let row = 0; row < 4; row += 1) {
    context.fillRect(left + 4, top + 22 + row * 5, 16, 2);
  }
  context.fillStyle = "#151515";
  context.fillRect(left + 7, top + 11, 3, 3);
  context.fillRect(left + 15, top + 11, 3, 3);
  context.strokeStyle = "#20120c";
  context.lineWidth = 2;
  context.beginPath();
  if (smiling) {
    context.moveTo(left + 8, top + 17);
    context.lineTo(left + 12, top + 19);
    context.lineTo(left + 17, top + 17);
  } else {
    context.moveTo(left + 8, top + 19);
    context.lineTo(left + 12, top + 17);
    context.lineTo(left + 17, top + 19);
  }
  context.stroke();
  context.fillStyle = "#d99755";
  context.fillRect(left + 1, top + 31, 4, 9);
  context.fillRect(left + 19, top + 31, 4, 9);
}

function drawBomb(context: CanvasRenderingContext2D, bomb: Bomb, elapsed: number): void {
  const x = Math.round(bomb.x);
  const y = Math.round(bomb.y);
  context.fillStyle = "#0b0d0f";
  context.fillRect(x - 5, y - 4, 10, 8);
  context.fillRect(x - 3, y - 6, 6, 12);
  context.fillStyle = "#2b3134";
  context.fillRect(x - 7, y - 1, 14, 3);
  context.fillStyle = "#050505";
  context.fillRect(x - 2, y + 5, 4, 3);
  context.fillStyle = "#7a8487";
  context.fillRect(x + 1, y - 10, 3, 5);
  context.fillStyle = Math.sin(elapsed * 18 + bomb.id) > 0 ? "#fff3a6" : "#ff6f3d";
  context.fillRect(x + 4, y - 12, 3, 3);
}

function drawBuckets(context: CanvasRenderingContext2D, x: number, count: number, difficulty: Difficulty): void {
  const width = getBucketWidth(difficulty);
  const half = width / 2;
  for (let index = 0; index < count; index += 1) {
    const y = GROUND_Y - 10 - index * 15;
    context.fillStyle = "#996c12";
    context.fillRect(Math.round(x - half - 4), y + 6, width + 8, 5);
    context.fillStyle = "#d2a11c";
    context.fillRect(Math.round(x - half), y, width, 4);
    context.fillStyle = "#2ab23d";
    context.fillRect(Math.round(x - half + 7), y + 3, Math.max(5, width / 4), 9);
    context.fillRect(Math.round(x + half - width / 4 - 7), y + 3, Math.max(5, width / 4), 9);
    context.fillStyle = "#8bd5ff";
    context.fillRect(Math.round(x - half + 3), y - 3, width - 6, 2);
  }
}

function drawSplash(context: CanvasRenderingContext2D, effect: Effect): void {
  const progress = effect.age / effect.duration;
  context.fillStyle = "#8bd5ff";
  context.fillRect(effect.x - 10 - progress * 6, effect.y - 3 - progress * 7, 8, 2);
  context.fillRect(effect.x + 2 + progress * 7, effect.y - 5 - progress * 5, 8, 2);
  context.fillRect(effect.x - 3, effect.y - 9 - progress * 8, 6, 3);
}

function drawExplosion(context: CanvasRenderingContext2D, effect: Effect): void {
  const progress = effect.age / effect.duration;
  const radius = 6 + progress * 24;
  context.strokeStyle = progress < 0.45 ? "#ffe761" : "#ff6f3d";
  context.lineWidth = 3;
  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10;
    const inner = radius * 0.28;
    context.beginPath();
    context.moveTo(effect.x + Math.cos(angle) * inner, effect.y + Math.sin(angle) * inner);
    context.lineTo(effect.x + Math.cos(angle) * radius, effect.y + Math.sin(angle) * radius);
    context.stroke();
  }
}

function getBucketStackTop(bucketCount: number): number {
  return GROUND_Y - 13 - Math.max(0, bucketCount - 1) * 15;
}

function getBucketWidth(difficulty: Difficulty): number {
  return difficulty === "expert" ? 24 : 48;
}

function getActivePlayer(game: GameState): PlayerState {
  return game.players[game.activePlayer];
}

function getPlayerColor(playerIndex: 0 | 1): string {
  return playerIndex === 0 ? "#ffe761" : "#ff6f91";
}

function formatScore(score: number): string {
  return String(score).padStart(6, "0");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createAudio(): BucketBomberAudio {
  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = false;

  const ensureContext = (): AudioContext | null => {
    if (!AudioContextConstructor) {
      return null;
    }

    if (!context) {
      context = new AudioContextConstructor();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.28;
      master.connect(context.destination);
    }

    return context;
  };

  const tone = (frequency: number, duration: number, type: OscillatorType, gain = 0.14, delay = 0) => {
    const ctx = ensureContext();
    if (!ctx || !master || muted) {
      return;
    }

    const startAt = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
  };

  const noise = (duration: number, gain = 0.18) => {
    const ctx = ensureContext();
    if (!ctx || !master || muted) {
      return;
    }

    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }

    const source = ctx.createBufferSource();
    const envelope = ctx.createGain();
    envelope.gain.value = gain;
    source.buffer = buffer;
    source.connect(envelope);
    envelope.connect(master);
    source.start();
  };

  return {
    unlock() {
      const ctx = ensureContext();
      if (ctx?.state === "suspended") {
        void ctx.resume();
      }
    },
    play(event) {
      if (event === "start") {
        tone(330, 0.09, "square", 0.12);
        tone(660, 0.1, "square", 0.1, 0.08);
      } else if (event === "catch") {
        tone(540, 0.05, "triangle", 0.1);
        tone(780, 0.07, "square", 0.08, 0.04);
      } else if (event === "tick") {
        tone(1250, 0.035, "square", 0.035);
      } else if (event === "miss") {
        noise(0.28, 0.22);
        tone(86, 0.32, "sawtooth", 0.2);
      } else if (event === "extra") {
        tone(510, 0.08, "square", 0.09);
        tone(760, 0.09, "square", 0.09, 0.08);
        tone(1020, 0.12, "square", 0.08, 0.16);
      } else if (event === "gameOver") {
        tone(280, 0.16, "triangle", 0.12);
        tone(140, 0.32, "triangle", 0.12, 0.15);
      }
    },
    setMuted(nextMuted) {
      muted = nextMuted;
      if (master) {
        master.gain.value = muted ? 0 : 0.28;
      }
    },
    destroy() {
      master?.disconnect();
      void context?.close();
      context = null;
      master = null;
    },
  };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
