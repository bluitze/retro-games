import "./style.css";
import { Game } from "./game/game";
import { bindInput } from "./game/input";

const canvas = getCanvas();
const context = getCanvasContext(canvas);

const game = new Game(window.innerWidth, window.innerHeight);
let lastFrameTime = performance.now();

bindInput(canvas, (command) => {
  game.queueCommand(command);
});

function resizeCanvas(): void {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  game.resize(width, height);
}

function frame(now: number): void {
  const deltaSeconds = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  game.update(deltaSeconds);
  game.render(context);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
requestAnimationFrame(frame);

function getCanvas(): HTMLCanvasElement {
  const element = document.querySelector<HTMLCanvasElement>("#game");

  if (!element) {
    throw new Error("Game canvas was not found.");
  }

  return element;
}

function getCanvasContext(element: HTMLCanvasElement): CanvasRenderingContext2D {
  const canvasContext = element.getContext("2d");

  if (!canvasContext) {
    throw new Error("Canvas 2D context is not available.");
  }

  return canvasContext;
}
