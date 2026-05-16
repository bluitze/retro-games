import { useEffect, useRef, useState } from "react";
import "./styles.css";

const FIELD_WIDTH = 448;
const FIELD_HEIGHT = 560;
const PLAY_LEFT = 22;
const PLAY_RIGHT = FIELD_WIDTH - 22;
const PLAY_TOP = 58;
const PADDLE_Y = 514;
const PADDLE_HEIGHT = 8;
const PADDLE_FULL_WIDTH = 72;
const PADDLE_SMALL_WIDTH = PADDLE_FULL_WIDTH / 2;
const PADDLE_SPEED = 310;
const BALL_RADIUS = 5;
const STARTING_TURNS = 3;
const MAX_WALLS = 2;
const BRICK_COLUMNS = 14;
const BRICK_ROWS = 8;
const BRICK_WIDTH = 28;
const BRICK_HEIGHT = 16;
const BRICK_GAP = 1;
const BRICK_START_X = (FIELD_WIDTH - BRICK_COLUMNS * BRICK_WIDTH) / 2;
const BRICK_START_Y = 104;
const STARTING_BALL_SPEED = 218;

type BrickColor = "red" | "orange" | "green" | "yellow";
type GamePhase = "title" | "ready" | "playing" | "paused" | "lifeLost" | "gameOver" | "won";
type SoundEvent = "serve" | "paddle" | "wall" | "brick" | "miss" | "wallClear" | "gameOver" | "win";

type Brick = {
  active: boolean;
  color: BrickColor;
  points: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

type SpeedMilestones = {
  contacts4: boolean;
  contacts12: boolean;
  orange: boolean;
  red: boolean;
};

type GameState = {
  phase: GamePhase;
  score: number;
  turns: number;
  wallNumber: number;
  bricks: Brick[];
  paddleX: number;
  paddleWidth: number;
  ball: Ball;
  ballSpeed: number;
  serveDirection: 1 | -1;
  contactCount: number;
  speedMilestones: SpeedMilestones;
  reachedRedRegion: boolean;
  paddleShrunk: boolean;
  messageTimer: number;
};

type InputState = {
  left: boolean;
  right: boolean;
  pointerActive: boolean;
};

type BrickBreakerAudio = {
  unlock: () => void;
  play: (event: SoundEvent, brick?: BrickColor) => void;
  setMuted: (muted: boolean) => void;
  destroy: () => void;
};

export function BrickWallBreakerGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<BrickBreakerAudio | null>(null);
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
    audio.setMuted(mutedRef.current);
    audioRef.current = audio;
    const input: InputState = { left: false, right: false, pointerActive: false };
    let game = createInitialGame();
    let lastTime = performance.now();
    let animationId = 0;

    const serveOrRestart = () => {
      audio.unlock();

      if (game.phase === "title" || game.phase === "gameOver" || game.phase === "won") {
        game = serveBall(createNewGame());
        audio.play("serve");
        return;
      }

      if (game.phase === "ready" || game.phase === "lifeLost") {
        game = serveBall(game);
        audio.play("serve");
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
        ].includes(event.code)
      ) {
        event.preventDefault();
      }

      if (event.code === "ArrowLeft" || event.code === "KeyA") {
        input.left = true;
        input.pointerActive = false;
        audio.unlock();
        return;
      }

      if (event.code === "ArrowRight" || event.code === "KeyD") {
        input.right = true;
        input.pointerActive = false;
        audio.unlock();
        return;
      }

      if (event.repeat) {
        return;
      }

      if (event.code === "Enter" || event.code === "Space") {
        serveOrRestart();
        return;
      }

      if (event.code === "KeyP") {
        audio.unlock();
        if (game.phase === "playing") {
          game.phase = "paused";
        } else if (game.phase === "paused") {
          game.phase = "playing";
        }
        return;
      }

      if (event.code === "KeyR") {
        audio.unlock();
        game = createNewGame();
        return;
      }

      if (event.code === "KeyM") {
        audio.unlock();
        toggleMute();
      }
    };

    const keyUp = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft" || event.code === "KeyA") {
        input.left = false;
      } else if (event.code === "ArrowRight" || event.code === "KeyD") {
        input.right = false;
      }
    };

    const movePaddleFromPointer = (event: PointerEvent) => {
      const point = getLogicalPoint(canvas, event.clientX, event.clientY);
      input.pointerActive = true;
      game.paddleX = clamp(point.x, PLAY_LEFT + game.paddleWidth / 2, PLAY_RIGHT - game.paddleWidth / 2);

      if (game.phase === "ready" || game.phase === "lifeLost") {
        lockBallToPaddle(game);
      }
    };

    const pointerDown = (event: PointerEvent) => {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      audio.unlock();
      movePaddleFromPointer(event);
      serveOrRestart();
    };

    const pointerMove = (event: PointerEvent) => {
      event.preventDefault();
      movePaddleFromPointer(event);
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
      renderGame(context, game, mutedRef.current);

      for (const event of events) {
        audio.play(event.type, event.brickColor);
      }

      animationId = requestAnimationFrame(frame);
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);

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
    audioRef.current?.unlock();
    audioRef.current?.setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  return (
    <div className="brick-wall-breaker" aria-label="Brick Wall Breaker game">
      <canvas
        ref={canvasRef}
        className="game-canvas brick-wall-breaker__canvas"
        aria-label="Brick Wall Breaker play field"
      />
      <button type="button" className="brick-wall-breaker__mute" onClick={toggleMuteButton}>
        {isMuted ? "Unmute" : "Mute"}
      </button>
    </div>
  );
}

