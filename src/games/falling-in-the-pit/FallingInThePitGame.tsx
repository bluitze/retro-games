import { useEffect, useRef } from "react";
import { Game } from "./game/game";
import { GameLoop } from "./game/game-loop";
import { Input } from "./game/input";
import { Renderer } from "./rendering/renderer";

export function FallingInThePitGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const input = new Input(window);
    const renderer = new Renderer(canvas);
    const game = new Game(input, renderer);
    const loop = new GameLoop({
      update: (deltaSeconds) => game.update(deltaSeconds),
      render: () => game.render(),
    });

    loop.start();

    return () => {
      loop.stop();
      input.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas game-canvas--pit"
      width="960"
      height="540"
      aria-label="Pit Jumper game canvas"
    />
  );
}
