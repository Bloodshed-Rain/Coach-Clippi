# MAGI — Melee Analysis through Generative Intelligence

AI-powered Melee coaching from your Slippi replays.

Import your `.slp` files, get personalized coaching analysis from an LLM, track your stats over time, and spot trends across sessions. No other tool in the Melee ecosystem does this.

![MAGI Dashboard](screenshots/dashboard.png)

---

## What it does

**Click a game, get coached.** MAGI parses your Slippi replay data, computes detailed stats (neutral win rate, L-cancel rate, conversion efficiency, habit patterns, recovery success, and more), then sends structured context to an LLM that returns specific, actionable coaching feedback — not generic advice, but observations grounded in _your_ data.

**Analyze at any scope.** Get coaching for a single game, an entire set, a character matchup, a stage, a specific opponent, or your full career. Every scope assembles the right stats and asks the right questions.

**Deep Discovery.** MAGI mines your entire game history for hidden patterns — running full pairwise correlations across 21 metrics to surface non-obvious relationships, situational win conditions, and tendencies you'd never spot manually. Requires 5+ imported games.

**Track your trajectory.** Every game you import gets stored locally. Over time, MAGI shows you trends: is your neutral game improving? Are your ledge options getting predictable? Are you performing worse in game 3 of a set? Line charts, rolling averages, and AI commentary on your trajectory.

**Know your matchups.** Win/loss records by character, by stage, by opponent. Search your history against any player. Auto-detected sets with scores.

**Scout your rivals.** The Opponent Rivalry Dossier gives you a deep dive into any opponent: head-to-head record, stage and character breakdowns, and AI-generated matchup analysis.

**Bring your own key.** MAGI supports OpenAI, OpenRouter, Anthropic, Google Gemini, and local models (Ollama / LM Studio). Pick a provider in Settings, paste your key, choose a model, and you're coached. No proxy, no shared keys — your replay data and your API spend stay yours.

## Features

### AI Coaching

![MAGI Coaching — matchup analysis](screenshots/coaching-matchup.png)

- **Multi-scope analysis** — coaching for games, sets, characters, stages, opponents, or your full career
- **Deep Discovery** — full pairwise correlation matrix (21 metrics, top 25 by strength) with AI pattern mining for hidden insights and win conditions
- **Streaming AI coaching** — real-time text generation with blinking cursor, no waiting for a full response
- **Player history context** — coaching references your historical trends, improvement areas, and recurring habits
- **Best Moments / Worst Misplays** — coaching highlights your cleanest plays and costliest mistakes with clickable timestamps
- **Dynamic model selection** — Settings dropdown fetches live model lists from all configured providers (Gemini, OpenRouter, Anthropic, OpenAI) with custom model ID support
- **Multi-LLM provider** — OpenAI, OpenRouter (100+ models), Anthropic, Google Gemini, or local via Ollama/LM Studio. Bring your own API key for any provider.
- **Analysis caching** — coaching results stored in the database; clicking the same game twice costs $0
- **Queue management** — LLM calls processed sequentially with queue position feedback, 429 rate-limit handling, and exponential backoff
- **MAGI trend commentary** — AI personality that reacts to your trajectory with blunt, witty feedback

![MAGI Coaching — full career analysis](screenshots/coaching-career.png)

### Oracle & Practice

- **Oracle** — persistent chat page that holds onto your recent games as context; ask it anything about your play and it answers with numbers from _your_ database, not canned advice
- **Practice** — LLM-generated drill plans built from your weakest tracked metrics, with concrete reps/targets you can run in training mode

### Stats & Tracking

- **Per-game stats** — neutral win rate, L-cancel rate, openings per kill, damage per opening, conversion rate, recovery success, death percent, and more
- **26-character signature stats** — character-specific tech tracking (Fox waveshines, Falco pillars, Marth Ken combos, Sheik tech chases, Falcon knees, Puff rests, Peach turnips, and more)
- **Shield pressure tracking** — shield damage, shield breaks, and shield poke rate
- **DI quality estimation** — matchup-aware combo DI and survival DI scoring using character physics (weight, fall speed, combo susceptibility) and opponent combo game strength
- **Habit entropy analysis** — detects predictable patterns in recovery, ledge, tech roll, shield drop, and neutral DI options

### Visualization & Navigation

![Trend charts — rolling averages over time](screenshots/trends.png)

- **Stock timeline** — per-stock strip chart showing duration, damage dealt/taken, kill moves, and momentum shifts
- **Trend charts** — 5-game rolling averages for 9 tracked metrics with area charts and change indicators
- **Command palette** — Cmd/Ctrl+K for quick navigation, fuzzy search, opponent lookup, and actions
- **Character pages** — per-character stats, signature stats, matchup and stage records with character card art

![Character page — Marth](screenshots/characters.png)

- **6 themes** — Liquid Metal (default), Telemetry, Tournament, CRT, Amber, Light

### Opponents & Matchups

![Sessions — game history with results and stats](screenshots/sessions.png)

- **Opponent Rivalry Dossier** — deep dive into any opponent with record, stage/character breakdowns, and AI matchup analysis
- **Matchup & stage records** — win rate bars for every character and stage you've played
- **Set detection** — auto-groups games against the same opponent within 15 minutes
- **Opponent history** — searchable by tag or connect code

### Replay Management

