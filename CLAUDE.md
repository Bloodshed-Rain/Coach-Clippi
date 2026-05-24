# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MAGI (Melee Analysis through Generative Intelligence) is an Electron + React desktop app that analyzes Super Smash Bros. Melee replays (.slp files via slippi-js) and generates AI coaching feedback via LLM providers.

## Commands

- **Install**: `npm install` then `npx electron-rebuild` (rebuilds `better-sqlite3` and `koffi` against the Electron ABI — required before `npm run dev` will boot)
- **Dev mode**: `npm run dev` — runs `scripts/dev.js`: compiles main/preload via `tsc -p tsconfig.main.json`, starts the Vite renderer server, then spawns Electron with `VITE_DEV_SERVER_URL` set. Also auto-loads `key.env` into `process.env`.
- **Build**: `npm run build` — compiles main process TS, builds renderer via Vite, packages with electron-builder
- **Platform builds**: `npm run build:linux`, `build:win`, `build:mac`
- **Run pipeline CLI**: `npx tsx src/pipeline-cli.ts <file.slp> [--target player] [--json]`
- **Run import CLI**: `npx tsx src/import-cli.ts <folder> [--target player]` (bulk-imports a folder into the local DB)
- **Type-check main process**: `npx tsc -p tsconfig.main.json --noEmit`
- **Run tests**: `npm test` — runs Vitest once over `tests/**/*.test.ts`
- **Single test file**: `npx vitest run tests/pipeline.test.ts` (or pass a name pattern: `npx vitest run -t "neutral win rate"`)
- **Watch tests**: `npm run test:watch`
- **Lint / format**: `npm run lint` (ESLint), `npm run lint:fix`, `npm run format` (Prettier write), `npm run format:check`

## Architecture

### Process Model (Electron)

Three processes communicate via IPC:

- **Entry** (`src/main/entry.js`): Tiny CommonJS shim that Electron actually launches (per `package.json` `"main"`). In dev (`VITE_DEV_SERVER_URL` set) it requires `tsx/cjs` and loads `index.ts` for live TS; in production it loads the precompiled `dist/main/main/index.js`. **Do not move or rename this file** — it's the dev/prod fork point.
- **Main** (`src/main/index.ts`): Electron main process. IPC channels are registered through `src/main/ipc.ts`, with handlers split across `src/main/handlers/` (analysis, stats, llm, config, import, watcher, dolphin, dialog, stockTimeline, embeddedReplay). Shared state in `src/main/state.ts`.
- **Native** (`src/main/native/win32Embed.ts`): Windows-only FFI via `koffi` to user32/dwmapi for embedding Dolphin's window into a BrowserView region (used by `embeddedReplay` handler). Guard all calls with `process.platform === "win32"` — there is no macOS/Linux equivalent.
- **Preload** (`src/preload/index.ts`): Bridges main↔renderer via `contextBridge`. Exposes `window.clippi` with typed IPC invoke wrappers. The renderer accesses **only** what's exposed here — adding a new IPC channel requires touching the handler, `ipc.ts`, the preload bridge, and `src/renderer/global.d.ts` together.
- **Renderer** (`src/renderer/`): React 19 SPA built with Vite. Pages in `src/renderer/pages/`, components in `src/renderer/components/`. Uses `react-router-dom` v7 for routing, Zustand stores in `src/renderer/stores/` (`useGlobalStore`, `useReplayPlayerStore`) for cross-page state, and `@tanstack/react-query` for IPC-backed async data.

### Data Pipeline

`src/pipeline/` is the core analysis engine (barrel-exported via `index.ts`):
- `types.ts`: All interfaces (`GameSummary`, `PlayerSummary`, `DerivedInsights`, signature stats)
- `helpers.ts`: Shared utilities (frame conversion, action state classifiers, stage bounds, move ID mapping)
- `processGame.ts`: Main orchestrator — parses .slp via `SlippiGame`, returns `GameResult`
- `playerSummary.ts`: Builds per-player stats (neutral, conversions, movement, recovery, edgeguards)
- `signatureStats.ts`: Character-specific stat detection (26 characters)
- `derivedInsights.ts`: Habit profiles, key moments, performance by stock
- `adaptation.ts`: Cross-game adaptation signals for multi-game sets
- `highlights.ts`: Detects notable moments (zero-to-deaths, spike kills, high-damage, 4-stocks, JV5/JV4)
- `characterData.ts`: Character metadata
- `prompt.ts`: `SYSTEM_PROMPT`, `SYSTEM_PROMPT_AGGREGATE`, `SYSTEM_PROMPT_DISCOVERY` + `assembleUserPrompt`, `assembleAggregatePrompt`, `assembleDiscoveryPrompt`, `assemblePlayerContext`

### Supporting Modules