function createInitialGame(): GameState {
  const game = createNewGame();
  game.phase = "title";
  return game;
}

function createNewGame(): GameState {
  const game: GameState = {
    phase: "ready",
    score: 0,
    turns: STARTING_TURNS,
    wallNumber: 1,
    bricks: createWall(),
    paddleX: FIELD_WIDTH / 2,
    paddleWidth: PADDLE_FULL_WIDTH,
    ball: createReadyBall(FIELD_WIDTH / 2),
    ballSpeed: STARTING_BALL_SPEED,
    serveDirection: 1,
    contactCount: 0,
    speedMilestones: createSpeedMilestones(),
    reachedRedRegion: false,
    paddleShrunk: false,
    messageTimer: 0,
  };
  lockBallToPaddle(game);
  return game;
}

function createWall(): Brick[] {
  const bricks: Brick[] = [];

  for (let row = 0; row < BRICK_ROWS; row += 1) {
    const color = getRowColor(row);
    for (let column = 0; column < BRICK_COLUMNS; column += 1) {
      bricks.push({
        active: true,
        color,
        points: getBrickPoints(color),
        x: BRICK_START_X + column * BRICK_WIDTH,
        y: BRICK_START_Y + row * (BRICK_HEIGHT + BRICK_GAP),
        width: BRICK_WIDTH - BRICK_GAP,
        height: BRICK_HEIGHT,
      });
    }
  }

  return bricks;
}

function createSpeedMilestones(): SpeedMilestones {
  return {
    contacts4: false,
    contacts12: false,
    orange: false,
    red: false,
  };
}

function createReadyBall(paddleX: number): Ball {
  return {
    x: paddleX,
    y: PADDLE_Y - BALL_RADIUS - 1,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
  };
}

function serveBall(game: GameState): GameState {
  game.phase = "playing";
  game.ballSpeed = STARTING_BALL_SPEED;
  game.contactCount = 0;
  game.speedMilestones = createSpeedMilestones();
  game.reachedRedRegion = false;
  game.paddleShrunk = false;
  game.paddleWidth = PADDLE_FULL_WIDTH;
  lockBallToPaddle(game);

  const horizontalVelocity = 86 * game.serveDirection;
  const verticalVelocity = Math.sqrt(game.ballSpeed * game.ballSpeed - horizontalVelocity * horizontalVelocity);
  game.ball.vx = horizontalVelocity;
  game.ball.vy = -verticalVelocity;
  game.serveDirection = game.serveDirection === 1 ? -1 : 1;
  return game;
}

