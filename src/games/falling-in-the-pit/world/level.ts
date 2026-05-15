import { INTERNAL_HEIGHT, ROOM_WIDTH } from '../game/constants';
import type { Rect } from './collision';

export type PlatformKind = 'earth' | 'stone' | 'bridge' | 'ledge';

export type Platform = Rect & {
  kind: PlatformKind;
};

export type HazardKind = 'roller' | 'crawler' | 'swing' | 'falling';

export type HazardDefinition = Rect & {
  kind: HazardKind;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  speed?: number;
  phase?: number;
};

export type CollectibleDefinition = {
  id: string;
  x: number;
  y: number;
  value: number;
  label: string;
};

export type Checkpoint = Rect & {
  id: string;
  spawnX: number;
  spawnY: number;
};

export type Level = {
  width: number;
  height: number;
  spawn: { x: number; y: number };
  objective: string;
  platforms: Platform[];
  pits: Rect[];
  mud: Rect[];
  climbables: Rect[];
  hazards: HazardDefinition[];
  collectibles: CollectibleDefinition[];
  checkpoints: Checkpoint[];
  goal: Rect;
};

const floorY = 468;
const floorHeight = INTERNAL_HEIGHT - floorY;

export function createLevel(): Level {
  return {
    width: ROOM_WIDTH * 6,
    height: INTERNAL_HEIGHT,
    spawn: { x: 92, y: floorY - 46 },
    objective: 'Recover the relics and reach the far expedition flag.',
    platforms: [
      { x: 0, y: floorY, width: 520, height: floorHeight, kind: 'earth' },
      { x: 650, y: floorY, width: 570, height: floorHeight, kind: 'earth' },
      { x: 1420, y: floorY, width: 450, height: floorHeight, kind: 'earth' },
      { x: 2020, y: floorY, width: 360, height: floorHeight, kind: 'earth' },
      { x: 2490, y: floorY, width: 330, height: floorHeight, kind: 'earth' },
      { x: 2970, y: floorY, width: 520, height: floorHeight, kind: 'earth' },
      { x: 3650, y: floorY, width: 420, height: floorHeight, kind: 'earth' },
      { x: 4190, y: floorY, width: 530, height: floorHeight, kind: 'earth' },
      { x: 4860, y: floorY, width: 900, height: floorHeight, kind: 'earth' },

      { x: 300, y: 392, width: 150, height: 22, kind: 'ledge' },
      { x: 760, y: 382, width: 220, height: 18, kind: 'bridge' },
      { x: 1080, y: 324, width: 180, height: 20, kind: 'stone' },
      { x: 1560, y: 392, width: 230, height: 22, kind: 'ledge' },
      { x: 1910, y: 396, width: 170, height: 18, kind: 'bridge' },
      { x: 2240, y: 320, width: 230, height: 20, kind: 'stone' },
      { x: 2630, y: 376, width: 170, height: 18, kind: 'bridge' },
      { x: 3140, y: 386, width: 230, height: 22, kind: 'ledge' },
      { x: 3520, y: 398, width: 190, height: 18, kind: 'bridge' },
      { x: 3950, y: 328, width: 210, height: 20, kind: 'stone' },
      { x: 4430, y: 392, width: 260, height: 22, kind: 'ledge' },
      { x: 4980, y: 318, width: 180, height: 20, kind: 'stone' },
      { x: 5290, y: 390, width: 220, height: 18, kind: 'bridge' },
    ],
    pits: [
      { x: 520, y: floorY, width: 130, height: floorHeight },
      { x: 1220, y: floorY, width: 200, height: floorHeight },
      { x: 1870, y: floorY, width: 150, height: floorHeight },
      { x: 2380, y: floorY, width: 110, height: floorHeight },
      { x: 2820, y: floorY, width: 150, height: floorHeight },
      { x: 3490, y: floorY, width: 160, height: floorHeight },
      { x: 4070, y: floorY, width: 120, height: floorHeight },
      { x: 4720, y: floorY, width: 140, height: floorHeight },
    ],
    mud: [
      { x: 1540, y: floorY - 16, width: 170, height: 16 },
      { x: 3090, y: floorY - 16, width: 210, height: 16 },
      { x: 5010, y: floorY - 16, width: 190, height: 16 },
    ],
    climbables: [
      { x: 1120, y: 184, width: 28, height: 148 },
      { x: 2280, y: 176, width: 28, height: 154 },
      { x: 4020, y: 184, width: 28, height: 152 },
      { x: 5055, y: 170, width: 28, height: 156 },
    ],
    hazards: [
      { kind: 'roller', x: 705, y: floorY - 26, width: 28, height: 28, minX: 680, maxX: 1090, speed: 130 },
      { kind: 'crawler', x: 1620, y: floorY - 24, width: 42, height: 24, minX: 1460, maxX: 1790, speed: 82 },
      { kind: 'swing', x: 2140, y: 272, width: 34, height: 132, minX: 2080, maxX: 2240, speed: 1.6, phase: 0.2 },
      { kind: 'falling', x: 3300, y: 166, width: 30, height: 34, minY: 166, maxY: floorY - 34, speed: 240, phase: 0.6 },
      { kind: 'roller', x: 4240, y: floorY - 26, width: 28, height: 28, minX: 4225, maxX: 4660, speed: 150 },
      { kind: 'swing', x: 5360, y: 300, width: 34, height: 112, minX: 5280, maxX: 5480, speed: 1.9, phase: 1.4 },
    ],
    collectibles: [
      { id: 'jade-mask', x: 348, y: 360, value: 250, label: 'Jade Mask' },
      { id: 'sun-disc', x: 1110, y: 288, value: 300, label: 'Sun Disc' },
      { id: 'amber-idol', x: 1690, y: 360, value: 300, label: 'Amber Idol' },
      { id: 'moon-shell', x: 2335, y: 286, value: 350, label: 'Moon Shell' },
      { id: 'obsidian-cup', x: 3200, y: 354, value: 400, label: 'Obsidian Cup' },
      { id: 'star-seed', x: 4055, y: 292, value: 450, label: 'Star Seed' },
      { id: 'river-crown', x: 5360, y: 356, value: 500, label: 'River Crown' },
    ],
    checkpoints: [
      { id: 'camp-two', x: 2090, y: floorY - 72, width: 42, height: 72, spawnX: 2100, spawnY: floorY - 46 },
      { id: 'camp-three', x: 3920, y: floorY - 72, width: 42, height: 72, spawnX: 3930, spawnY: floorY - 46 },
    ],
    goal: { x: 5600, y: floorY - 118, width: 60, height: 118 },
  };
}
