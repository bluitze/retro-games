import './styles.css';
import { Game } from './game/game';
import { GameLoop } from './game/game-loop';
import { Input } from './game/input';
import { Renderer } from './rendering/renderer';

const canvas = document.querySelector<HTMLCanvasElement>('#game');

if (!canvas) {
  throw new Error('Game canvas was not found.');
}

const input = new Input(window);
const renderer = new Renderer(canvas);
const game = new Game(input, renderer);
const loop = new GameLoop({
  update: (deltaSeconds) => game.update(deltaSeconds),
  render: () => game.render(),
});

loop.start();