function updateGame(
  game: GameState,
  input: InputState,
  deltaSeconds: number,
): Array<{ type: SoundEvent; brickColor?: BrickColor }> {
  const events: Array<{ type: SoundEvent; brickColor?: BrickColor }> = [];

  if (game.messageTimer > 0) {
    game.messageTimer = Math.max(0, game.messageTimer - deltaSeconds);
  }

  if (game.phase === "ready" || game.phase === "lifeLost") {
    updatePaddle(game, input, deltaSeconds);
    lockBallToPaddle(game);
    return events;
  }

  if (game.phase !== "playing") {
    return events;
  }

  updatePaddle(game, input, deltaSeconds);

  const previousX = game.ball.x;
  const previousY = game.ball.y;
  game.ball.x += game.ball.vx * deltaSeconds;
  game.ball.y += game.ball.vy * deltaSeconds;

  resolveWallCollisions(game, events);
  resolvePaddleCollision(game, events);
  resolveBrickCollision(game, previousX, previousY, events);

  if (game.bricks.every((brick) => !brick.active)) {
    if (game.wallNumber >= MAX_WALLS) {
      game.phase = "won";
      game.messageTimer = 0;
      events.push({ type: "win" });
    } else {
      game.wallNumber += 1;
      game.bricks = createWall();
      game.phase = "ready";
      game.paddleX = FIELD_WIDTH / 2;
      game.paddleWidth = PADDLE_FULL_WIDTH;
      game.paddleShrunk = false;
      lockBallToPaddle(game);
      events.push({ type: "wallClear" });
    }
    return events;
  }

  if (game.ball.y - game.ball.radius > FIELD_HEIGHT + 8) {
    game.turns = Math.max(0, game.turns - 1);
    game.paddleX = FIELD_WIDTH / 2;
    game.paddleWidth = PADDLE_FULL_WIDTH;
    game.paddleShrunk = false;
    game.messageTimer = 0.95;
    lockBallToPaddle(game);
    events.push({ type: "miss" });

    if (game.turns <= 0) {
      game.phase = "gameOver";
      events.push({ type: "gameOver" });
    } else {
      game.phase = "lifeLost";
    }
  }

  return events;
}

function updatePaddle(game: GameState, input: InputState, deltaSeconds: number): void {
  if (!input.pointerActive) {
    if (input.left) {
      game.paddleX -= PADDLE_SPEED * deltaSeconds;
    }
    if (input.right) {
      game.paddleX += PADDLE_SPEED * deltaSeconds;
    }
  }

  game.paddleX = clamp(game.paddleX, PLAY_LEFT + game.paddleWidth / 2, PLAY_RIGHT - game.paddleWidth / 2);
}

function lockBallToPaddle(game: GameState): void {
  game.ball.x = game.paddleX;
  game.ball.y = PADDLE_Y - game.ball.radius - 1;
  game.ball.vx = 0;
  game.ball.vy = 0;
}

function resolveWallCollisions(
  game: GameState,
  events: Array<{ type: SoundEvent; brickColor?: BrickColor }>,
): void {
  const ball = game.ball;

  if (ball.x - ball.radius <= PLAY_LEFT) {
    ball.x = PLAY_LEFT + ball.radius;
    ball.vx = Math.abs(ball.vx);
    registerContact(game, events, "wall");
  } else if (ball.x + ball.radius >= PLAY_RIGHT) {
    ball.x = PLAY_RIGHT - ball.radius;
    ball.vx = -Math.abs(ball.vx);
    registerContact(game, events, "wall");
  }

  if (ball.y - ball.radius <= PLAY_TOP) {
    ball.y = PLAY_TOP + ball.radius;
    ball.vy = Math.abs(ball.vy);
    registerContact(game, events, "wall");

    if (game.reachedRedRegion && !game.paddleShrunk) {
      game.paddleShrunk = true;
      game.paddleWidth = PADDLE_SMALL_WIDTH;
      game.paddleX = clamp(game.paddleX, PLAY_LEFT + game.paddleWidth / 2, PLAY_RIGHT - game.paddleWidth / 2);
      game.messageTimer = 1.2;
    }
  }
}

