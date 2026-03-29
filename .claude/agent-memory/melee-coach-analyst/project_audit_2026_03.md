---
name: Pipeline domain audit March 2026
description: Findings from full Melee domain correctness audit of pipeline, stats, LLM, and renderer — updated 2026-03-22
type: project
---

Full audit completed 2026-03-22 covering conversion semantics, edgeguard detection, power shields, recovery tracking, signature stats, DB schema, adaptation signals, coaching prompt, and edge cases.

## Open bugs

1. **Recovery success rate inflation (MEDIUM)**: playerSummary.ts lines 225-255 — when a player dies offstage while `inRecovery=true`, dead frames are skipped (stocksRemaining<=0), then respawn on revival platform triggers `onStage && inRecovery` which increments `recoverySuccesses`. Deaths offstage are counted as successful recoveries. Fix: detect stock transitions and reset `inRecovery` without incrementing success.

2. **Fox upthrowUpairs too strict (LOW)**: signatureStats.ts line 110 requires uthrow as FIRST move (`moves[0].moveId === MOVE_UTHROW`). Misses common nair->grab->uthrow->uair lines. Should use `moves.some()` instead.

3. **Stale comment on Peach floatCancelAerials (LOW)**: types.ts line 216 says "always 0" but signatureStats.ts lines 442-466 has working detection code.

4. **Ganondorf "Side-B Kills" UI label (LOW)**: Characters.tsx line 228 labels it "Side-B Kills" — could be more specific as "Gerudo Dragon Kills" for Melee terminology accuracy.

## Previously found bugs — now confirmed FIXED

- replayAnalyzer.ts INSERT now includes edgeguard_attempts and edgeguard_success_rate columns
- Edgeguard kill detection (playerSummary.ts) works for ALL deaths via prevOppStocks tracking, not just last stock
- Marth chain grab detection includes MOVE_BTHROW
- Adaptation signals include full trajectory arrays

## Confirmed correct

- All conversion.playerIndex semantics (victim) consistently correct across playerSummary.ts, derivedInsights.ts, signatureStats.ts — zero inversions found
- openingsPerKill/damagePerOpening — code uses `.ratio` everywhere, avoiding the inverted .count/.total trap
- Power shield detection logic: projectile reflect (GUARD_REFLECT) + physical powershield (GUARD_SET_OFF within 2-frame window) correct
- DB insertGameStats includes all columns including edgeguard stats
- importer.ts includes edgeguard columns
- Coaching SYSTEM_PROMPT is high quality: demands data citations, timestamp references, matchup-aware, character-specific sig stat guidance
- Adaptation signals: 10 metrics, correct higherIsBetter flags, 3% stability threshold, full per-game trajectories
- Edge cases: timeout/LRAS handled, team games rejected, missing data handled defensively
- All 26 characters have signature stats with reasonable heuristics

**Why:** These are Melee-specific correctness issues affecting stat accuracy and coaching quality.
**How to apply:** Reference when fixing bugs or reviewing pipeline/stat changes. The recovery success rate bug is the highest-priority open issue.
