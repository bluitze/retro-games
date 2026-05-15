type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'start' | 'pause';

const actionKeys: Record<Action, string[]> = {
  left: ['ArrowLeft', 'a', 'A'],
  right: ['ArrowRight', 'd', 'D'],
  up: ['ArrowUp', 'w', 'W'],
  down: ['ArrowDown', 's', 'S'],
  jump: [' ', 'ArrowUp', 'w', 'W'],
  start: ['Enter'],
  pause: ['Escape'],
};

const gameKeys = new Set(Object.values(actionKeys).flat());

export class Input {
  private readonly heldKeys = new Set<string>();
  private readonly pressedKeys = new Set<string>();

  constructor(private readonly target: Window) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.reset);
  }

  isDown(action: Action): boolean {
    return actionKeys[action].some((key) => this.heldKeys.has(key));
  }

  consumePress(action: Action): boolean {
    const keys = actionKeys[action];
    const pressed = keys.some((key) => this.pressedKeys.has(key));

    for (const key of keys) {
      this.pressedKeys.delete(key);
    }

    return pressed;
  }

  endFrame(): void {
    this.pressedKeys.clear();
  }

  destroy(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.reset);
    this.reset();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (gameKeys.has(event.key)) {
      event.preventDefault();
    }

    if (!this.heldKeys.has(event.key)) {
      this.pressedKeys.add(event.key);
    }

    this.heldKeys.add(event.key);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (gameKeys.has(event.key)) {
      event.preventDefault();
    }

    this.heldKeys.delete(event.key);
  };

  private readonly reset = (): void => {
    this.heldKeys.clear();
    this.pressedKeys.clear();
  };
}
