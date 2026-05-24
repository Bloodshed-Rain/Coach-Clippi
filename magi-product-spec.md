# MAGI: Product Spec

## Vision

MAGI (Melee Analysis through Generative Intelligence) is a cross-platform
desktop app that turns Slippi replay data into personalized AI coaching — and
tracks your improvement over time. It's the tool that sits next to your Slippi
setup, watches your games, tells you what to fix, and shows you whether you're
actually fixing it.

No other tool does this. Existing Melee stats tools show you numbers. Human
coaches cost $20-60/hr and can't watch every set. MAGI gives you a
coach that's always on, remembers everything, and costs pennies per analysis.

---

## Core Features

### 1. Replay Analysis

Drop in .slp files → get structured coaching feedback.

The pipeline (`src/pipeline/`) parses replays via slippi-js, computes a
GameSummary + DerivedInsights + character signature stats + highlights, feeds
everything to an LLM, and returns structured coaching analysis.

**Built:**
- Full data pipeline: `processGame.ts`, `playerSummary.ts`, `signatureStats.ts`,
  `derivedInsights.ts`, `adaptation.ts`, `highlights.ts`
- Multi-provider LLM integration with streaming (OpenRouter, Gemini, Anthropic,
  OpenAI, local/Ollama)
- Prompt assembly with player history context (`assembleUserPrompt`,
  `assembleAggregatePrompt`, `assembleDiscoveryPrompt`)
- 26 character-specific signature stat detection
- Highlight detection (zero-to-deaths, spike kills, high-damage conversions,
  4-stocks, JV5s, JV4s)
- Hash-based replay dedup (SHA-256)
- Worker-based parallel parsing (`parsePool.ts`)

---

### 2. Session Tracking & Player Profile

Every replay analyzed gets stored in a local SQLite database, building a
longitudinal profile of the player.

**Player Profile:**
- Connect code / tag (auto-detected or configured)
- Main character(s) (auto-detected from replay frequency)
- Skill indicators (L-cancel rate, conversion rate, neutral win rate,
  edgeguard rate, DI scores)
- Radar chart visualization (6-axis: neutral, conversion, L-cancel, recovery,
  edgeguard, DI)
- Total games tracked, overall record
- Matchup records (per opponent, per character, per stage)

**Per-Session Record:**
- Date / time range
- Games played (with links to full analysis)
- Opponents faced (characters, tags)
- Win/loss record
- Key stats snapshot
- AI coaching summary for the session (scoped analysis)

**Storage:** SQLite via `better-sqlite3`. Local-first, no server needed. Database
lives at `~/.magi-melee/magi.db`.

---

### 3. Multi-Scope Coaching Analysis

Beyond per-game coaching, MAGI supports multiple analysis scopes:

- **Game-level:** Individual replay coaching with timestamp citations
- **Session/Set-level:** Cross-game adaptation analysis, set narratives
- **Aggregate:** Character-scoped, stage-scoped, opponent-scoped analysis
  over many games (e.g., "How do I play against Marth overall?")
- **Discovery:** Deep pattern recognition using correlation matrices and
  situational splits to find hidden patterns (fatigue factor, determinants,
  hidden links, pressure leaks)
- **Career:** Lifetime analysis across all data

---

### 4. Stat Trends & Progress Tracking

Aggregate stats across sessions to show trends over time.

**Tracked metrics (per matchup and overall):**
- Neutral win rate
- Openings per kill
- Conversion rate
- Average damage per opening
- L-cancel rate
- Recovery success rate
- Edgeguard attempts & success rate
- Ledge option entropy
- Knockdown option entropy
- Shield pressure response entropy
- Shield pressure damage & break rate
- DI quality scores (survival, combo escape, average combo length)
- Power shield count
- Average death percent
- Character signature stats (per-character move metrics)

**Trend views:**
- Recent games dashboard with sparklines
- Per-matchup breakdown
- Per-stage breakdown
- Character-specific stat pages with signature stat aggregation
- AI trend commentary (generated on demand via scoped coaching)

