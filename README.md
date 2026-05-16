# Retro Games Arcade

A single Vercel-ready Vite + React + TypeScript app bundling seven local retro browser games:

- Light Cycle Arena
- Space Rock Shooter
- Bug Shooter
- Missile Shooter
- Alien Wave Defender
- Pit Jumper
- Pond Jumper

Each game is migrated natively into `src/games/<slug>` and launched from a shared arcade menu. The active game is unmounted when returning to the menu so animation frames, inputs, timers, and listeners are cleaned up.

## Local Development

```sh
pnpm install
pnpm dev
```

Open the local URL Vite prints, normally `http://127.0.0.1:5173/`.

## Build

```sh
pnpm typecheck
pnpm build
```

The production output is written to `dist/`.

## Deploying to Vercel

Use the default Vercel settings for a Vite app:

- Framework preset: Vite
- Install command: `pnpm install`
- Build command: `pnpm build`
- Output directory: `dist`

## Project Structure

```text
src/
  app/
    App.tsx
    types.ts
  games/
    falling-in-the-pit/
    flying-rock-shooter/
    light-cycle/
    long-bug-shooter/
    missle-shooter/
    alien-wave-defender/
    pond-jumper/
    gameRegistry.ts
  shared/
    GameShell.tsx
    MainMenu.tsx
  main.tsx
  styles.css
```

## Notes

- The original game logic remains isolated by game folder.
- `GameShell` provides the consistent Return to Menu control.
- The `missle-shooter` folder keeps its original slug spelling, while the UI displays `Missile Shooter`.
- No iframe wrappers are used.

## Alien Wave Defender Controls

- Move: left/right arrow keys or A/D
- Fire: Space
- Restart after game over: Enter or the on-screen Restart button

## Pond Jumper Controls

- Move: arrow keys or WASD
- Start: Enter or the on-screen Start button
- Pause: Space or the on-screen Pause button
- Restart: R or the on-screen Restart button