function resolvePaddleCollision(
  game: GameState,
  events: Array<{ type: SoundEvent; brickColor?: BrickColor }>,
): void {
  const ball = game.ball;

  if (ball.vy <= 0) {
    return;
  }

  const paddleLeft = game.paddleX - game.paddleWidth / 2;
  const paddleRight = game.paddleX + game.paddleWidth / 2;
  const ballBottom = ball.y + ball.radius;
  const ballTop = ball.y - ball.radius;

  if (ball.x < paddleLeft - ball.radius || ball.x > paddleRight + ball.radius) {
    return;
  }

  if (ballBottom < PADDLE_Y || ballTop > PADDLE_Y + PADDLE_HEIGHT) {
    return;
  }

  const hitOffset = clamp((ball.x - game.paddleX) / (game.paddleWidth / 2), -1, 1);
  const maxAngle = Math.PI * 0.37;
  const angle = hitOffset * maxAngle;
  const speed = getBallSpeed(ball);
  ball.x = clamp(ball.x, PLAY_LEFT + ball.radius, PLAY_RIGHT - ball.radius);
  ball.y = PADDLE_Y - ball.radius - 1;
  ball.vx = Math.sin(angle) * speed;
  ball.vy = -Math.cos(angle) * speed;
  registerContact(game, events, "paddle");
}

function resolveBrickCollision(
  game: GameState,
  previousX: number,
  previousY: number,
  events: Array<{ type: SoundEvent; brickColor?: BrickColor }>,
): void {
  const ball = game.ball;

  for (const brick of game.bricks) {
    if (!brick.active || !circleIntersectsRect(ball, brick)) {
      continue;
    }

    brick.active = false;
    game.score += brick.points;

    if (brick.color === "orange" && !game.speedMilestones.orange) {
      game.speedMilestones.orange = true;
      increaseBallSpeed(game, 1.14);
    }

    if (brick.color === "red" && !game.speedMilestones.red) {
      game.speedMilestones.red = true;
      game.reachedRedRegion = true;
      increaseBallSpeed(game, 1.16);
    }

    resolveBrickBounce(game, brick, previousX, previousY);
    registerContact(game, events, "brick", brick.color);
    return;
  }
}

function circleIntersectsRect(ball: Ball, brick: Brick): boolean {
  const closestX = clamp(ball.x, brick.x, brick.x + brick.width);
  const closestY = clamp(ball.y, brick.y, brick.y + brick.height);
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return dx * dx + dy * dy <= ball.radius * ball.radius;
}

function resolveBrickBounce(game: GameState, brick: Brick, previousX: number, previousY: number): void {
  const ball = game.ball;
  const brickRight = brick.x + brick.width;
  const brickBottom = brick.y + brick.height;

  if (previousY + ball.radius <= brick.y) {
    ball.y = brick.y - ball.radius - 0.1;
    ball.vy = -Math.abs(ball.vy);
    return;
  }

  if (previousY - ball.radius >= brickBottom) {
    ball.y = brickBottom + ball.radius + 0.1;
    ball.vy = Math.abs(ball.vy);
    return;
  }

  if (previousX + ball.radius <= brick.x) {
    ball.x = brick.x - ball.radius - 0.1;
    ball.vx = -Math.abs(ball.vx);
    return;
  }

  if (previousX - ball.radius >= brickRight) {
    ball.x = brickRight + ball.radius + 0.1;
    ball.vx = Math.abs(ball.vx);
    return;
  }

  const overlaps = [
    { axis: "x" as const, amount: ball.x + ball.radius - brick.x, direction: -1 },
    { axis: "x" as const, amount: brickRight - (ball.x - ball.radius), direction: 1 },
    { axis: "y" as const, amount: ball.y + ball.radius - brick.y, direction: -1 },
    { axis: "y" as const, amount: brickBottom - (ball.y - ball.radius), direction: 1 },
  ].sort((a, b) => a.amount - b.amount);
  const shallowest = overlaps[0];

  if (shallowest.axis === "x") {
    ball.vx = Math.abs(ball.vx) * shallowest.direction;
  } else {
    ball.vy = Math.abs(ball.vy) * shallowest.direction;
  }
}

