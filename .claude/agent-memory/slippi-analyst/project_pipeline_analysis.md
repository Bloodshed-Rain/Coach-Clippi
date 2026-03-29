---
name: pipeline-analysis-findings
description: Deep audit of modularized pipeline (processGame, playerSummary, signatureStats, derivedInsights, adaptation, prompt, parsePool, parseWorker, detect-sets, importer, replayAnalyzer, db) — bugs, data integrity, validated patterns (2026-03-22)
type: project
---

Full pipeline audit completed 2026-03-22 after modularization refactor.

## Architecture (Post-Refactor)

Pipeline is now split across `src/pipeline/`:
- `types.ts`: All interfaces (GameSummary, PlayerSummary, DerivedInsights, 26 character sig stat types)
- `helpers.ts`: Frame conversion, action state classifiers, stage bounds, move ID map
- `processGame.ts`: Orchestrator — parses .slp, calls buildPlayerSummary + buildDerivedInsights
- `playerSummary.ts`: Per-player stats (neutral, conversions, movement, recovery, edgeguards, L-cancel, powershield, stocks, Peach turnips, Marth ken combos, signature stats)
- `signatureStats.ts`: Character-specific stat detection for all 26 characters
- `derivedInsights.ts`: Habit profiles, performance by stock, best/worst conversions, key moments timeline
- `adaptation.ts`: Cross-game adaptation signals for multi-game sets
- `prompt.ts`: SYSTEM_PROMPT + assembleUserPrompt for LLM coaching
- `index.ts`: Barrel re-exports

Two import paths exist:
- `importer.ts`: Bulk import (importReplays / importAndAnalyze). Uses transactions. Caches GameResult to avoid re-parsing for LLM.
- `replayAnalyzer.ts`: Single-replay analysis with pluggable AnalysisGenerator. Uses transactions. Dedup via SHA-256 hash.

## Conversion Semantics - VERIFIED CORRECT (2026-03-22)

