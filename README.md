# Game Plan

Game Plan is being rebuilt as a tactics sandbox for Football Manager players. The playing surface is the pitch; saved and shared setups are tactics. Production builds show a placeholder page until screen assembly lands; `npm run dev` loads the pitch board.

## Architecture

Code is split into three layers, and imports only point downward:

- **data** (`src/data`) - typed constants and zod schemas for the role, formation and movement tables. Imports no other layer.
- **engine** (`src/engine`) - pure functions for geometry, layout, spacing, zones and movement. May import data. No React, DOM or storage.
- **UI** (`src/ui`) - React components and SCSS modules. May import the state, engine and data layers.

State (`src/state`), persistence (`src/persistence`) and share links (`src/share`) sit between the engine and the UI. `scripts/check-structure.mjs` fails the lint script on a forbidden import.

## Scripts

| Command                   | What it does                                            |
| ------------------------- | ------------------------------------------------------- |
| `npm run dev`             | Start the Vite dev server                               |
| `npm run build`           | Type-check and build for production                     |
| `npm run lint`            | Oxlint, Stylelint and the structure and layer check     |
| `npm run format:check`    | Prettier check                                          |
| `npm test`                | Vitest unit and integration tests                       |
| `npm run test:coverage`   | Vitest with the 80% coverage thresholds                 |
| `npm run test:e2e`        | Playwright end to end tests (builds and previews first) |
| `npm run generate:data`   | Regenerate `src/data/fm26` from `scripts/fm26-source`   |
| `npm run generate:tokens` | Regenerate theme CSS from `design/tokens.json`          |