function registerContact(
  game: GameState,
  events: Array<{ type: SoundEvent; brickColor?: BrickColor }>,
  type: "paddle" | "wall" | "brick",
  brickColor?: BrickColor,
): void {
  game.contactCount += 1;

  if (game.contactCount >= 4 && !game.speedMilestones.contacts4) {
    game.speedMilestones.contacts4 = true;
    increaseBallSpeed(game, 1.1);
  }

  if (game.contactCount >= 12 && !game.speedMilestones.contacts12) {
    game.speedMilestones.contacts12 = true;
    increaseBallSpeed(game, 1.12);
  }

  events.push({ type, brickColor });
}

function increaseBallSpeed(game: GameState, multiplier: number): void {
  const currentSpeed = getBallSpeed(game.ball);

  if (currentSpeed <= 0) {
    return;
  }

  const nextSpeed = Math.min(410, currentSpeed * multiplier);
  const scale = nextSpeed / currentSpeed;
  game.ball.vx *= scale;
  game.ball.vy *= scale;
  game.ballSpeed = nextSpeed;
}

function getBallSpeed(ball: Ball): number {
  return Math.hypot(ball.vx, ball.vy);
}

function getRowColor(row: number): BrickColor {
  if (row <= 1) {
    return "red";
  }
  if (row <= 3) {
    return "orange";
  }
  if (row <= 5) {
    return "green";
  }
  return "yellow";
}

function getBrickPoints(color: BrickColor): number {
  if (color === "red") {
    return 7;
  }
  if (color === "orange") {
    return 5;
  }
  if (color === "green") {
    return 3;
  }
  return 1;
}

function getBrickColor(color: BrickColor): string {
  if (color === "red") {
    return "#f04438";
  }
  if (color === "orange") {
    return "#f58b28";
  }
  if (color === "green") {
    return "#39b54a";
  }
  return "#f7d94a";
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
  drawPlayfield(context);
  drawHud(context, game, muted);
  drawBricks(context, game.bricks);
  drawPaddle(context, game);
  drawBall(context, game.ball);

  if (game.messageTimer > 0 && game.paddleShrunk) {
    drawSmallMessage(context, "SMALL PADDLE");
  }

  if (game.phase === "title") {
    drawPanel(context, "BRICK WALL BREAKER", "Press Enter, Space, or click", "#f7d94a");
  } else if (game.phase === "ready") {
    drawPanel(context, `WALL ${game.wallNumber}`, "Press Enter, Space, or click", "#ffffff");
  } else if (game.phase === "paused") {
    drawPanel(context, "PAUSED", "Press P to resume", "#67e8f9");
  } else if (game.phase === "lifeLost") {
    drawPanel(context, "TURN LOST", "Press Enter, Space, or click", "#f58b28");
  } else if (game.phase === "gameOver") {
    drawPanel(context, "GAME OVER", "Press Enter or Space", "#f04438");
  } else if (game.phase === "won") {
    drawPanel(context, "YOU WIN", "Two walls cleared", "#39b54a");
  }

  context.restore();
}

function drawPlayfield(context: CanvasRenderingContext2D): void {
  context.fillStyle = "#000000";
  context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  context.fillStyle = "#ffffff";
  context.fillRect(PLAY_LEFT - 4, PLAY_TOP - 4, PLAY_RIGHT - PLAY_LEFT + 8, 4);
  context.fillRect(PLAY_LEFT - 4, PLAY_TOP - 4, 4, FIELD_HEIGHT - PLAY_TOP - 28);
  context.fillRect(PLAY_RIGHT, PLAY_TOP - 4, 4, FIELD_HEIGHT - PLAY_TOP - 28);
}

function drawHud(context: CanvasRenderingContext2D, game: GameState, muted: boolean): void {
  context.fillStyle = "#ffffff";
  context.font = "bold 14px 'Courier New', monospace";
  context.textBaseline = "top";
  context.textAlign = "left";
  context.fillText(`SCORE ${String(game.score).padStart(3, "0")}`, PLAY_LEFT, 18);
  context.textAlign = "center";
  context.fillText(`WALL ${game.wallNumber}/${MAX_WALLS}`, FIELD_WIDTH / 2, 18);
  context.textAlign = "right";
  context.fillText(`TURNS ${game.turns}`, PLAY_RIGHT, 18);

  context.fillStyle = muted ? "#f04438" : "#7df57a";
  context.font = "bold 10px 'Courier New', monospace";
  context.fillText(muted ? "MUTE" : "SND", PLAY_RIGHT, 40);
  context.textAlign = "left";
}