All modules correctly handle conversion directionality:
- `playerSummary.ts:119`: `myConversions = conversions.filter(c => c.playerIndex !== playerIndex)` — CORRECT
- `derivedInsights.ts`: computePerformanceByStock, findBestConversion, findWorstMissedPunish all correctly use `c.playerIndex === opponentIndex` for "my attacks"
- `signatureStats.ts`: All 26 character handlers iterate `myConversions` correctly
- Stock breakdown correctly uses `c.playerIndex === playerIndex` for openingsGiven (conversions where I'm victim)

## Bugs Found

### BUG 1: opponentIndex hardcoded for ports 0/1 only (playerSummary.ts:261)

```ts
const opponentIndex = playerIndex === 0 ? 1 : playerIndex === 1 ? 0 : 1;
```

This is only used for edgeguard tracking (lines 267-308). If the game uses non-standard ports (e.g., ports 2+3 = indices 1+2, or ports 1+4 = indices 0+3), the opponent index is wrong. The function receives `playerIndex` but never the actual opponent index — it guesses, and guesses wrong for any port combo other than 0/1.

**Impact**: Edgeguard stats (attempts + success rate) will be zero or wildly wrong for non-standard port games. Online Slippi ranked always uses ports 1+2 (indices 0+1), so this only affects friendlies and locals with unusual port assignments.

**Fix**: Pass the opponent's actual playerIndex as a parameter to `buildPlayerSummary`. processGame.ts has both indices available.

### BUG 2: detect-sets.ts duration calculation off by magic constant (line 60)

```ts
const durationSeconds = (stats.lastFrame + 123) / 60;
```

The 123 is `Frames.FIRST_PLAYABLE` (frame -123), so `lastFrame + 123` = total frame count. This is correct for total frames, BUT `processGame.ts:139` uses `lastFrame - Frames.FIRST_PLAYABLE` which is `lastFrame + 123` — same formula. So actually consistent. The difference is detect-sets doesn't import `Frames.FIRST_PLAYABLE` and hardcodes 123. Not a bug per se, but fragile if the constant ever changed.

### BUG 3: Peach float cancel detection is approximate (signatureStats.ts:443-467)

The float cancel detection uses `posY > 0 && posY < 15 && Math.abs(ySpeed) < 1.0` as heuristic for floating. This will miss float cancels at higher altitudes and may false-positive on other low-altitude aerials (e.g., short hop aerials near landing). The type comment says "Not detectable precisely, always 0" but the code does attempt detection. The interface comment says "always 0" — mismatch with implementation.

### BUG 4: Falcon gentleman detection uses hardcoded action states (signatureStats.ts:270-286)

Action states 45, 46, 47 are used for jab2, jab3, rapid jab. These should be verified against actual Melee action state IDs. State.ATTACK_JAB1 is used for jab1, but 45/46/47 are hardcoded. Standard Melee action states: 44=Attack11, 45=Attack12, 46=Attack13, 47=AttackHi3. Wait — 47 is uptilt-related in some references. Need to verify these against slippi-js State enum.

### BUG 5 (from prior audit, FIXED): Marth chainGrabs now includes MOVE_BTHROW

signatureStats.ts:416 now has `const throwIds = [MOVE_FTHROW, MOVE_UTHROW, MOVE_DTHROW, MOVE_BTHROW]` — the prior bug where bthrow was missing is FIXED.

### BUG 6 (from prior audit, FIXED): replayAnalyzer.ts no longer inserts dummy data

The replayAnalyzer now uses `buildInsertGameParams` and `buildInsertGameStatsParams` to insert real parsed data from the AnalysisGeneratorResult. The prior bug where all 'Unknown' dummy data was inserted is FIXED.

### BUG 7 (from prior audit, FIXED): importer.ts no longer double-processes

`importAndAnalyze` now reuses cached `gameResult` objects from import pass (line 237: `result.gameResult`). No re-parsing. FIXED.

### BUG 8 (from prior audit, FIXED): Both importer.ts and replayAnalyzer.ts now use transactions

- `importer.ts:98`: `getDb().transaction(...)` wraps insertGame + insertGameStats + insertSignatureStats
- `replayAnalyzer.ts:279`: `db.transaction(...)` wraps all inserts + coaching analysis

## Data Integrity

### Good
- SHA-256 hash dedup is solid in both import paths
- Transaction wrapping prevents orphaned rows (FIXED from prior audit)
- SQL injection prevention via allowlist in getStatTrend
- Foreign keys enabled (`PRAGMA foreign_keys = ON`)
- Schema migration for new columns (power_shield_count, edgeguard columns)
- `clearAllGames` deletes in correct dependency order

### Concerns
- No CASCADE on foreign keys — if games are deleted outside `clearAllGames`, orphaned game_stats/coaching_analyses/signature_stats remain
- `replayAnalyzer.ts` path 3 (game exists, no analysis, line 254) calls `_generateAnalysis` but discards `gameResult` and `targetPlayer` — only uses `analysisText`. This is fine for the analysis but means the already-stored game data is never updated even if the generator produces different results.
- The two import paths (importer.ts vs replayAnalyzer.ts) are independent. If a replay is imported via one path, the other will detect it via hash and skip. This is correct behavior.

## parsePool.ts / parseWorker.ts - WORKING CORRECTLY (FIXED)

The parsePool has been rewritten with proper pooling:
- Workers are spawned lazily and reused via message passing
- `idle` Set tracks available workers; `activeJobs` Map tracks busy ones
- `dispatch()` correctly finds idle workers or spawns new ones up to poolSize
- Error/exit handlers properly clean up dead workers and reject pending jobs
- `terminate()` cleans up all workers and rejects queued jobs
- The prior bug where workers were spawn-per-job is FIXED

**Remaining concern**: `WORKER_PATH` at line 30 uses `path.resolve(__dirname, "parseWorker.ts")`. In compiled output (dist/main/), this would look for `.ts` file which won't exist. This will work with tsx (dev mode) but may fail in production builds where the file is compiled to `.js`. Need to verify the build output resolves this correctly.

## detect-sets.ts Review

- Correctly filters games under 30 seconds (handwarmers)
- 30-minute gap threshold is reasonable for tournament sets
- Uses same-pair grouping with time proximity
- Sorts by startAt timestamp, falls back to filename
- Non-recursive — only scans top-level directory, won't find replays in subdirectories
- If timestamps are missing from both metadata AND filename, sort is by filepath which may be arbitrary
- Scans full game data (stats, settings, metadata, winners) for each file — heavier than needed for just metadata extraction

## Edge Cases

### Corrupted .slp files
- `processGame.ts`: Two try-catch blocks — one for `new SlippiGame()`, one for `getSettings/getStats/getMetadata/getGameEnd/getFrames`. Both throw descriptive errors with the file path.
- `detect-sets.ts:scanGame`: Returns null on any exception — silently skips corrupted files. Good.
- `importer.ts:importReplays`: Catches errors per-file and logs, continues to next file.

### Very short games
- `detect-sets.ts`: Filters games under 30 seconds — skips handwarmers.
- `processGame.ts`: No minimum duration check. A 1-second game will be processed and may produce weird stats (division by zero in ratios is handled by `ratio()` returning 0 when total is 0).

### Games with weird metadata
- Missing connectCode: Falls back to empty string
- Missing tags: Falls back to port number (`P${player.port}`)
- Missing stageId: Defaults to 0, `getStageName(0)` returns a stage name (probably "Peach's Castle" or similar)
- Missing timestamps: `startAt` is null, which is handled throughout
- 3+ player games: `processGame.ts` throws "Expected 2 players" — correct rejection

### Timeout games
- `endMethodString` returns "timeout" for TIME end method
- Winner detection via `game.getWinners()` — for timeouts, this returns the player with more stocks (or lower damage). If tied, returns empty array, and winner is "Unknown".

**Why:** Post-refactor audit to verify prior bugs are fixed and identify new issues.
**How to apply:** BUG 1 (opponentIndex) is the most impactful remaining bug. The parseWorker path concern should be verified against production builds.
