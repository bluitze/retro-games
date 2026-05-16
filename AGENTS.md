# Retro Games Agent Instructions

## Project Overview

Retro Games is a Vite + React + TypeScript arcade bundle that recreates classic-inspired browser games in one deployable app.

The repo should stay simple, portable, and easy to deploy to Vercel. Prefer direct, maintainable implementations over heavy abstractions.

## Source of Truth

When planning or modifying the project, inspect sources in this order:

1. Current repo files
2. This `AGENTS.md`
3. `README.md`
4. Existing game implementations under `src/games/`
5. Shared app wiring under `src/app/` and shared shell/components under `src/shared/`
6. Package scripts and config files

Do not assume architecture from unrelated projects.

## Branching Workflow

- `main` is the canonical branch for this project.
- Always start new work from the latest `main`.
- Create a short-lived branch for each feature, fix, or game addition.
- Branch naming examples:
  - `feature/space-invaders`
  - `feature/pond-jumper`
  - `fix/menu-navigation`
  - `chore/readme-update`
- It is acceptable for this project to merge directly back into `main` after validation.
- Do not create or assume `dev`, `qa`, or release branches unless explicitly requested.

Recommended start:

```sh
git checkout main
git pull
git checkout -b feature/<short-description>
```

## Implementation Guardrails

- Keep each game self-contained under `src/games/<game-name>/`.
- Reuse shared app/menu/shell patterns already present in the repo.
- Do not introduce iframes or static HTML game exceptions unless explicitly requested.
- Prefer native React/TypeScript integration.
- Avoid unnecessary dependencies.
- Avoid large framework changes.
- Avoid backend/server requirements.
- Keep the app deployable as a static/Vercel-friendly frontend.
- Keep controls and gameplay usable on desktop browsers first.
- Preserve the main menu and consistent return-to-menu behavior.

## Game Integration Rules

Each game should:

- Live in its own folder under `src/games/`.
- Export a React component compatible with the existing app routing/menu pattern.
- Use the shared `GameShell` or current equivalent wrapper.
- Include a visible return-to-menu path.
- Clean up all runtime side effects on unmount:
  - animation frames
  - intervals/timeouts
  - keyboard listeners
  - pointer/mouse listeners
  - resize listeners
  - audio loops or generated audio nodes
- Avoid leaking global event handlers.
- Avoid relying on DOM elements outside the game component unless the existing architecture already does so.

## Naming Conventions

- Use kebab-case for game folder names.
- Use PascalCase for React components.
- Use camelCase for TypeScript variables/functions.
- Keep filenames consistent with existing repo patterns.

Examples:

```text
src/games/light-cycle/
src/games/flying-rock-shooter/
src/games/pond-jumper/
```

## UI / UX Expectations

- Preserve the retro arcade style already established in the app.
- Keep the menu polished and readable.
- New game cards should match existing game card patterns.
- Use concise instructions for each game.
- Prefer keyboard controls where appropriate.
- Avoid layout shifts that break the main menu or shared game shell.

## Validation Requirements

Before reporting completion, run the relevant available checks from `package.json`.

Typical validation:

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

If a script does not exist, do not invent it. Report that it was unavailable.

At minimum, validate:

- App builds successfully.
- New game appears on the main menu.
- Game launches.
- Return-to-menu works.
- Game unmount cleanup does not leave controls/listeners active after returning to menu.
- Existing games still launch.

## Documentation Expectations

Update `README.md` when:

- A new game is added.
- Controls change.
- Local run or deploy steps change.
- The available game list changes.

Keep documentation short and practical.

## Codex / Agent Response Expectations

When completing work, summarize:

- Branch name used
- Files changed
- What was implemented
- Validation commands run
- Any validation failures or skipped checks
- Any follow-up risks

Do not claim validation passed unless it was actually run.

## Out of Scope Unless Requested

Do not add:

- Authentication
- Database persistence
- Multiplayer
- User accounts
- Analytics
- Payments
- Server APIs
- External asset hosting
- Large state-management libraries
- New deployment platforms
- Mobile-first rewrites

## Project Bias

Prefer small, clean slices.

For new games, first make the game playable and integrated. Polish can follow in later passes.
