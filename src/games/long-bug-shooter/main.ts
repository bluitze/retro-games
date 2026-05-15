import "./styles.css";
import { GameState } from "./game/game-state";
import { Input } from "./game/input";
import { Renderer } from "./game/render/renderer";
import { CANVAS } from "./game/constants";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

if (!canvas) {
  throw new Error("Game canvas not found.");
}

canvas.width = CANVAS.width;
canvas.height = CANVAS.height;

const input = new Input();
const game = new GameState(input);
const renderer = new Renderer(canvas);

let lastTime = performance.now();

function frame(now: number) {
  const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  game.update(deltaSeconds);
  renderer.render(game);
  input.afterFrame();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
