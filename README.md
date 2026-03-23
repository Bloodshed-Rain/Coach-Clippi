# MAGI — Melee Analysis through Generative Intelligence

AI-powered Melee coaching from your Slippi replays.

Import your `.slp` files, get personalized coaching analysis from an LLM, track your stats over time, and spot trends across sessions. No other tool in the Melee ecosystem does this.

---[Screencast_20260319_190122.webm](https://github.com/user-attachments/assets/e41e7616-ed56-41b9-aa28-3ef38f0d0d97)

## Screenshots

### Coaching — Click any game for AI analysis
![Coaching tab](screenshots/Screenshot_20260319_191141.png)

### AI Coaching Analysis — Expanded
![Coaching analysis expanded](screenshots/Screenshot_20260319_191208.png)

### Trends — Line charts with MAGI commentary
![Trends with AI commentary](screenshots/Screenshot_20260319_191347.png)

### Profile — Player radar chart and matchup records
![Profile tab](screenshots/Screenshot_20260319_191401.png)

### Sessions — Opponent history
![Sessions tab](screenshots/Screenshot_20260319_191239.png)

### Characters — Grid view with card art
![Characters grid](screenshots/Screenshot_20260319_191414.png)

### Characters — Detail view with signature stats
![Characters detail](screenshots/Screenshot_20260319_190919.png)

---

## What it does

**Click a game, get coached.** MAGI parses your Slippi replay data, computes detailed stats (neutral win rate, L-cancel rate, conversion efficiency, habit patterns, recovery success, and more), then sends structured context to an LLM that returns specific, actionable coaching feedback — not generic advice, but observations grounded in *your* data.

**Track your trajectory.** Every game you import gets stored locally. Over time, MAGI shows you trends: is your neutral game improving? Are your ledge options getting predictable? Are you performing worse in game 3 of a set? Line charts, rolling averages, and AI commentary on your trajectory.

**Know your matchups.** Win/loss records by character, by stage, by opponent. Search your history against any player. Auto-detected sets with scores.

**Scout your rivals.** The Opponent Rivalry Dossier gives you a deep dive into any opponent: head-to-head record, stage and character breakdowns, and AI-generated matchup analysis.

**No setup required.** Gemini 2.5 Flash free tier is the default LLM — just open the app and start importing replays. No API key needed to get started.

## Features

### AI Coaching
- **Streaming AI coaching** — real-time text generation with blinking cursor, no waiting for a full response
- **Player history context** — coaching references your historical trends, improvement areas, and recurring habits
- **Multi-LLM provider** — OpenRouter (full model catalog), Gemini direct, Anthropic direct, OpenAI direct, or local models via Ollama/LM Studio
- **Analysis caching** — coaching results stored in the database; clicking the same game twice costs $0
- **Rate-limited API queue** — LLM calls processed one at a time with backoff, handles 429 rate limits gracefully
- **MAGI trend commentary** — AI personality that reacts to your trajectory with blunt, witty feedback

### Stats & Tracking
- **Per-game stats** — neutral win rate, L-cancel rate, openings per kill, damage per opening, conversion rate, recovery success, death percent, and more
- **26-character signature stats** — character-specific tech tracking (Fox waveshines, Falco pillars, Marth Ken combos, Sheik tech chases, Falcon knees, Puff rests, Peach turnips, and more)
- **Shield pressure tracking** — shield damage, shield breaks, and shield poke rate
- **DI quality estimation** — survival DI and combo DI scoring
- **Player archetype detection** — six-axis radar (Neutral, Punish, Tech Skill, Defense, Aggression, Consistency)
- **Habit entropy analysis** — detects predictable patterns in your play

### Visualization & Navigation
- **Stock timeline** — per-stock strip chart showing duration, damage dealt/taken, kill moves, and momentum shifts
- **Trend charts** — 5-game rolling averages for every tracked stat with visual line graphs
- **Command palette** — Cmd/Ctrl+K for quick navigation and search across the app
- **Character pages** — per-character stats, radar charts, signature stats, matchup and stage records with character card art

### Opponents & Matchups
- **Opponent Rivalry Dossier** — deep dive into any opponent with record, stage/character breakdowns, and AI matchup analysis
- **Matchup & stage records** — win rate bars for every character and stage you've played
- **Set detection** — auto-groups games against the same opponent within 15 minutes
- **Opponent history** — searchable by tag or connect code

### Replay Management
- **Dolphin replay playback** — watch replays with clickable timestamps that jump to specific moments
- **Import progress bar** — real-time progress indicator during bulk imports
- **File watcher** — point at your Slippi replay folder, auto-imports new games as you play
- **SHA-256 deduplication** — never imports the same file twice

### Onboarding & UX
- **Zero-friction onboarding** — Gemini 2.5 Flash free tier is the default LLM, no API key needed
- **Onboarding wizard** — 4-step guided setup on first launch
- **Light/dark mode** — clean toggle in the sidebar
- **Local-first** — your data stays on your machine, no account needed, no server
- **Cross-platform** — Windows, macOS, and Linux

### Under the Hood
- **Database migration system** — seamless schema upgrades across versions
- **Preload consolidation** — single source of truth for the IPC bridge between main and renderer
- **Over-the-air updates** — electron-updater for packaged builds

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- Slippi replay files (`.slp`)

### Install

```bash
git clone https://github.com/Bloodshed-Rain/TheMAGI.git
cd TheMAGI
npm install
npx electron-rebuild
```

### Run

```bash
npm run dev
```

### First-time setup

1. Open the app — the onboarding wizard walks you through setup
2. Enter your display name / tag
3. Browse to your Slippi replay folder
4. Import your replays and start getting coached

AI coaching works out of the box with Gemini 2.5 Flash (free tier). To use a different provider, go to **Settings** and configure your preferred LLM and API key.

### CLI usage (optional)

```bash
# Analyze a single replay
npx tsx src/pipeline-cli.ts path/to/game.slp --target YourTag

# Watch for new replays
npx tsx src/watcher.ts /path/to/replays --target YourTag
```

## Development

```bash
npm run dev          # Dev mode (Vite + Electron)
npm run build        # Full build + package
npm test             # Run tests (vitest)
npm run test:watch   # Watch mode
npm run lint         # ESLint
npm run format       # Prettier
```

Platform-specific builds: `npm run build:linux`, `build:win`, `build:mac`

## Architecture

```
.slp files
    |
    v
[slippi-js parser] --> GameSummary + DerivedInsights
    |
    +--> [SQLite] --> persistent stats, trends, opponent history
    |
    +--> [LLM Queue] --> streaming API calls (OpenRouter/Gemini/Claude/OpenAI/local)
              |
              v
          [Coaching Analysis] --> cached in DB, streamed as markdown
```

Three Electron processes communicate via IPC:
- **Main** (`src/main/`) — IPC handlers, pipeline orchestration, file watcher, DB/config management
- **Preload** (`src/preload/`) — `contextBridge` exposing typed `window.api` wrappers
- **Renderer** (`src/renderer/`) — React SPA with Vite, pages and components

Key modules:
- `src/pipeline/` — replay parsing, stat computation, habit detection, signature stats, prompt assembly
- `src/llm.ts` — multi-provider LLM abstraction with streaming, retry, and rate-limit handling
- `src/db.ts` — SQLite schema, migrations, queries, trend/matchup/opponent data
- `src/importer.ts` — batch import with SHA-256 dedup and progress reporting

## Roadmap

- [x] Multi-provider LLM support (OpenRouter, Claude, GPT-4o, Gemini, local)
- [x] Local model support (Ollama / LM Studio)
- [x] Character-specific signature stats (26 characters)
- [x] Streaming AI coaching
- [x] Opponent Rivalry Dossier
- [x] Onboarding wizard
- [x] Command palette
- [x] Dolphin replay playback with clickable timestamps
- [ ] Dolphin HUD mode (wrap around the emulator window)
- [ ] Practice plan tracking with progress indicators
- [ ] Shareable coaching reports

## Cost

Not charging anything at this point. If enough people use it to warrant it, I'll implement something to cover API costs. Local LLM models and BYOK will always be supported.

## License

[MIT](LICENSE)
