import { useEffect, useRef } from "react";
import { Game } from "./game/game";
import { bindInput } from "./game/input";

export function MissleShooterGame() {
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

    const game = new Game(960, 640);
    const destroyInput = bindInput(canvas, (command) => {
      game.queueCommand(command);
    });
    let lastFrameTime = performance.now();
    let animationId = 0;
    let observer: ResizeObserver | null = null;

    const resizeCanvas = () => {
      const host = canvas.parentElement;
      const rect = host?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(320, Math.floor(rect.height));

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      game.resize(width, height);
    };

    const frame = (now: number) => {
      const deltaSeconds = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      game.update(deltaSeconds);
      game.render(context);
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
      destroyInput();
      observer?.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="game-canvas game-canvas--fill game-canvas--missile" aria-label="Missile Shooter game canvas" />;
}
