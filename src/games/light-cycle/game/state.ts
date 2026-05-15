import { BOARD_COLUMNS, BOARD_ROWS, PLAYER_COLORS } from "./config";
import type { GameState, PlayerState } from "./types";

const createPlayerOne = (score = 0): PlayerState => ({
  id: "one",
  name: "Player 1",
  position: { x: Math.floor(BOARD_COLUMNS * 0.24), y: Math.floor(BOARD_ROWS / 2) },
  direction: "right",
  pendingDirection: "right",
  trail: [],
  alive: true,
  score,
  color: PLAYER_COLORS.one,
});

const createPlayerTwo = (score = 0): PlayerState => ({
  id: "two",
  name: "NPC",
  position: { x: Math.floor(BOARD_COLUMNS * 0.76), y: Math.floor(BOARD_ROWS / 2) },
  direction: "left",
  pendingDirection: "left",
  trail: [],
  alive: true,
  score,
  color: PLAYER_COLORS.two,
});

export const createInitialGameState = (): GameState => ({
  phase: "ready",
  players: {
    one: createPlayerOne(),
    two: createPlayerTwo(),
  },
  winner: null,
  isDraw: false,
  round: 1,
  message: "Press Space to start",
});

export const resetRound = (state: GameState): GameState => ({
  phase: "playing",
  players: {
    one: createPlayerOne(state.players.one.score),
    two: createPlayerTwo(state.players.two.score),
  },
  winner: null,
  isDraw: false,
  round: state.phase === "round-over" ? state.round + 1 : state.round,
  message: "Round in progress",
});

export const resetMatch = (): GameState => createInitialGameState();
