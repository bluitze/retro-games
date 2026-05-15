import { useEffect, useRef } from "react";
import { TICK_RATE } from "./game/config";
import { createInputState, updateDirectionIntents } from "./game/input";
import { render } from "./game/render";
import { createInitialGameState, resetMatch, resetRound } from "./game/state";
import { updateGame } from "./game/update";

export function LightCycleGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is not available.");
    }

    let game = createInitialGameState();
    const input = createInputState();
    const tickDuration = 1000 / TICK_RATE;
    let accumulator = 0;
    let previousTime = performance.now();
    let animationId = 0;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      const width = Math.floor(rect.width * pixelRatio);
      const height = Math.floor(rect.height * pixelRatio);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        ["Space", "KeyP", "KeyR", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          event.code,
        )
      ) {
        event.preventDefault();
      }

      if (event.repeat) {
        updateDirectionIntents(game, input, event.code);
        return;
      }

      if (event.code === "Space") {
        if (game.phase === "ready" || game.phase === "round-over") {
          game = resetRound(game);
        }
        return;
      }

      if (event.code === "KeyP") {
        if (game.phase === "playing") {
          game.phase = "paused";
        } else if (game.phase === "paused") {
          game.phase = "playing";
        }
        return;
      }

      if (event.code === "KeyR") {
        game = resetMatch();
        return;
      }

      updateDirectionIntents(game, input, event.code);
    };

    const frame = (time: DOMHighResTimeStamp) => {
      resizeCanvas();

      const elapsed = Math.min(time - previousTime, 250);
      previousTime = time;
      accumulator += elapsed;

      while (accumulator >= tickDuration) {
        game = updateGame(game, input);
        accumulator -= tickDuration;
      }

      render(context, game, canvas.width, canvas.height);
      animationId = requestAnimationFrame(frame);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    render(context, game, canvas.width, canvas.height);
    animationId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="game-canvas game-canvas--light-cycle" aria-label="Light Cycle Arena game canvas" />;
}
