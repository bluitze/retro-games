import type { GameDefinition } from "../app/types";
import { AlienWaveDefenderGame } from "./alien-wave-defender/AlienWaveDefenderGame";
import { FallingInThePitGame } from "./falling-in-the-pit/FallingInThePitGame";
import { FlyingRockShooterGame } from "./flying-rock-shooter/FlyingRockShooterGame";
import { LightCycleGame } from "./light-cycle/LightCycleGame";
import { LongBugShooterGame } from "./long-bug-shooter/LongBugShooterGame";
import { MissleShooterGame } from "./missle-shooter/MissleShooterGame";

export const games: GameDefinition[] = [
  {
    slug: "light-cycle",
    title: "Light Cycle Arena",
    shortTitle: "Cycles",
    description: "Outlast the rival rider while luminous trails close the arena around you.",
    controls: "WASD steer. Space start. P pause. R reset.",
    accent: "#26d9ff",
    Component: LightCycleGame,
  },
  {
    slug: "flying-rock-shooter",
    title: "Space Rock Shooter",
    shortTitle: "Rocks",
    description: "Pilot a vector ship through drifting rocks and split them with precise shots.",
    controls: "Arrows or WASD fly. Space shoot. Enter start. P pause.",
    accent: "#f8d66d",
    Component: FlyingRockShooterGame,
  },
  {
    slug: "long-bug-shooter",
    title: "Bug Shooter",
    shortTitle: "Bugs",
    description: "Clear segmented crawlers, dodging fast runners and falling threats.",
    controls: "Arrows or WASD move. Space or Enter shoot/start. P pause. R restart.",
    accent: "#7df57a",
    Component: LongBugShooterGame,
  },
  {
    slug: "missle-shooter",
    title: "Missile Shooter",
    shortTitle: "Missiles",
    description: "Defend the cities below with timed intercept blasts and limited ammo.",
    controls: "Click or tap aim. 1-3 select base. P pause. R restart.",
    accent: "#ff6f91",
    Component: MissleShooterGame,
  },
  {
    slug: "alien-wave-defender",
    title: "Alien Wave Defender",
    shortTitle: "Aliens",
    description:
      "Defend your base from descending alien waves, dodge plasma fire, and survive behind crumbling shields.",
    controls: "Move: \u2190/\u2192 or A/D. Fire: Space. Restart: Enter after game over.",
    accent: "#9cff6e",
    Component: AlienWaveDefenderGame,
  },
  {
    slug: "falling-in-the-pit",
    title: "Pit Jumper",
    shortTitle: "Pits",
    description: "Run, climb, collect relics, and survive a scrolling jungle ruin.",
    controls: "Arrows or WASD move/climb. Space jump. Enter start. Escape pause.",
    accent: "#f7a24a",
    Component: FallingInThePitGame,
  },
];