- `src/llm.ts`: Multi-provider LLM abstraction (OpenRouter, Gemini, Anthropic, OpenAI, local). All share: system prompt + user prompt → text. Streaming variants emit incremental chunks back to the renderer over IPC.
- `src/llmProviders.ts`: Provider metadata (display names, default models, model-list endpoints). When adding a provider, both files must be updated together; the renderer's Settings page reads from this.
- `src/llmQueue.ts`: Queued LLM calls to prevent concurrent overload, with 429 backoff.
- `src/db.ts`: SQLite via better-sqlite3. Data dir: `~/.magi-melee/`, DB file: `magi.db`. Tables: `player_profile`, `sessions`, `games`, `game_stats`, `coaching_analyses`, `character_signature_stats`, `highlights`, `schema_version`. Migrations are forward-only and gated by `schema_version`; add a new migration rather than mutating existing ones.
- `src/config.ts`: JSON config at `~/.magi-melee/config.json`. Stores target player, API keys, replay folder, theme.
- `src/importer.ts` / `src/import-cli.ts`: Bulk imports replay folders, hashes files for SHA-256 dedup, inserts into DB, optionally triggers LLM analysis. CLI is a thin wrapper around the same engine the IPC import handler uses.
- `src/replayAnalyzer.ts`: Single-replay analysis with DB caching (hash-based dedup, skips LLM if cached).
- `src/watcher.ts`: chokidar file watcher for live replay folder monitoring.
- `src/detect-sets.ts`: Groups replays into tournament-style sets by player matchup and time proximity (15-minute window).
- `src/parsePool.ts` / `src/parseWorker.ts`: Worker-based parallel .slp parsing. Workers run in Node `worker_threads`; bumping pool size affects import throughput vs. memory.
- `src/player-profile.ts`: Player profile management (archetype detection, radar stats).
- `src/stats.ts`: Stat computation helpers for DB queries and trend data.
- `src/setup.ts`: First-run setup and migration logic.
- `src/mcp-server.ts`: Model Context Protocol server exposing replay/coaching data to external MCP clients via `@modelcontextprotocol/sdk`. Not started by the Electron app by default — runnable standalone for integrations.

### Renderer Pages

`Dashboard`, `Sessions`, `Library` (history + filters, with `pages/library/` subviews), `Trends`, `Characters`, `Oracle` (persistent chat with recent-games context), `Practice` (LLM-generated drill plans), `Settings` — each in `src/renderer/pages/`.

Key components in `src/renderer/components/`:
- `LiquidShell.tsx`: App chrome / nav rail used by every page; theme switching lives here
- `CoachingCards.tsx`: Parsed markdown coaching display with collapsible sections, section icons, timestamp links
- `CoachingModal.tsx`: Full-page coaching modal with LLM streaming, scope info
- `GameDrawer.tsx`: Side drawer that opens on a game row — stats, coaching, replay actions
- `ReplayPlayer.tsx` (+ `useReplayPlayerStore`, `styles/replay-player.css`): Embedded Dolphin playback surface (uses `embeddedReplay` IPC + `win32Embed` on Windows)
- `RadarChart.tsx`: 6-axis player radar (neutral, conversion, L-cancel, recovery, edgeguard, DI)
- `CommandPalette.tsx`: Ctrl+K quick navigation and import
- `StockTimeline.tsx`: Visual stock progression timeline
- `TweaksPanel.tsx`: Live developer/user tweak panel
- `ErrorBoundary.tsx`, `Tooltip.tsx`, `NavIcons.tsx`, plus shared primitives in `components/ui/`

## TypeScript Configuration

- **CommonJS project** (`"type": "commonjs"` in package.json)
- `"module": "nodenext"`, `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`
- Main/preload compiled via `tsconfig.main.json` (extends base, outputs to `dist/main/`)
- Renderer excluded from main tsconfig; built by Vite with `@vitejs/plugin-react`
- Use `@slippi/slippi-js/node` entry point (not the default export)

## Critical: slippi-js Conversion Semantics

- `conversion.playerIndex` = the **victim** (player who received damage), NOT the attacker
- `conversion.moves[].playerIndex` = the attacker
- To get "conversions I landed": filter where `c.playerIndex === opponentIndex`
- `overall.openingsPerKill`: `count` = openings, `total` = kills
- `overall.damagePerOpening`: `count` = total damage, `total` = openings

## Adding a new IPC channel

A single IPC channel touches four files; missing any one of them produces silent failures:

1. Implement the handler in `src/main/handlers/<area>.ts`
2. Register it on `ipcMain` in `src/main/ipc.ts`
3. Expose it on `window.clippi` in `src/preload/index.ts`
4. Type it on the `Window` interface in `src/renderer/global.d.ts`

The renderer can only see what `preload/index.ts` exposes — adding the handler alone won't reach the UI.

## Tests

Vitest with global APIs enabled, looking at `tests/**/*.test.ts`. Existing suites cover: pipeline math (`pipeline.test.ts`), config IO (`config.test.ts`), DB schema/queries (`db.test.ts`), importer dedup (`importer.test.ts`), library filters (`libraryFilter.test.ts`), sparkline rendering (`sparkline.test.ts`), themes (`themes.test.ts`), and the global Zustand store (`useGlobalStore.test.ts`). Add tests when changing parsing, importer, DB, config, pipeline, or store behavior.

## Environment

- API keys loaded from `key.env` at project root (dev — `scripts/dev.js` injects them into `process.env`) or app resources (prod) — never commit this file. The renderer never sees raw keys; it calls main-process IPC which holds them.
- Config and DB live in `~/.magi-melee/`
- Test replays in `test-replays/`
- ESLint + Prettier are configured at the repo root; Prettier defaults are 2-space indent, semicolons, double quotes, trailing commas, `printWidth: 120`.
