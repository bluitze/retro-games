import type { LaneConfig } from "./types";

export const CELL_SIZE = 48;
export const BOARD_COLS = 13;
export const BOARD_ROWS = 14;
export const BOARD_WIDTH = BOARD_COLS * CELL_SIZE;
export const BOARD_HEIGHT = BOARD_ROWS * CELL_SIZE;
export const HOME_COUNT = 5;
export const STARTING_LIVES = 3;
export const ROUND_SECONDS = 60;
export const START_ROW = BOARD_ROWS - 1;
export const START_COL = Math.floor(BOARD_COLS / 2);
export const HOME_ROW = 0;

export const HOME_COLS = [2, 4, 7, 10, 12];

export const LANE_CONFIGS: LaneConfig[] = [
  { row: 1, kind: "water", speed: 58, direction: 1, entityWidth: 140, gap: 120, color: "#916a38" },
  { row: 2, kind: "water", speed: 74, direction: -1, entityWidth: 96, gap: 116, color: "#b98445" },
  { row: 3, kind: "water", speed: 66, direction: 1, entityWidth: 176, gap: 132, color: "#79562f" },
  { row: 4, kind: "water", speed: 92, direction: -1, entityWidth: 116, gap: 112, color: "#c28b4c" },
  { row: 5, kind: "water", speed: 54, direction: 1, entityWidth: 132, gap: 128, color: "#9c713f" },
  { row: 7, kind: "road", speed: 86, direction: -1, entityWidth: 82, gap: 150, color: "#e85d4f" },
  { row: 8, kind: "road", speed: 104, direction: 1, entityWidth: 104, gap: 170, color: "#f0c34e" },
  { row: 9, kind: "road", speed: 124, direction: -1, entityWidth: 70, gap: 145, color: "#66c2d7" },
  { row: 10, kind: "road", speed: 78, direction: 1, entityWidth: 128, gap: 180, color: "#d47bd1" },
  { row: 11, kind: "road", speed: 114, direction: -1, entityWidth: 92, gap: 154, color: "#8dd760" },
];

export const SAFE_ROWS = new Set([6, 12, 13]);
export const WATER_ROWS = new Set(LANE_CONFIGS.filter((lane) => lane.kind === "water").map((lane) => lane.row));
export const ROAD_ROWS = new Set(LANE_CONFIGS.filter((lane) => lane.kind === "road").map((lane) => lane.row));