---

### 5. Replay Folder Watching (Auto-Import)

Point MAGI at your Slippi replay folder. It watches for new .slp files,
auto-imports them, and optionally runs analysis immediately.

**Built:**
- chokidar-based recursive file watcher (`src/watcher.ts`)
- Auto-import on new replay detection
- Groups replays into sessions by time proximity
- Set detection: same opponent, sequential games (`src/detect-sets.ts`)
- Configurable: auto-analyze on import, or batch-analyze later
- Rate-limited LLM queue to respect API limits (`src/llmQueue.ts`)

---

### 6. Highlight Detection

The pipeline automatically detects and catalogs notable moments from replays:

- **Zero-to-deaths:** Full stock combos from 0%
- **Spike kills:** Edgeguard spikes (dair, etc.)
- **High-damage conversions:** Single openings dealing 100%+ damage
- **4-stocks:** Dominant game wins without losing a stock
- **JV5 / JV4:** Near-perfect or perfect games

Highlights are stored in the database and displayed on the Dashboard and in
game details with type-based color coding and replay navigation links.

---

### 7. Practice Plan Tracking

The coaching analysis produces 3 practice drills per set. The app tracks these:

- Active practice goals (what you're currently working on)
- Progress indicators (are the relevant stats improving?)
- History of past practice plans
- AI references past plans in subsequent analyses

---

## App Architecture

### Framework: Electron + React + TypeScript

- **Frontend:** React + TypeScript SPA, built with Vite (`@vitejs/plugin-react`).
  Uses `react-router-dom` for routing, `recharts` for charts, `framer-motion`
  for animations, `react-markdown` for coaching display.
- **Backend:** Electron main process (Node.js) handles file watching, SQLite,
  slippi-js parsing, LLM API calls, and Dolphin integration. IPC handlers
  split into dedicated modules under `src/main/handlers/`.
- **IPC:** Electron's contextBridge + ipcRenderer/ipcMain. Preload exposes
  `window.clippi` with typed IPC invoke wrappers.
- **Build:** electron-builder for cross-platform packaging (Windows, macOS, Linux).

### IPC Handler Modules

- `analysis.ts`: Game, session, aggregate, and discovery analysis; LLM streaming
- `stats.ts`: Records, matchups, stages, recent games, opponents, character data,
  signature aggregates, dashboard highlights, analysis history
- `config.ts`: Config CRUD
- `import.ts`: Replay import, folder scanning
- `llm.ts`: LLM model config, cost estimation, provider selection
- `watcher.ts`: Auto-import via chokidar file watcher
- `dolphin.ts`: Dolphin launcher, ISO validation, replay playback
- `dialog.ts`: File/folder picker dialogs
- `stockTimeline.ts`: Stock timeline data generation

### Data Flow

```
[Slippi Replay Folder]
    │
    ▼
[File Watcher] ──► detects new .slp files
    │
    ▼
[Parse Pool] ──► parallel .slp parsing via worker threads
    │
    ▼
[Pipeline] ──► processGame → playerSummary + signatureStats +
               derivedInsights + highlights
    │
    ├──► [SQLite] ──► store structured stats, highlights, signature stats
    │
    └──► [LLM Queue] ──► rate-limited coaching analysis (streaming)
            │
            ▼
        [UI] ──► coaching cards, highlights, trends, radar charts
```

### Local Database Schema

```sql
player_profile (
    id, connect_code, display_name, created_at
)

sessions (
    id, started_at, ended_at,
    games_played, games_won, ai_summary
)

games (
    id, session_id, replay_path, replay_hash,
    played_at, stage, duration_seconds, game_number,
    player_character, opponent_character,
    player_tag, opponent_tag, opponent_connect_code,
    result, end_method,
    player_final_stocks, player_final_percent,
    opponent_final_stocks, opponent_final_percent
)

game_stats (
    game_id,
    neutral_wins, neutral_losses, neutral_win_rate,
    openings_per_kill, conversion_rate,
    avg_damage_per_opening, kill_conversions,
    l_cancel_rate, wavedash_count,
    recovery_attempts, recovery_success_rate,
    edgeguard_attempts, edgeguard_success_rate,
    ledge_entropy, knockdown_entropy, shield_pressure_entropy,
    shield_pressure_sequences, shield_pressure_avg_damage,
    shield_breaks, shield_poke_rate,
    di_survival_score, di_combo_score,
    di_avg_combo_length_received, di_avg_combo_length_dealt,
    power_shield_count,
    avg_death_percent, total_damage_dealt, total_damage_taken
)

coaching_analyses (
    id, game_id, session_id,
    model_used, prompt_tokens, completion_tokens,
    analysis_text, scope, scope_identifier, title,
    created_at
)

practice_plans (
    id, coaching_analysis_id, created_at,
    drill_1, drill_2, drill_3,
    status (active/completed/abandoned)
)

character_signature_stats (
    game_id, signature_json
)

highlights (
    id, game_id, type, label, description,
    character, victim, start_frame, timestamp,
    damage, start_percent, did_kill,
    moves_json, stock_number
)
```

---

## UI Screens

### 1. Dashboard (Home)
- Recent games (100) with W/L indicators and character icons
- Overall record display
- Dashboard highlights (notable moments from recent games)
- Recent highlight clips with type-based color coding
- Onboarding flow for first-time setup (target player, folder, model)
- Quick-import and analysis buttons

### 2. Sessions
- Tournament-style set view (games grouped by opponent + time proximity)
- Opponent search/filter
- Session-scoped coaching analysis with streaming
- Per-game detail expansion with full stat breakdown

### 3. History
- Complete analysis history across all scopes
- Filter by: Game, Session, Character, Stage, Opponent, Discovery, Recent, Career
- Scope badge system with color coding
- CoachingCards display with collapsible sections
- Search and pagination

### 4. Trends
- Recent games (200) stat visualization
- Stage performance breakdown
- Character-specific trend data
- Scoped coaching analysis (on-demand trend commentary)

### 5. Characters
- Character list with usage stats
- Per-character matchup records
- Per-character stage breakdown
- Signature stat aggregation (character-specific move metrics)

### 6. Profile
- Overall record and stats
- Matchup records (per opponent character)
- Stage records
- Game history with win/loss breakdown
- Radar chart (6-axis player performance visualization)

### 7. Settings
- Target player tag + connect code
- Slippi replay folder path
- Auto-import toggle
- LLM provider + model selection
- API keys (OpenRouter, Gemini, Anthropic, OpenAI)
- Local model endpoint configuration
- Dolphin path
- Theme / color mode

---

## Phased Roadmap

### Phase 1: Core Pipeline + CLI ✅
**Goal:** Validate the analysis quality, get early feedback.

- [x] Data pipeline (slippi-js → GameSummary + DerivedInsights)
- [x] LLM integration (multi-provider: OpenRouter, Gemini, Anthropic, OpenAI, local)
- [x] CLI output: `npx tsx src/pipeline-cli.ts <file.slp>`
- [x] Prompt assembly (system prompt + user prompt + player context)
- [x] Character signature stats (26 characters)

### Phase 2: Local Database + Stat Tracking ✅
**Goal:** Persistent player profile with trend data.

- [x] SQLite database setup (better-sqlite3, 5 migrations)
- [x] Auto-import from replay folder (chokidar file watcher)
- [x] Session detection (group games by time)
- [x] Set detection (same opponent, sequential games)
- [x] Stat storage per game (game_stats table with 25+ columns)
- [x] Hash-based replay dedup (SHA-256)
- [x] Worker-based parallel parsing

### Phase 3: Desktop App (MVP) ✅
**Goal:** Visual interface, accessible to non-technical players.

- [x] Electron app shell with IPC handler architecture
- [x] Dashboard, Sessions, Characters, Trends, Profile, Settings pages
- [x] Command palette (Ctrl+K / Cmd+K quick navigation)
- [x] Replay import (folder scanning + drag-and-drop)
- [x] Settings screen (folder path, API keys, model selection, theme)
- [x] Coaching analysis rendered in-app (CoachingCards with collapsible sections)
- [x] LLM streaming support for all providers
- [x] Onboarding flow for first-time users
- [x] Cross-platform packaging (Windows, macOS, Linux)

### Phase 4: Full Trend Experience ✅
**Goal:** The "keep opening the app" loop.

- [x] Radar chart visualization (6-axis player performance)
- [x] Matchup and stage matrices (Characters + Profile pages)
- [x] Multi-scope coaching (game, session, aggregate, discovery)
- [x] Highlight detection and display (zero-to-deaths, spikes, JVs)
- [x] Analysis history with scope filtering (History page)
- [x] Character signature stat aggregation
- [x] Practice plan tracking with progress indicators (Practice page)
- [x] Sparkline trend visualizations (Dashboard, Trends)

### Phase 5: Polish ✅
**Goal:** Retention features.

- [x] Replay folder auto-watch as background service
- [x] Opponent scouting (opponent history in Profile page)
- [x] Local model support (Ollama / LM Studio integration)
- [x] Theming (light/dark mode, color scheme selection)
- [x] External Dolphin launch from replay buttons and coaching timestamps

---

## Model & Cost Strategy

**Implemented providers:**
- **Gemini 2.5 Flash** (free tier default): ~$0.00 per analysis on free tier
- **DeepSeek V3 / R1** (via OpenRouter): ~$0.01-0.03 per analysis
- **Claude Sonnet 4** (direct or via OpenRouter): ~$0.10-0.20 per analysis
- **GPT-4o** (direct or via OpenRouter): ~$0.10-0.20 per analysis
- **Local models** (Ollama/LM Studio): free, offline, variable quality

**User pays for their own API usage.** No MAGI server, no subscription.
Users bring their own API key. This keeps the app free and avoids the need for
a backend service.

**Rate limiting:** LLM queue (`src/llmQueue.ts`) processes 1 request at a time
with configurable delay (default 1500ms) to respect free-tier rate limits
(e.g., Gemini 30 RPM).

---

## What Makes This Stick

1. **No competition.** Zero tools do LLM coaching from replay data today.
2. **Longitudinal tracking.** The more you use it, the more valuable it gets.
   Stats tools show you one game. MAGI shows you your trajectory.
3. **Actionable output.** Not just numbers — specific drills, habit callouts,
   trend alerts, timestamp citations. Things you can act on in your next session.
4. **Multi-scope intelligence.** Game-level coaching, aggregate matchup analysis,
   deep discovery correlations, and career-level insights.
5. **Local-first.** No account, no server, no subscription. Your data stays
   on your machine. Appeals to the privacy-conscious FGC audience.
6. **Low cost.** Free with Gemini Flash, pennies with DeepSeek, vs $40/hr for a
   human coach who can't watch every set anyway.

---

## Decisions Made

- **Electron + React.** Stay in TypeScript end-to-end. Faster to ship, mature
  ecosystem, cross-platform.
- **Set detection:** Same opponent within 10-15 minutes = same set. Implemented
  in `src/detect-sets.ts`.
- **Replay dedup:** SHA-256 hash each .slp on import, skip if hash exists in DB.
- **LLM support:** Multi-provider from day one (OpenRouter, Gemini, Anthropic,
  OpenAI, local). Gemini Flash free tier as default.
- **DeepSeek via OpenRouter** as the recommended paid option (best quality/cost).
- **Streaming:** All LLM providers support streaming responses in the UI.
- **Worker parsing:** `parsePool.ts` uses worker threads (CPU count - 2) for
  parallel .slp parsing to avoid blocking the main process.
- **CommonJS project** with strict TypeScript (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`).