function drawBricks(context: CanvasRenderingContext2D, bricks: Brick[]): void {
  for (const brick of bricks) {
    if (!brick.active) {
      continue;
    }

    context.fillStyle = getBrickColor(brick.color);
    context.fillRect(brick.x, brick.y, brick.width, brick.height);
    context.fillStyle = "rgba(255, 255, 255, 0.22)";
    context.fillRect(brick.x, brick.y, brick.width, 2);
  }
}

function drawPaddle(context: CanvasRenderingContext2D, game: GameState): void {
  context.fillStyle = "#ffffff";
  context.fillRect(Math.round(game.paddleX - game.paddleWidth / 2), PADDLE_Y, game.paddleWidth, PADDLE_HEIGHT);
}

function drawBall(context: CanvasRenderingContext2D, ball: Ball): void {
  context.fillStyle = "#ffffff";
  context.fillRect(Math.round(ball.x - ball.radius), Math.round(ball.y - ball.radius), ball.radius * 2, ball.radius * 2);
}

function drawPanel(context: CanvasRenderingContext2D, title: string, body: string, color: string): void {
  context.fillStyle = "rgba(0, 0, 0, 0.84)";
  context.fillRect(72, 230, 304, 94);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.strokeRect(72, 230, 304, 94);
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = color;
  context.font = "bold 20px 'Courier New', monospace";
  context.fillText(title, FIELD_WIDTH / 2, 250);
  context.fillStyle = "#ffffff";
  context.font = "bold 11px 'Courier New', monospace";
  context.fillText(body, FIELD_WIDTH / 2, 288);
  context.textAlign = "left";
}

function drawSmallMessage(context: CanvasRenderingContext2D, message: string): void {
  context.fillStyle = "#ffffff";
  context.font = "bold 11px 'Courier New', monospace";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(message, FIELD_WIDTH / 2, 472);
  context.textAlign = "left";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createAudio(): BrickBreakerAudio {
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
      master.gain.value = muted ? 0 : 0.26;
      master.connect(context.destination);
    }

    return context;
  };

  const tone = (frequency: number, duration: number, type: OscillatorType, gain = 0.12, delay = 0): void => {
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
    envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  };

  const brickTone = (color?: BrickColor): void => {
    const frequency = color === "red" ? 740 : color === "orange" ? 620 : color === "green" ? 500 : 390;
    tone(frequency, 0.055, "square", 0.09);
  };

  return {
    unlock() {
      const ctx = ensureContext();
      if (ctx?.state === "suspended") {
        void ctx.resume();
      }
    },
    play(event, brick) {
      if (event === "serve") {
        tone(330, 0.07, "square", 0.11);
        tone(500, 0.08, "square", 0.09, 0.06);
      } else if (event === "paddle") {
        tone(220, 0.045, "square", 0.1);
      } else if (event === "wall") {
        tone(300, 0.035, "square", 0.065);
      } else if (event === "brick") {
        brickTone(brick);
      } else if (event === "miss") {
        tone(130, 0.18, "sawtooth", 0.18);
        tone(82, 0.28, "triangle", 0.12, 0.12);
      } else if (event === "wallClear") {
        tone(440, 0.08, "square", 0.1);
        tone(660, 0.1, "square", 0.1, 0.08);
        tone(880, 0.12, "square", 0.09, 0.16);
      } else if (event === "gameOver") {
        tone(240, 0.15, "triangle", 0.12);
        tone(150, 0.24, "triangle", 0.12, 0.14);
      } else if (event === "win") {
        tone(520, 0.09, "square", 0.11);
        tone(780, 0.11, "square", 0.1, 0.08);
        tone(1040, 0.16, "square", 0.09, 0.18);
      }
    },
    setMuted(nextMuted) {
      muted = nextMuted;
      if (master) {
        master.gain.value = muted ? 0 : 0.26;
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
