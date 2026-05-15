type GameLoopConfig = {
  update: (deltaSeconds: number) => void;
  render: () => void;
};

export class GameLoop {
  private lastTime = 0;
  private animationId = 0;
  private readonly fixedMaxStep = 1 / 30;

  constructor(private readonly config: GameLoopConfig) {}

  start(): void {
    this.animationId = window.requestAnimationFrame(this.tick);
  }

  stop(): void {
    window.cancelAnimationFrame(this.animationId);
  }

  private readonly tick = (time: number): void => {
    const deltaSeconds = this.lastTime === 0 ? 0 : Math.min((time - this.lastTime) / 1000, this.fixedMaxStep);
    this.lastTime = time;

    this.config.update(deltaSeconds);
    this.config.render();
    this.animationId = window.requestAnimationFrame(this.tick);
  };
}
