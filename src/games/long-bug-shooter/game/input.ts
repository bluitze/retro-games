const heldKeys = new Set<string>();
const pressedKeys = new Set<string>();

const gameplayKeys = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "Enter",
]);

export class Input {
  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.reset);
  }

  get axisX(): number {
    return Number(this.isDown("ArrowRight") || this.isDown("KeyD")) - Number(this.isDown("ArrowLeft") || this.isDown("KeyA"));
  }

  get axisY(): number {
    return Number(this.isDown("ArrowDown") || this.isDown("KeyS")) - Number(this.isDown("ArrowUp") || this.isDown("KeyW"));
  }

  get wantsShoot(): boolean {
    return this.isDown("Space") || this.isDown("Enter");
  }

  get pressedStart(): boolean {
    return this.wasPressed("Space") || this.wasPressed("Enter");
  }

  get pressedPause(): boolean {
    return this.wasPressed("KeyP");
  }

  get pressedRestart(): boolean {
    return this.wasPressed("KeyR");
  }

  afterFrame(): void {
    pressedKeys.clear();
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.reset);
    this.reset();
  }

  private isDown(code: string): boolean {
    return heldKeys.has(code);
  }

  private wasPressed(code: string): boolean {
    return pressedKeys.has(code);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (gameplayKeys.has(event.code)) {
      event.preventDefault();
    }

    if (!heldKeys.has(event.code)) {
      pressedKeys.add(event.code);
    }

    heldKeys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (gameplayKeys.has(event.code)) {
      event.preventDefault();
    }

    heldKeys.delete(event.code);
  };

  private reset = (): void => {
    heldKeys.clear();
    pressedKeys.clear();
  };
}