- **Dolphin replay playback** — watch replays with clickable `[M:SS]` timestamps that jump to specific frames
- **Parallel import pipeline** — worker-based parsing, batched DB transactions, async hashing
- **Import progress bar** — real-time progress indicator with file counts, errors, and detailed error logs
- **File watcher** — point at your Slippi replay folder, auto-imports new games as you play
- **SHA-256 deduplication** — never imports the same file twice

### Setup & UX

- **Bring your own key** — pick a provider (OpenAI, OpenRouter, Anthropic, Gemini) in Settings, paste your API key, select a model. No keys are bundled in releases.
- **Local-first** — your data stays on your machine, no account needed, no MAGI server
- **Cross-platform** — Windows, macOS, and Linux

### Under the Hood

- **Database migration system** — seamless schema upgrades across versions
- **Preload consolidation** — single source of truth for the IPC bridge between main and renderer
- **Over-the-air updates** — electron-updater for packaged builds

## Getting Started

### Install

Download the latest release for your platform from the [Releases](https://github.com/Bloodshed-Rain/TheMAGI/releases) page:

- **Windows** — `.exe` installer or portable `.exe`
- **macOS** — `.dmg`
- **Linux** — `.AppImage` or `.deb`

### First-time setup

1. Open the app and go to **Settings**
2. Enter your display name / tag
3. Browse to your Slippi replay folder
4. Open **AI Provider**, pick OpenAI / OpenRouter / Anthropic / Gemini / Local, paste your key, choose a model
5. Import your replays and start getting coached

MAGI does not ship with any API key. Every coaching call uses the key you provide for the active provider. If you'd rather run locally, install Ollama or LM Studio and select **Local** in Settings.

## Development

Building from source requires [Node.js](https://nodejs.org/) 18+.

```bash
git clone https://github.com/Bloodshed-Rain/TheMAGI.git
cd TheMAGI
npm install
npx electron-rebuild
```

```bash
npm run dev          # Dev mode (Vite + Electron)
npm run build        # Full build + package
npm test             # Run tests (vitest)
npm run test:watch   # Watch mode
npm run lint         # ESLint
npm run format       # Prettier
```

Platform-specific builds: `npm run build:linux`, `build:win`, `build:mac`

> **Note:** For dev mode you can drop API keys into `key.env` so they auto-load on startup (the same keys can be entered in Settings instead):
>
> ```
> OPENAI_API_KEY=sk-...
> OPENROUTER_API_KEY=sk-or-...
> ANTHROPIC_API_KEY=sk-ant-...
> GEMINI_API_KEY=AIza...
> ```
>
> `key.env` is gitignored and is **not** bundled into release builds.

### CLI usage (optional)

```bash
# Analyze a single replay
npx tsx src/pipeline-cli.ts path/to/game.slp --target YourTag

# Watch for new replays
npx tsx src/watcher.ts /path/to/replays --target YourTag
```

## Architecture

```
.slp files
    |
    v
[slippi-js parser] --> GameSummary + DerivedInsights
    |
    +--> [SQLite] --> persistent stats, trends, opponent history
    |
    +--> [LLM Queue] --> streaming API calls (OpenAI / OpenRouter / Anthropic / Gemini / local)
              |
              v
          [Coaching Analysis] --> cached in DB, streamed as markdown
```

Three Electron processes communicate via IPC:

- **Main** (`src/main/`) — IPC handlers, pipeline orchestration, file watcher, DB/config management
- **Preload** (`src/preload/`) — `contextBridge` exposing typed `window.clippi` wrappers
- **Renderer** (`src/renderer/`) — React SPA with Vite, pages and components

Key modules:

- `src/pipeline/` — replay parsing, stat computation, habit detection, signature stats, character physics data, prompt assembly
- `src/llm.ts` — multi-provider LLM abstraction with streaming, retry, and rate-limit handling
- `src/db.ts` — SQLite schema, migrations, queries, trend/matchup/opponent data
- `src/importer.ts` — parallel batch import with SHA-256 dedup and progress reporting

## Roadmap

- [x] Multi-provider LLM support (OpenAI, OpenRouter, Anthropic, Gemini, local)
- [x] Local model support (Ollama / LM Studio)
- [x] Character-specific signature stats (26 characters)
- [x] Streaming AI coaching
- [x] Multi-scope analysis (game, set, character, stage, opponent, career)
- [x] Deep Discovery pattern mining
- [x] Opponent Rivalry Dossier
- [x] Oracle chat with recent-games context
- [x] Practice drill plans generated from your weakest metrics
- [x] Command palette
- [x] Dolphin replay playback with clickable timestamps
- [x] 6-theme redesign (Liquid Metal default)
- [x] Parallel import pipeline with queue management
- [x] Dynamic model fetching from all LLM providers
- [x] Best Moments / Worst Misplays timestamp highlights in coaching
- [x] Security hardening — write-only key management, renderer key isolation, npm audit clean
- [ ] Complete character card art (all 26 characters)
- [ ] Dolphin HUD mode (wrap around the emulator window)
- [ ] Practice plan tracking with progress indicators
- [ ] Shareable coaching reports

## Cost

MAGI itself is free and open-source. The only ongoing cost is whatever your chosen LLM provider charges for the model you pick — you pay them directly using your own API key. Local models via Ollama / LM Studio are free.

## License

[MIT](LICENSE)
