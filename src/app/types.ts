import type { ComponentType } from "react";

export type GameSlug =
  | "light-cycle"
  | "flying-rock-shooter"
  | "long-bug-shooter"
  | "missle-shooter"
  | "falling-in-the-pit"
  | "alien-wave-defender";

export type GameDefinition = {
  slug: GameSlug;
  title: string;
  shortTitle: string;
  description: string;
  controls: string;
  accent: string;
  Component: ComponentType;
};
