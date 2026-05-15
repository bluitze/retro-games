import type { InputCommand, Point } from "./types";

type InputHandler = (command: InputCommand) => void;

export function bindInput(canvas: HTMLCanvasElement, onCommand: InputHandler): () => void {
  const pointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    onCommand({ type: "aim", point: getCanvasPoint(canvas, event.clientX, event.clientY) });
  };

  const keyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    if (key === "r") {
      onCommand({ type: "restart" });
      return;
    }

    if (key === "p") {
      onCommand({ type: "pause" });
      return;
    }

    if (key >= "1" && key <= "3") {
      onCommand({ type: "selectBase", baseId: Number(key) - 1 });
    }
  };

  canvas.addEventListener("pointerdown", pointerDown);
  window.addEventListener("keydown", keyDown);

  return () => {
    canvas.removeEventListener("pointerdown", pointerDown);
    window.removeEventListener("keydown", keyDown);
  };
}

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}
