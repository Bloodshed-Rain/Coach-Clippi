# Repository Guidelines

## Project Structure & Module Organization
`src/main/` contains Electron main-process code and IPC handlers, `src/preload/` exposes the bridge API, and `src/renderer/` holds the Vite + React UI (`pages/`, `components/`, `styles/`, `assets/`). Core replay parsing, stats, and import logic live in top-level `src/` modules plus `src/pipeline/`. Tests live in `tests/*.test.ts`. Static marketing assets are under `site/`, screenshots under `screenshots/`, and character art in `CharacterCards/`.

## Build, Test, and Development Commands
Use Node.js 18+ and install with `npm install`.

- `npm run dev` starts the Vite renderer, compiles main/preload TS, and launches Electron.
- `npm run build` creates a packaged app in `release/`; use `build:win`, `build:mac`, or `build:linux` for platform-specific builds.
- `npm test` runs the Vitest suite once; `npm run test:watch` keeps tests running during development.
- `npm run lint` checks `src/` with ESLint; `npm run lint:fix` applies safe fixes.
- `npm run format` and `npm run format:check` run Prettier on `src/**/*.{ts,tsx}`.

Create `key.env` from `.env.example` when working with AI features or packaging.

## Coding Style & Naming Conventions
TypeScript is `strict` and React uses function components. Follow Prettier defaults in this repo: 2-space indentation, semicolons, double quotes, trailing commas, and `printWidth: 120`. Use `PascalCase` for React components and page files (`Dashboard.tsx`), `camelCase` for utilities (`playerSummary.ts`), and keep test files in `name.test.ts` form. Prefer small modules near their owning layer instead of cross-cutting helpers.

## Testing Guidelines
Vitest looks for `tests/**/*.test.ts` with global APIs enabled. Add or update tests when changing parsing, importer, DB, config, or pipeline behavior. There is no enforced coverage threshold, so contributors should cover new branches and regression-prone paths explicitly. Run `npm test` before opening a PR.

## Commit & Pull Request Guidelines
Recent history uses short imperative subjects such as `Fix Dolphin playback...` and `Update landing page...`. Keep commit messages concise, capitalized, and focused on one change. PRs should include a clear summary, testing notes, linked issues when relevant, and screenshots/GIFs for UI changes in `src/renderer/` or `site/`.

## Security & Configuration Tips
Do not commit `key.env`, API keys, or local replay data. Keep secrets in local env files, and use `.env.example` as the template for new configuration fields.
