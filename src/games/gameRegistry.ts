import type { GameDefinition } from "../app/types";
import { AlienWaveDefenderGame } from "./alien-wave-defender/AlienWaveDefenderGame";
import { BucketBomberGame } from "./bucket-bomber/BucketBomberGame";
import { FallingInThePitGame } from "./falling-in-the-pit/FallingInThePitGame";
import { FlyingRockShooterGame } from "./flying-rock-shooter/FlyingRockShooterGame";
import { LightCycleGame } from "./light-cycle/LightCycleGame";
import { LongBugShooterGame } from "./long-bug-shooter/LongBugShooterGame";
import { MissleShooterGame } from "./missle-shooter/MissleShooterGame";
import { PondJumperGame } from "./pond-jumper/PondJumperGame";
import { PyramidHopperGame } from "./pyramid-hopper/PyramidHopperGame";
import { RiverPatrolGame } from "./river-patrol/RiverPatrolGame";
import { ShieldWingGame } from "./shield-wing/ShieldWingGame";

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
  {
    slug: "pond-jumper",
    title: "Pond Jumper",
    shortTitle: "Pond",
    description: "Hop through traffic, ride floating platforms, and claim every open cove.",
    controls: "Arrows or WASD hop. Enter start. Space pause. R restart.",
    accent: "#b8f36e",
    Component: PondJumperGame,
  },
  {
    slug: "pyramid-hopper",
    title: "Pyramid Hopper",
    shortTitle: "Pyramid",
    description: "Hop across a cube pyramid, flip every tile, dodge hazards, and ride escape discs.",
    controls: "Diagonal arrows or WASD hop. Enter start. Space/P pause. R restart.",
    accent: "#ffd95f",
    Component: PyramidHopperGame,
  },
  {
    slug: "shield-wing",
    title: "Shield Wing",
    shortTitle: "Wing",
    description: "Bite through fortress shields, shelter in the neutral zone, and line up the charged cannon.",
    controls: "Arrows or WASD move. Space fire. Enter or Shift cannon. R restart.",
    accent: "#67e8f9",
    Component: ShieldWingGame,
  },
  {
    slug: "river-patrol",
    title: "River Patrol",
    shortTitle: "River",
    description: "Throttle through a shifting river canyon, refuel mid-flight, and crack checkpoint bridges.",
    controls: "Arrows or WASD steer/throttle. Space fire. P pause. R restart. M mute.",
    accent: "#39ff88",
    Component: RiverPatrolGame,
  },
  {
    slug: "bucket-bomber",
    title: "Bucket Bomber",
    shortTitle: "Buckets",
    description: "Catch falling bombs with your bucket stack before they hit the ground.",
    controls: "Pointer/touch moves bucket. Arrows or A/D fallback. Enter/Space start. P pause. R restart. M mute.",
    accent: "#ffe761",
    Component: BucketBomberGame,
  },
];
