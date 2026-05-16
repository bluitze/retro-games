import { useEffect, useRef } from "react";
import { FIELD_HEIGHT, FIELD_WIDTH } from "./game/constants";
import { createRiverPatrolAudio } from "./game/audio";
import { createGame, updateGame } from "./game/game";
import { createInput } from "./game/input";
import { renderGame } from "./game/render";
import "./styles.css";

const HIGH_SCORE_KEY = "retro-games:river-patrol:high-score";

export function RiverPatrolGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return undefined;
    }

    canvas.width = FIELD_WIDTH;
    canvas.height = FIELD_HEIGHT;
    context.imageSmoothingEnabled = false;

    const audio = createRiverPatrolAudio();
    const input = createInput(window, audio.unlock);
    const game = createGame(readHighScore());
    let lastTime = performance.now();
    let animationId = 0;
    let savedHighScore = game.highScore;

    const frame = (time: number) => {
      const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      if (input.consumePressed("KeyM")) {
        audio.toggleMute();
      }

      const events = updateGame(game, input, deltaSeconds);

      if (game.highScore > savedHighScore) {
        writeHighScore(game.highScore);
        savedHighScore = game.highScore;
      }

      for (const event of events) {
        audio.play(event);
      }

      audio.updateEngine(game.throttle, game.speed, game.status);
      renderGame(context, game, time / 1000, audio.isMuted());
      input.finishFrame();
      animationId = requestAnimationFrame(frame);
    };

    renderGame(context, game, performance.now() / 1000, audio.isMuted());
    animationId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationId);
      writeHighScore(game.highScore);
      input.destroy();
      audio.destroy();
    };
  }, []);

  return (
    <div className="river-patrol" aria-label="River Patrol game">
      <canvas
        ref={canvasRef}
        className="game-canvas river-patrol__canvas"
        aria-label="River Patrol play field"
      />
    </div>
  );
}

function readHighScore(): number {
  try {
    const stored = window.localStorage.getItem(HIGH_SCORE_KEY);
    return stored ? Number.parseInt(stored, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeHighScore(highScore: number): void {
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}
