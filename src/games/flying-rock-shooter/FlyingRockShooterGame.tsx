import { useEffect, useRef } from "react";
import { createGame, resizeGame, updateGame } from "./game/game";
import { createInput } from "./game/input";
import { renderGame } from "./game/render";

export function FlyingRockShooterGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("2D canvas context not supported.");
    }

    const input = createInput(window);
    const game = createGame(960, 640);
    let lastTime = performance.now();
    let animationId = 0;
    let observer: ResizeObserver | null = null;

    const resizeCanvas = () => {
      const host = canvas.parentElement;
      const rect = host?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(320, Math.floor(rect.height));
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      resizeGame(game, width, height);
    };

    const frame = (time: number) => {
      const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      updateGame(game, input, deltaSeconds, time / 1000);
      renderGame(context, game, time / 1000);
      input.finishFrame();

      animationId = requestAnimationFrame(frame);
    };

    window.addEventListener("resize", resizeCanvas);
    if ("ResizeObserver" in window && canvas.parentElement) {
      observer = new ResizeObserver(resizeCanvas);
      observer.observe(canvas.parentElement);
    }
    resizeCanvas();
    animationId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationId);
      input.destroy();
      observer?.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="game-canvas game-canvas--fill" aria-label="Space Rock Shooter game canvas" />;
}
