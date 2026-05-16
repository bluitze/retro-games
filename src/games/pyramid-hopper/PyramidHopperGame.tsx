import { useCallback, useEffect, useRef, useState } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./game/constants";
import { createInitialState, handlePlayerMove, restartGame, startGame, togglePause, updateGame } from "./game/gameLogic";
import { renderGame } from "./game/render";
import type { GameState, MoveDirection } from "./game/types";
import "./styles.css";

const keyMap: Record<string, MoveDirection> = {
  ArrowUp: "upLeft",
  KeyW: "upLeft",
  ArrowRight: "upRight",
  KeyD: "upRight",
  ArrowLeft: "downLeft",
  KeyA: "downLeft",
  ArrowDown: "downRight",
  KeyS: "downRight",
};

export function PyramidHopperGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const [gameState, setGameState] = useState<GameState>(stateRef.current);

  const commitState = useCallback((updater: (state: GameState) => GameState) => {
    const next = updater(stateRef.current);
    stateRef.current = next;
    setGameState(next);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
      return undefined;
    }

    const loop = (time: number) => {
      const previous = previousTimeRef.current ?? time;
      const deltaSeconds = Math.min((time - previous) / 1000, 0.05);
      previousTimeRef.current = time;

      const next = updateGame(stateRef.current, deltaSeconds);
      stateRef.current = next;
      setGameState(next);
      renderGame(ctx, next);

      animationRef.current = requestAnimationFrame(loop);
    };

    renderGame(ctx, stateRef.current);
    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = null;
      previousTimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = keyMap[event.code];

      if (direction) {
        event.preventDefault();
        if (!event.repeat) {
          commitState((state) => handlePlayerMove(state, direction));
        }
        return;
      }

      if (event.code === "Enter") {
        event.preventDefault();
        commitState(startGame);
        return;
      }

      if (event.code === "Space" || event.code === "KeyP") {
        event.preventDefault();
        commitState(togglePause);
        return;
      }

      if (event.code === "KeyR") {
        event.preventDefault();
        commitState(() => restartGame());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commitState]);

  const completedCubes = gameState.tiles.filter((value) => value >= gameState.requiredHits).length;
  const statusLabel = gameState.status === "roundWon" ? "Round clear" : gameState.status === "ready" ? "Ready" : gameState.status;
  const activeDiscs = gameState.discs.filter((disc) => !disc.used).length;

  return (
    <div className="pyramid-hopper">
      <section className="pyramid-hopper__layout" aria-label="Pyramid Hopper game">
        <div className="pyramid-hopper__board">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="game-canvas pyramid-hopper__canvas"
            aria-label="Pyramid Hopper play field"
          />
        </div>

        <aside className="pyramid-hopper__hud">
          <div>
            <p className="pyramid-hopper__eyebrow">Pyramid Hopper</p>
            <h1>Flip the pyramid. Stay on the cubes.</h1>
          </div>

          <dl className="pyramid-hopper__stats">
            <div>
              <dt>Score</dt>
              <dd>{gameState.score.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Lives</dt>
              <dd>{gameState.lives}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{gameState.level}</dd>
            </div>
            <div>
              <dt>Discs</dt>
              <dd>{activeDiscs}</dd>
            </div>
          </dl>

          <div className="pyramid-hopper__meter" aria-label={`${completedCubes} of 28 cubes complete`}>
            <span style={{ width: `${(completedCubes / gameState.tiles.length) * 100}%` }} />
          </div>

          <p className="pyramid-hopper__status">
            <span>{statusLabel}</span>
            {gameState.message}
          </p>

          <div className="pyramid-hopper__buttons">
            <button type="button" onClick={() => commitState(startGame)}>
              {gameState.status === "paused" ? "Resume" : "Start"}
            </button>
            <button type="button" onClick={() => commitState(togglePause)}>
              {gameState.status === "paused" ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={() => commitState(() => restartGame())}>
              Restart
            </button>
          </div>

          <div className="pyramid-hopper__instructions">
            <p>Move diagonally: Up/W up-left, Right/D up-right, Left/A down-left, Down/S down-right.</p>
            <p>Every landing flips a cube toward its target. Clear all 28 cubes to advance.</p>
            <p>Hazards cost a life. Violet pests dim cubes, but tagging them scores a bonus.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
