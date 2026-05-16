import type { InputState } from "./types";

const PREVENT_DEFAULT_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "Space",
  "KeyP",
  "KeyR",
  "KeyM",
]);

export function createInput(target: Window, onInteraction?: () => void): InputState {
  const down = new Set<string>();
  const pressed = new Set<string>();

  const normalize = (codes: string | string[]): string[] => (Array.isArray(codes) ? codes : [codes]);

  const onKeyDown = (event: KeyboardEvent): void => {
    if (PREVENT_DEFAULT_CODES.has(event.code)) {
      event.preventDefault();
    }

    onInteraction?.();

    if (!event.repeat) {
      pressed.add(event.code);
    }

    down.add(event.code);
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    if (PREVENT_DEFAULT_CODES.has(event.code)) {
      event.preventDefault();
    }

    down.delete(event.code);
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return {
    isDown(codes) {
      return normalize(codes).some((code) => down.has(code));
    },
    consumePressed(codes) {
      const codeList = normalize(codes);
      const wasPressed = codeList.some((code) => pressed.has(code));

      if (wasPressed) {
        for (const code of codeList) {
          pressed.delete(code);
        }
      }

      return wasPressed;
    },
    finishFrame() {
      pressed.clear();
    },
    destroy() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
    },
  };
}

