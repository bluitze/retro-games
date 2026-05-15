import "./styles.css";
import { createGame, resizeGame, updateGame } from "./game/game";
import { createInput } from "./game/input";
import { renderGame } from "./game/render";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

if (!canvas) {
  throw new Error("Game canvas not found");
}

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("2D canvas context not supported");
}

const gameCanvas = canvas;
const gameContext = context;
const input = createInput(window);
const game = createGame(window.innerWidth, window.innerHeight);

function resizeCanvas(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);

  gameCanvas.width = Math.floor(width * pixelRatio);
  gameCanvas.height = Math.floor(height * pixelRatio);
  gameCanvas.style.width = `${width}px`;
  gameCanvas.style.height = `${height}px`;

  gameContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  resizeGame(game, width, height);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let lastTime = performance.now();

function frame(time: number): void {
  const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  updateGame(game, input, deltaSeconds, time / 1000);
  renderGame(gameContext, game, time / 1000);
  input.finishFrame();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
