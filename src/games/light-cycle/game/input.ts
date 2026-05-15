import type { Direction, GameState, InputState } from "./types";

const keyBindings: Record<string, Direction> = {
  KeyW: "up",
  KeyA: "left",
  KeyS: "down",
  KeyD: "right",
};

const opposites: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export const createInputState = (): InputState => ({
  lastKey: null,
});

export const updateDirectionIntents = (state: GameState, input: InputState, keyCode: string) => {
  input.lastKey = keyCode;
  const binding = keyBindings[keyCode];

  if (!binding || state.phase !== "playing") {
    return;
  }

  const player = state.players.one;

  if (!player.alive || binding === opposites[player.direction]) {
    return;
  }

  player.pendingDirection = binding;
};
