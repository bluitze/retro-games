import { useCallback, useEffect, useRef, useState } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./game/constants";
import {
  createInitialState,
  handlePlayerMove,
  restartGame,
  startGame,
  togglePause,
  updateGame,
} from "./game/gameLogic";
import { renderGame } from "./game/render";
import type { GameState, MoveDirection } from "./game/types";
import "./styles.css";

const keyMap: Record<string, MoveDirection> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

export function PondJumperGame() {
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
      return;
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
        if (event.repeat) {
          return;
        }
        commitState((state) => handlePlayerMove(state, direction));
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        commitState(togglePause);
      }

      if (event.code === "Enter") {
        event.preventDefault();
        commitState(startGame);
      }

      if (event.code === "KeyR") {
        event.preventDefault();
        commitState(() => restartGame());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commitState]);

  const statusLabel = gameState.status === "ready" ? "Ready" : gameState.status;

  return (
    <div className="pond-jumper">
      <section className="pond-jumper__layout" aria-label="Pond Jumper game">
        <div className="pond-jumper__board">
          <canvas
            ref={canvasRef}
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
            className="game-canvas pond-jumper__canvas"
            aria-label="Pond Jumper play field"
          />
        </div>

        <aside className="pond-jumper__hud">
          <div>
            <p className="pond-jumper__eyebrow">Pond Jumper</p>
            <h1>Cross the lanes. Claim the coves.</h1>
          </div>

          <dl className="pond-jumper__stats">
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
              <dt>Timer</dt>
              <dd>{Math.ceil(gameState.timer)}</dd>
            </div>
          </dl>

          <div className="pond-jumper__homes" aria-label="Home slots">
            {gameState.occupiedHomes.map((occupied, index) => (
              <span key={index} className={occupied ? "pond-jumper__home is-filled" : "pond-jumper__home"} />
            ))}
          </div>

          <p className="pond-jumper__status">
            <span>{statusLabel}</span>
            {gameState.message}
          </p>

          <div className="pond-jumper__buttons">
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

          <div className="pond-jumper__instructions">
            <p>Move one square at a time with arrow keys or WASD.</p>
            <p>Ride platforms across water, avoid road traffic, and fill every cove to advance.</p>
            <p>Enter starts, Space pauses, R restarts.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
