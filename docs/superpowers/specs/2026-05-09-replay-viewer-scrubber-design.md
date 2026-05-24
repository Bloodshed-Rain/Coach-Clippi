# Replay Viewer — Timeline Scrubber + Polish

**Status:** Design approved 2026-05-09
**Scope:** Windows only (macOS / Linux remain on the existing external-Dolphin fallback, untouched)
**Owner area:** `src/main/handlers/embeddedReplay.ts`, `src/main/native/win32Embed.ts`, `src/renderer/components/ReplayPlayer.tsx`, `src/renderer/stores/useReplayPlayerStore.ts`, `src/renderer/styles/replay-player.css`

## Goal

The in-app replay viewer currently exposes only frame-step (←/→), pause/play (Space), and Restart. Watching a replay against coaching text means either watching it from frame 0 or paying a kill+respawn flash on every Restart. Add a YouTube-style timeline scrubber so the user can see *where* they are in the replay and click/drag to jump anywhere — with the seek experience as smooth as Slippi Dolphin's playback build allows.

## User-facing behavior

```
 ┌──── REPLAY: Marth vs Falco ────────────────────────────── ✕ ──┐
 │                                                                │
 │                    [ Dolphin gameplay ]                        │
 │                                                                │
 │  ━━━━━━━━━━━━━━━━●─────────────────────────  1:42 / 6:30      │
 │                                                                │
 │  [⏮]  [⏯]  [⏭]   [↺]   [?]         [Open Externally]  esc    │
 └────────────────────────────────────────────────────────────────┘
```

- A new full-width timeline sits between the stage and the existing controls row.
- Filled portion left of the puck = played; empty right = remaining. Right side shows `current / total` as `M:SS`.
- **Click** anywhere on the bar → seek to that frame.
- **Drag** the puck → puck follows the mouse + small `M:SS` tooltip near the cursor; seek IPC fires only on pointer-up.
- **Hover** the bar without dragging → tooltip shows the timestamp at that x-position.
- The puck advances continuously while the replay is playing; freezes on pause; ghosts during a drag.
- During an active seek a black "Seeking…" overlay covers the stage div until Dolphin reports ready, masking any reload flash.
- Existing buttons (frame-step / pause / restart / Open Externally) keep their positions and behavior. A new `?` button shows a hotkey list (Space, ←/→, Esc) on hover.

