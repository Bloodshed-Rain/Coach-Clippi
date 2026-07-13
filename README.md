# MAGI

Melee Analysis through Generative Intelligence.

[![Latest release](https://img.shields.io/github/v/release/Bloodshed-Rain/TheMAGI?label=release)](https://github.com/Bloodshed-Rain/TheMAGI/releases)
[![Build & Release](https://github.com/Bloodshed-Rain/TheMAGI/actions/workflows/build.yml/badge.svg)](https://github.com/Bloodshed-Rain/TheMAGI/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-7ee8c5)](https://github.com/Bloodshed-Rain/TheMAGI/releases)
[![Slippi](https://img.shields.io/badge/Slippi-.slp%20replays-8ea7ff)](https://slippi.gg/)

MAGI is a local-first desktop AI coach for Super Smash Bros. Melee. It turns Slippi `.slp` replays into a searchable performance database, current-form dashboard, AI coaching surface, practice-plan tracker, and replay review workspace.

- **Local-first:** replay data, config, and coaching cache stay on your machine.
- **Replay-native:** built around Slippi files, matchup records, opponent history, session trends, and game-level review.
- **AI-flexible:** use the free no-key fallback, hosted providers, or local OpenAI-compatible models.
- **Made for practice:** convert vague losses into specific patterns, drills, and review targets.

**Website:** [themagi.gg](https://themagi.gg)<br>
**Download:** [GitHub Releases](https://github.com/Bloodshed-Rain/TheMAGI/releases)<br>
**Source:** [github.com/Bloodshed-Rain/TheMAGI](https://github.com/Bloodshed-Rain/TheMAGI)

![MAGI dashboard](screenshots/app-dashboard.png)

## Quick Start

1. Download the latest build from [Releases](https://github.com/Bloodshed-Rain/TheMAGI/releases).
2. Open MAGI and go to **Settings**.
3. Enter your player tag / connect code and select your Slippi replay folder.
4. Click **Import All** to build your local replay database.
5. Open **Dashboard**, **Trends**, **Sessions**, **Characters**, **Game Theater**, **Practice**, or **MAGI Oracle** to start reviewing.
6. Optional: add an AI provider key in Settings, use Pollinations as a no-key fallback, or connect a local OpenAI-compatible server from Ollama / LM Studio.

## Current State

MAGI is currently a Vite + React desktop app with an Electron main process, typed preload bridge, SQLite storage, Slippi replay parsing, multi-provider LLM support, and a redesigned Liquid Metal UI. The active app surface includes:

- **Dashboard** - record, recent form, rolling stat cards, recent games, a recent-highlights reel, and an Oracle summary of your latest games.
- **Library** - filter up to 500 recent games by opponent search, matchup, stage, and result.
- **Trends** - 5-game rolling averages for neutral win rate, L-cancel rate, conversion, damage/opening, openings/kill, and average death percent.
- **Sessions** - calendar-day session cards with win/loss dots, opponent summaries, and cached AI session reports.
- **Characters** - 26-character roster view with character art, played-character records, matchup tables, signature stats, and character-scope coaching.
- **Game Theater** - per-game review route with a Windows-only in-app replay viewer, external Dolphin fallback on other platforms, stock timeline, detected highlights that seek the replay to the moment, game stats, and inline MAGI coaching.
- **Practice** - generated drill plans based on detected weakness patterns, with drill completion tracking.
- **MAGI Oracle** - persistent chat that answers questions from recent local game context.
- **Settings** - player profile, replay folder import, watcher controls, Slippi Dolphin paths, provider setup, themes, density, and data reset.

## Use Cases

- **Find your real problem matchups:** filter by character, stage, opponent, session, or result instead of guessing from memory.
- **Turn replay review into drills:** let generated practice plans target repeated weakness patterns.
- **Ask your recent games questions:** use MAGI Oracle to ask what changed, where you are bleeding stocks, or what to review next.
- **Review games in context:** combine replay launch, stock timelines, stats, and coaching in Game Theater.
- **Relive your best moments:** highlight chips deep-link into the replay viewer at the exact frame of the spike kill, 0-to-death, or signature combo.
- **Track current form:** compare rolling neutral, punish, survival, and conversion trends over recent games.

## Screenshots

![Game Theater replay viewer](screenshots/app-game-theater.png)

![Library filters and game table](screenshots/app-library.png)

![Trend charts](screenshots/app-trends.png)

![Session cards](screenshots/app-sessions.png)

![Character roster](screenshots/app-characters.png)

![MAGI Oracle](screenshots/app-oracle.png)

![Practice plans](screenshots/app-practice.png)

## What MAGI Tracks

MAGI imports Slippi games into a local SQLite database and computes replay-derived stats including:

- result, stage, duration, stocks, characters, opponent tag, and connect code
- neutral wins/losses and neutral win rate
- L-cancel rate, wavedashes, dash-dance frames, platform time, air time, and ledge time
- openings, conversions, damage per opening, openings per kill, and kill conversions
- recovery attempts and recovery success rate
- edgeguard attempts and edgeguard success rate
- shield pressure, shield breaks, shield poke rate, and powershields
- DI survival and combo-quality estimates
- habit entropy for ledge, knockdown, shield pressure, and related decision patterns
- character-specific signature stats stored per game
- highlights such as high-damage conversions, spike kills, 0-to-deaths, 4-stocks, comebacks, and character signature moments (Ken combos, shine spikes, rest kills, wobbles, and more) — shown on the Dashboard and in Game Theater, where clicking one jumps the replay to that moment

## AI Coaching

MAGI supports both no-key and bring-your-own-key workflows:

- **Pollinations** is available as a free no-key fallback.
- **OpenAI**, **OpenRouter**, **Anthropic**, and **Google Gemini** can be configured in Settings.
- **Local OpenAI-compatible models** can be used through Ollama or LM Studio.
- Model selection is provider-aware, and Settings can fetch model lists for configured providers.
- Analysis calls are queued, streamed into the UI, retried on transient failures, and cached locally when possible.

Coaching currently appears in the dashboard Oracle summary, game theater coaching panel, character-scope analysis modal, daily session reports, generated practice plans, and the Oracle chat.

Example questions to ask MAGI Oracle:

- “Why am I losing to Marth this week?”
- “What changed in my last 20 games?”
- “Which opponent habits am I failing to punish?”
- “What should I drill today if I only have 30 minutes?”

## Replay Review

MAGI can launch Slippi Dolphin from stored replay paths and jump to specific frames from timestamps.

The in-app replay viewer shown in the screenshots is Windows-only. On Windows, MAGI can position Slippi Dolphin inside the Game Theater route so the replay, stock timeline, stats, and coaching live in one review workspace. On macOS and Linux, replay review uses the external Dolphin launch path when configured; those platforms do not embed the replay surface inside the MAGI window.

Settings accepts optional paths for the Slippi Dolphin executable and Melee ISO. Replay files stay on your machine.

## Local Data And Security

- Database: `~/.magi-melee/magi.db`
- Config: `~/.magi-melee/config.json`
- Development env keys: `key.env` copied from `.env.example`

MAGI does not require an account or a MAGI-hosted backend. API keys are either entered locally in Settings or loaded from local environment files during development. Do not commit `key.env`, local replay data, or personal database files.

## Install

Download builds from the [Releases](https://github.com/Bloodshed-Rain/TheMAGI/releases) page:

- Windows: installer `.exe` or portable `.exe`
- macOS: `.dmg`
- Linux: `.AppImage` or `.deb`

## Development

Requires Node.js 18+.

```bash
git clone https://github.com/Bloodshed-Rain/TheMAGI.git
cd TheMAGI
npm install
```

Useful commands:

```bash
npm run dev          # Vite renderer + compiled main/preload + Electron
npm run build        # TypeScript + Vite + electron-builder package
npm run build:win    # Windows package
npm run build:mac    # macOS package
npm run build:linux  # Linux package
npm test             # Vitest once
npm run test:watch   # Vitest watch mode
npm run lint         # ESLint over src/
npm run format       # Prettier over src/**/*.{ts,tsx}
```

For AI features in development, copy `.env.example` to `key.env` and fill only the providers you use:

```bash
OPENAI_API_KEY=
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
```

The same keys can be entered through Settings in the app.

## Optional CLI Workflows

```bash
# Analyze a single replay
npx tsx src/pipeline-cli.ts path/to/game.slp --target YourTag

# Watch for new replays
npx tsx src/watcher.ts /path/to/replays --target YourTag
```

## Architecture

```text
.slp replays
  -> Slippi parser / parse workers
  -> derived stats, signature stats, highlights
  -> SQLite database in ~/.magi-melee
  -> React UI queries through Electron IPC
  -> queued LLM analysis, streaming, and cached reports
```

Key areas:

- `src/main/` - Electron main process, IPC registration, native replay embedding, updater, dialogs, config, watcher, import, stats, LLM, and Dolphin handlers.
- `src/preload/` - typed `window.clippi` bridge exposed to the renderer.
- `src/renderer/` - Vite + React app, routes, shared components, stores, hooks, themes, and styles.
- `src/pipeline/` - Slippi processing, derived insights, character data, signature stats, highlights, prompt assembly, and player summaries.
- `src/db.ts` - SQLite schema, migrations, inserts, queries, Oracle messages, practice plans, session reports, and trend data.
- `tests/` - Vitest coverage for config, database behavior, importer, pipeline, filters, navigation consistency, stores, sparklines, replay-player state, and themes.

## Current Boundaries

- The redesigned screenshots intentionally omit Settings so local API keys or paths are not exposed.
- The in-app replay viewer is Windows-only. Non-Windows platforms use external Dolphin launch behavior when replay paths and Dolphin settings are configured.
- Pollinations provides a no-key fallback, but paid or self-hosted providers are still the more controllable path for serious usage.
- The website and README describe the current app surface, not a hosted service. MAGI is still a local desktop app.

## License

[MIT](LICENSE)
