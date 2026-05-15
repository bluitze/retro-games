import { useEffect, useRef } from "react";
import { CANVAS } from "./game/constants";
import { GameState } from "./game/game-state";
import { Input } from "./game/input";
import { Renderer } from "./game/render/renderer";

export function LongBugShooterGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    canvas.width = CANVAS.width;
    canvas.height = CANVAS.height;

    const input = new Input();
    const game = new GameState(input);
    const renderer = new Renderer(canvas);
    let lastTime = performance.now();
    let animationId = 0;

    const frame = (now: number) => {
      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      game.update(deltaSeconds);
      renderer.render(game);
      input.afterFrame();

      animationId = requestAnimationFrame(frame);
    };

    animationId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationId);
      input.destroy();
    };
  }, []);

  return <canvas ref={canvasRef} className="game-canvas game-canvas--long-bug" aria-label="Bug Shooter game canvas" />;
}