The scrubber is **not** rendered when the embed result returns `embedded: false` (i.e. on macOS/Linux, or when Dolphin can't be located). Those paths still fall through to launching external Dolphin and the scrubber would be meaningless.

## Mechanism

### Total duration

Derived from `DrawerGame.durationSeconds` (the `duration_seconds` column on the `games` row, written at import time by the pipeline as `framesToSeconds(lastFrame - FIRST_PLAYABLE)` — the gameplay range, excluding pre-Go countdown). At each `openPlayer` call site we compute `totalFrames = Math.floor(durationSeconds * 60)` and pass it to the store. No DB schema change. If `durationSeconds` is missing or zero, the scrubber is **not rendered** — frame-step, pause, restart, and Open Externally still work. We don't fake a scrubber without a duration.

### Current frame (puck position)

Wall-clock estimate, computed in `ReplayPlayer.tsx` (not in the store — we don't want a 30 Hz global re-render):

```
estimateFrame(playStartFrame, playStartWallTime, now, isPaused, pausedAtWallTime) =
  isPaused
    ? playStartFrame + (pausedAtWallTime - playStartWallTime) * 60
    : playStartFrame + (now - playStartWallTime) * 60
```

Anchors are reset on every play, pause, and seek. Drift can only accumulate within a single uninterrupted play span; any user action snaps it back to truth. Puck position updates on a `requestAnimationFrame` loop.

This is a pure function and gets unit tests (see Testing).

### Seek

A spike investigates Slippi Dolphin's playback comm-file `isRealTimeMode` + `mode: "queue"` to determine whether rewriting the comm file mid-playback triggers a live re-seek without exiting Dolphin.

- **If yes (preferred path):** New IPC `replay:embed:liveSeek(sessionId, frame)` rewrites the existing session's comm file with the new `startFrame`. Dolphin re-anchors instantly. No respawn, no flash.
- **If no (fallback):** Reuse the existing kill+respawn path that Restart already takes. Render the "Seeking…" overlay from the moment seek is committed until `replay:embed:ready` arrives.

Either path looks identical to the renderer above the IPC boundary: `useReplayPlayerStore.seekToFrame(frame)` sets `seekState = "seeking"`, calls the IPC, and clears `seekState` on the ready event.

**Time-box:** 2 hours on the spike. If unresolved at 2 hours, commit to the fallback. Document whichever conclusion in `embeddedReplay.ts`.

### Click vs drag

| Pointer event | Effect |
|---|---|
| `pointerdown` on bar (not on puck) | Begin drag at clicked frame; puck jumps to cursor |
| `pointerdown` on puck | Begin drag at current frame |
| `pointermove` while dragging | Puck ghosts to cursor x; tooltip shows target `M:SS`; **no seek IPC** |
| `pointerup` while dragging | Commit seek to final frame; puck snaps to that position; estimate re-anchors |
| Click on bar (no drag) | Same as pointerdown + immediate pointerup → single seek to clicked frame |
| Hover bar (no drag) | Tooltip only; puck stays where it is |

A pointer that leaves the bar mid-drag continues to track based on x-coordinate (clamped to bar bounds). `pointerup` outside the bar still commits.

### State changes (`useReplayPlayerStore`)

Added fields:

```ts
totalFrames: number | null;         // from GameSummary.lastFrame; null = indeterminate
seekState: "idle" | "seeking";      // drives the Seeking overlay
```

`currentFrame` and `isPlaying` are component-local in `ReplayPlayer.tsx` to avoid 30 Hz store churn.

New actions:

```ts
seekToFrame(frame: number): void;   // dispatches IPC; sets seekState
openPlayer signature gains: totalFrames?: number;
```

### Polish items bundled in

1. **Keyboard handler scope (`ReplayPlayer.tsx:200`).** The `window`-scoped `keydown` currently hijacks Space and arrows even when typing in the coaching textarea. Add a guard: skip the handler if `event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target as HTMLElement)?.isContentEditable`. One-line fix.

2. **Hotkey help button.** New `?` button in the controls row. On hover/focus shows a small tooltip listing Space / ←→ / Esc. No keyboard binding for it; it's a discoverability surface, not a feature.

## Failure modes

| Failure | Mitigation |
|---|---|
| Spike concludes live-seek isn't supported | Fall back to kill+respawn path with "Seeking…" overlay. Same scrubber UX, slightly worse seek feel. |
| Frame estimate drifts during a long play | Bounded — every Pause/Play/seek re-anchors. Worst case is a few frames off in the middle of an uninterrupted run. Acceptable; coaching timestamps are second-precision. |
| `durationSeconds` missing or zero for a game row | Scrubber is not rendered for that session. Frame-step / restart / pause / Open Externally still work. |
| User clicks/drags before `status === "ready"` | Buffer as `pendingSeek = frame`; apply when ready. Latest wins; no queue. |
| Resize during playback | `ResizeObserver` re-pings `embed:setBounds` (existing). The "Seeking…" overlay is a normal DOM child of `.replay-player-stage` so it tracks resize for free. |
| Close mid-seek | `useEffect` cleanup cancels the rAF loop and any pending `pendingSeek`. Existing teardown already kills the Dolphin session. |
| Dolphin auto-pauses on focus loss | Estimate keeps running, drifts forward. Next user-driven Pause/Play snaps back. Live with it for v1. |

## Out of scope (explicitly)

- Speed control (slow-mo / fast-forward). Deferred to a follow-up.
- Volume / mute. No reliable Dolphin hook; users mute Dolphin separately.
- macOS / Linux embedded playback. Untouched in this work; fallback path stays.
- Hover-thumbnail previews on the scrubber (would need a separate headless render).
- Multi-game queue / set playback. Separate feature.
- Persisting last-used speed or dock width. Tied to features not yet built.

## Testing

### Unit (Vitest)

- `estimateFrame` — playing for 1s, 60s, paused, paused-then-resumed, seek-then-resumed, speed=1 (fixed for v1).
- `clampFrame(target, totalFrames)` — drag past end, drag before 0, indeterminate (totalFrames null).
- Seek IPC dispatch — drag emits exactly one IPC on pointer-up regardless of move-event count.

### Manual

- Open a 6-minute replay; watch the puck travel ~1/6 of the bar in a minute.
- Click the bar at 5 distinct positions across the replay; verify Dolphin lands on each (turn HUD on temporarily for QA). The frame Dolphin reports should match the puck's position within a few frames.
- Drag the puck end-to-end without releasing; verify no seek IPC fires until release. Tooltip follows.
- Click at frame 0 — equivalent to current Restart.
- Drag past the right edge of the bar — clamped to `lastFrame`.
- Type "hello world" in the coaching textarea during playback — Space and arrows must **not** reach Dolphin.
- Resize the MAGI window during playback — Dolphin tracks (existing), the scrubber stretches, puck position stays correct relative to bar width.
- Close the player mid-seek — no orphan Dolphin process. Re-open same replay — fresh session.
- Open a game whose row lacks `durationSeconds` (if any in the test DB) — scrubber doesn't render; frame-step, pause, restart still work.

## Implementation file map

- `src/renderer/stores/useReplayPlayerStore.ts` — add `totalFrames`, `seekState`, `seekToFrame`; extend `openPlayer` signature.
- `src/renderer/components/ReplayPlayer.tsx` — render scrubber + tooltip + Seeking overlay + `?` button; wire pointer events; add rAF loop for puck; scope keydown handler to non-input targets; dispatch seeks.
- `openPlayer` call sites — pass `totalFrames` derived from `durationSeconds * 60` where it's known. Sites:
  - `src/renderer/components/GameDrawer.tsx:132` (has `game.durationSeconds`)
  - `src/renderer/components/CoachingModal.tsx:151` (needs to pull duration from the open game)
  - `src/renderer/components/StockTimeline.tsx:120` (caller needs to pass it through)
  - `src/renderer/utils/timestampLinks.tsx:38` (caller needs to pass it through)
  - `src/renderer/components/ReplayPlayer.tsx:223` (Restart — uses the same path; pull `totalFrames` from the store)
- `src/renderer/styles/replay-player.css` — `.replay-scrubber`, `.replay-scrubber-fill`, `.replay-scrubber-puck`, `.replay-scrubber-tooltip`, `.replay-player-seeking-overlay`.
- `src/main/handlers/embeddedReplay.ts` — depending on spike outcome, either add `replay:embed:liveSeek` (live path) or route seek through the existing kill+respawn path. Document conclusion in a comment.
- `src/preload/index.ts` + `src/renderer/global.d.ts` — expose any new IPC the spike concludes is needed.
- `tests/replayPlayer.test.ts` (new) — unit tests for `estimateFrame` and `clampFrame`.
