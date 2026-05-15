import { renderGame } from "./render";
import { createInitialState, handleCommand, resizeState, updateGame } from "./update";
import type { GameState, InputCommand } from "./types";

export class Game {
  private state: GameState;
  private readonly commands: InputCommand[] = [];

  constructor(width: number, height: number) {
    this.state = createInitialState(width, height);
  }

  queueCommand(command: InputCommand): void {
    this.commands.push(command);
  }

  resize(width: number, height: number): void {
    resizeState(this.state, width, height);
  }

  update(deltaSeconds: number): void {
    for (const command of this.commands.splice(0)) {
      if (command.type === "restart") {
        this.state = createInitialState(this.state.width, this.state.height);
      } else {
        handleCommand(this.state, command);
      }
    }

    updateGame(this.state, deltaSeconds);
  }

  render(context: CanvasRenderingContext2D): void {
    renderGame(context, this.state);
  }
}
