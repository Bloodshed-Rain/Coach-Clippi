# Replay Viewer Scrubber Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a YouTube-style timeline scrubber to MAGI's in-app Slippi Dolphin replay viewer (Windows-only) — drag-to-seek, click-to-jump, current-frame indicator — plus two polish fixes (keyboard hijack, hotkey discoverability).

**Architecture:** New pure helpers (`scrubber.ts`) drive a presentational `<ReplayScrubber>` component. State lives partly in `useReplayPlayerStore` (`totalFrames`, `seekState`) and partly in `ReplayPlayer.tsx` (current-frame estimate via `requestAnimationFrame`). Seek goes through a single IPC channel `replay:embed:seek` whose handler implementation is decided by a time-boxed spike (Task 4): either Slippi Dolphin's queue+real-time mode supports live re-seek (preferred), or we fall back to kill+respawn masked by a "Seeking…" overlay.

**Tech Stack:** React 19 + TypeScript, Zustand store, Vitest, Electron IPC, koffi FFI to user32 (existing).

**Spec:** `docs/superpowers/specs/2026-05-09-replay-viewer-scrubber-design.md`

---

## File Structure

**Created:**
- `src/renderer/utils/scrubber.ts` — pure helpers: `estimateFrame`, `clampFrame`, `frameToTimestamp`. ~40 lines.
- `src/renderer/components/ReplayScrubber.tsx` — presentational scrubber with pointer logic. ~120 lines.
- `tests/scrubber.test.ts` — unit tests for pure helpers.

**Modified:**
- `src/renderer/stores/useReplayPlayerStore.ts` — add `totalFrames`, `seekState`, `seekToFrame`, extend `openPlayer` signature.
- `tests/useReplayPlayerStore.test.ts` — cover new store fields/actions.
- `src/renderer/components/ReplayPlayer.tsx` — split open vs seek effects, add rAF loop for puck, render scrubber + seeking overlay + `?` button, scope keydown handler.
- `src/renderer/styles/replay-player.css` — scrubber + overlay + help-button styles.
- `src/main/handlers/embeddedReplay.ts` — make `replay:embed:seek` actually seek (live or fallback per Task 4).
- `src/renderer/components/GameDrawer.tsx` — pass `totalFrames` through `openPlayer`.
- `src/renderer/components/CoachingModal.tsx` — pass `totalFrames` through `openPlayer`.
- `src/renderer/components/StockTimeline.tsx` — accept and forward `totalFrames`.
- `src/renderer/utils/timestampLinks.tsx` — accept and forward `totalFrames` through the link factory.

**Untouched on purpose:**
- `src/main/native/win32Embed.ts` — no native changes needed.
- macOS / Linux fallback paths — Windows-only scope.

---

## Task 1: Pure scrubber helpers

**Files:**
- Create: `src/renderer/utils/scrubber.ts`
- Test: `tests/scrubber.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/scrubber.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { estimateFrame, clampFrame, frameToTimestamp } from "../src/renderer/utils/scrubber";

describe("estimateFrame", () => {
  it("returns playStartFrame at zero elapsed", () => {
    expect(estimateFrame(120, 1000, 1000, false, null)).toBe(120);
  });

  it("advances 60 frames per second while playing", () => {
    expect(estimateFrame(0, 1000, 2000, false, null)).toBe(60);
    expect(estimateFrame(0, 1000, 6000, false, null)).toBe(300);
  });

  it("freezes at pausedAtWallTimeMs when paused", () => {
    // Anchored at t=1000, paused at t=2000, current t=10000.
    // Should report 60 frames (1s of play), not 540.
    expect(estimateFrame(0, 1000, 10000, true, 2000)).toBe(60);
  });

  it("falls back to nowMs when paused with null pausedAt", () => {
    expect(estimateFrame(0, 1000, 2000, true, null)).toBe(60);
  });

  it("clamps negative results to zero", () => {
    // Time travel: now < playStartWallTime
    expect(estimateFrame(0, 5000, 1000, false, null)).toBe(0);
  });

  it("preserves a non-zero playStartFrame across elapsed time", () => {
    expect(estimateFrame(300, 1000, 2000, false, null)).toBe(360);
  });
});

describe("clampFrame", () => {
  it("returns target unchanged when in range", () => {
    expect(clampFrame(50, 100)).toBe(50);
  });

  it("clamps above totalFrames - 1", () => {
    expect(clampFrame(200, 100)).toBe(99);
  });

  it("clamps negative to zero", () => {
    expect(clampFrame(-5, 100)).toBe(0);
  });

  it("floors fractional targets", () => {
    expect(clampFrame(50.7, 100)).toBe(50);
  });

  it("returns floored max(0, target) when totalFrames is null", () => {
    expect(clampFrame(50, null)).toBe(50);
    expect(clampFrame(-5, null)).toBe(0);
  });

  it("returns floored max(0, target) when totalFrames is zero", () => {
    expect(clampFrame(50, 0)).toBe(50);
  });
});

describe("frameToTimestamp", () => {
  it("formats zero as 0:00", () => {
    expect(frameToTimestamp(0)).toBe("0:00");
  });

  it("formats sub-minute frames with zero-padded seconds", () => {
    expect(frameToTimestamp(60)).toBe("0:01");
    expect(frameToTimestamp(540)).toBe("0:09");
    expect(frameToTimestamp(600)).toBe("0:10");
  });

  it("formats multi-minute frames", () => {
    expect(frameToTimestamp(3600)).toBe("1:00");
    expect(frameToTimestamp(3660)).toBe("1:01");
    expect(frameToTimestamp(23400)).toBe("6:30");
  });

  it("clamps negative input to 0:00", () => {
    expect(frameToTimestamp(-10)).toBe("0:00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scrubber.test.ts`
Expected: FAIL — module not found / functions undefined.

- [ ] **Step 3: Write the implementation**

Create `src/renderer/utils/scrubber.ts`:

```ts
const SLIPPI_FPS = 60;

/**
 * Estimate Dolphin's current playback frame from wall-clock anchors.
 *
 * - When playing: playStartFrame + (now - playStartWallTime) * 60.
 * - When paused: freezes at pausedAtWallTime (or now if pausedAt is null,
 *   which only happens for the brief moment between toggling pause and the
 *   anchor catching up).
 *
 * Drift can only accumulate within a single uninterrupted play span — every
 * Pause/Play/seek action re-anchors the inputs, snapping back to truth.
 */
export function estimateFrame(
  playStartFrame: number,
  playStartWallTimeMs: number,
  nowMs: number,
  isPaused: boolean,
  pausedAtWallTimeMs: number | null,
): number {
  const referenceMs = isPaused ? (pausedAtWallTimeMs ?? nowMs) : nowMs;
  const elapsedMs = referenceMs - playStartWallTimeMs;
  const frame = playStartFrame + (elapsedMs / 1000) * SLIPPI_FPS;
  return Math.max(0, Math.floor(frame));
}

/**
 * Clamp a target frame to [0, totalFrames - 1]. When totalFrames is null
 * or non-positive (indeterminate-mode safety), return max(0, floor(target)).
 */
export function clampFrame(target: number, totalFrames: number | null): number {
  const floored = Math.floor(target);
  if (totalFrames == null || totalFrames <= 0) return Math.max(0, floored);
  return Math.max(0, Math.min(totalFrames - 1, floored));
}

/** Format a frame number as `M:SS`. Negative input renders as "0:00". */
export function frameToTimestamp(frame: number): string {
  const totalSeconds = Math.max(0, Math.floor(frame / SLIPPI_FPS));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scrubber.test.ts`
Expected: PASS — 13 tests passing.

- [ ] **Step 5: Type-check renderer**

Run: `npx tsc -p tsconfig.main.json --noEmit` (this won't cover the renderer; the renderer is type-checked by Vite at build time, but for a pure utility module a quick separate check is safer).

Run: `npx tsc --noEmit src/renderer/utils/scrubber.ts`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/utils/scrubber.ts tests/scrubber.test.ts
git commit -m "Add pure scrubber helpers (estimateFrame, clampFrame, frameToTimestamp)"
```

---

## Task 2: Extend `useReplayPlayerStore`

**Files:**
- Modify: `src/renderer/stores/useReplayPlayerStore.ts`
- Test: `tests/useReplayPlayerStore.test.ts`

- [ ] **Step 1: Read the existing test file to match patterns**

Run: `cat tests/useReplayPlayerStore.test.ts` (PowerShell: `Get-Content tests/useReplayPlayerStore.test.ts`)

Note the import path and Zustand reset pattern used by the existing tests. The new tests must follow the same pattern.

- [ ] **Step 2: Write the failing tests (append to existing file)**

Append to `tests/useReplayPlayerStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useReplayPlayerStore } from "../src/renderer/stores/useReplayPlayerStore";

describe("useReplayPlayerStore — totalFrames + seek", () => {
  beforeEach(() => {
    useReplayPlayerStore.setState({
      open: false,
      replayPath: null,
      playerCharacter: null,
      opponentCharacter: null,
      startFrame: null,
      seekToken: 0,
      totalFrames: null,
      seekState: "idle",
    });
  });

  it("openPlayer accepts and stores totalFrames", () => {
    useReplayPlayerStore.getState().openPlayer("/r.slp", 0, "Marth", "Falco", 23400);
    expect(useReplayPlayerStore.getState().totalFrames).toBe(23400);
  });

  it("openPlayer leaves totalFrames null when not provided", () => {
    useReplayPlayerStore.getState().openPlayer("/r.slp", 0, "Marth", "Falco");
    expect(useReplayPlayerStore.getState().totalFrames).toBeNull();
  });

  it("seekToFrame bumps seekToken and sets startFrame and seekState", () => {
    useReplayPlayerStore.getState().openPlayer("/r.slp", 0, "Marth", "Falco", 1000);
    const tokenBefore = useReplayPlayerStore.getState().seekToken;
    useReplayPlayerStore.getState().seekToFrame(500);
    const after = useReplayPlayerStore.getState();
    expect(after.startFrame).toBe(500);
    expect(after.seekToken).toBe(tokenBefore + 1);
    expect(after.seekState).toBe("seeking");
  });

  it("setSeekState transitions back to idle", () => {
    useReplayPlayerStore.setState({ seekState: "seeking" });
    useReplayPlayerStore.getState().setSeekState("idle");
    expect(useReplayPlayerStore.getState().seekState).toBe("idle");
  });

  it("closePlayer resets totalFrames and seekState", () => {
    useReplayPlayerStore.getState().openPlayer("/r.slp", 0, "Marth", "Falco", 23400);
    useReplayPlayerStore.setState({ seekState: "seeking" });
    useReplayPlayerStore.getState().closePlayer();
    const s = useReplayPlayerStore.getState();
    expect(s.totalFrames).toBeNull();
    expect(s.seekState).toBe("idle");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/useReplayPlayerStore.test.ts`
Expected: FAIL — `totalFrames`, `seekToFrame`, `setSeekState` undefined.

- [ ] **Step 4: Update the store**

Replace `src/renderer/stores/useReplayPlayerStore.ts` with:

```ts
import { create } from "zustand";

interface ReplayPlayerState {
  open: boolean;
  replayPath: string | null;
  playerCharacter: string | null;
  opponentCharacter: string | null;
  /** Last requested seek frame; bumped via `seekToken` so identical frames
   *  still trigger a re-seek. */
  startFrame: number | null;
  seekToken: number;
  /** Total frames of the open replay. Null when unknown — scrubber hides. */
  totalFrames: number | null;
  /** "seeking" while an in-flight seek IPC is pending; drives the overlay. */
  seekState: "idle" | "seeking";
  openPlayer: (
    replayPath: string,
    startFrame?: number,
    playerCharacter?: string,
    opponentCharacter?: string,
    totalFrames?: number,
  ) => void;
  closePlayer: () => void;
  /** Request a seek within the open session. Bumps seekToken; sets seekState. */
  seekToFrame: (frame: number) => void;
  setSeekState: (state: "idle" | "seeking") => void;
}

export const useReplayPlayerStore = create<ReplayPlayerState>((set, get) => ({
  open: false,
  replayPath: null,
  playerCharacter: null,
  opponentCharacter: null,
  startFrame: null,
  seekToken: 0,
  totalFrames: null,
  seekState: "idle",
  openPlayer: (replayPath, startFrame, playerCharacter, opponentCharacter, totalFrames) => {
    const cur = get();
    if (cur.open && cur.replayPath === replayPath) {
      // Same replay already open — just seek (and refresh totalFrames if provided).
      set({
        startFrame: startFrame ?? null,
        seekToken: cur.seekToken + 1,
        seekState: "seeking",
        ...(totalFrames != null ? { totalFrames } : {}),
      });
      return;
    }
    set({
      open: true,
      replayPath,
      playerCharacter: playerCharacter ?? null,
      opponentCharacter: opponentCharacter ?? null,
      startFrame: startFrame ?? null,
      seekToken: cur.seekToken + 1,
      totalFrames: totalFrames ?? null,
      seekState: "idle",
    });
  },
  closePlayer: () =>
    set({
      open: false,
      replayPath: null,
      playerCharacter: null,
      opponentCharacter: null,
      startFrame: null,
      totalFrames: null,
      seekState: "idle",
    }),
  seekToFrame: (frame) => {
    const cur = get();
    set({
      startFrame: frame,
      seekToken: cur.seekToken + 1,
      seekState: "seeking",
    });
  },
  setSeekState: (state) => set({ seekState: state }),
}));
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/useReplayPlayerStore.test.ts`
Expected: PASS — all new tests + any existing tests.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/stores/useReplayPlayerStore.ts tests/useReplayPlayerStore.test.ts
git commit -m "Extend replay-player store with totalFrames, seekState, seekToFrame"
```

---

## Task 3: Polish — keydown scope guard

**Files:**
- Modify: `src/renderer/components/ReplayPlayer.tsx:186-203`

The window-scoped `keydown` handler hijacks Space and arrow keys even when the user is typing in the coaching textarea. Add a guard.

- [ ] **Step 1: Locate the existing handler**

`ReplayPlayer.tsx:186-203` is currently:

```tsx
useEffect(() => {
  if (!open) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === "Escape") closePlayer();
    if (e.key === " ") {
      onTogglePause();
    }
    if (e.key === "ArrowLeft") {
      onStepBack();
    }
    if (e.key === "ArrowRight") {
      onStepForward();
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, closePlayer, sessionId]);
```

- [ ] **Step 2: Replace with the guarded version**

```tsx
useEffect(() => {
  if (!open) return;
  const handler = (e: KeyboardEvent) => {
    // Don't hijack typing in coaching panels, settings inputs, etc.
    const target = e.target as HTMLElement | null;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable
    ) {
      return;
    }
    if (e.key === "Escape") closePlayer();
    if (e.key === " ") onTogglePause();
    if (e.key === "ArrowLeft") onStepBack();
    if (e.key === "ArrowRight") onStepForward();
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, closePlayer, sessionId]);
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`

1. Open a replay in the player (Windows + Slippi configured).
2. With the player open, click into the coaching textarea on the right side.
3. Type "hello world".
4. Confirm: Space inserts a space character into the textarea, does NOT pause Dolphin.
5. Press ArrowLeft / ArrowRight — they move the textarea cursor, do NOT step Dolphin frames.
6. Click outside the textarea (or close the player and reopen).
7. Press Space — Dolphin pauses (confirms the handler still works when not in an input).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/ReplayPlayer.tsx
git commit -m "Scope replay-player keydown handler to non-input targets"
```

---

## Task 4: Time-boxed spike — Slippi live-seek feasibility

**Files:**
- Read: `src/main/handlers/embeddedReplay.ts:76-93` (`writeCommFile`)
- Document conclusion: comment block at top of `src/main/handlers/embeddedReplay.ts`

This task is research, not TDD. The deliverable is a documented decision, not code. **Time-box: 2 hours**. If unresolved at 2 hours, commit to the fallback path and proceed.

- [ ] **Step 1: Set up the experimental path**

Modify `src/main/handlers/embeddedReplay.ts:76-93` `writeCommFile` to write `isRealTimeMode: true` instead of `false` for queue mode:

```ts
function writeCommFile(commFile: string, replayPath: string, startFrame: number | null): void {
  const seek = startFrame != null ? Math.max(0, Math.floor(startFrame)) : null;
  const data: Record<string, unknown> =
    seek != null
      ? {
          mode: "queue",
          queue: [{ path: replayPath, startFrame: seek }],
          isRealTimeMode: true, // SPIKE: was false; testing live re-seek
          commandId: Math.random().toString(36).slice(2) + Date.now().toString(36),
        }
      : {
          mode: "normal",
          replay: replayPath,
          isRealTimeMode: false,
          commandId: Math.random().toString(36).slice(2) + Date.now().toString(36),
        };
  fs.writeFileSync(commFile, JSON.stringify(data));
}
```

- [ ] **Step 2: Run dev mode and open a replay**

Run: `npm run dev`

Open a replay through the app. Verify it plays normally (real-time mode shouldn't break baseline playback).

- [ ] **Step 3: Trigger a comm-file rewrite mid-playback**

Add a one-off test IPC at the bottom of `embeddedReplay.ts` (you'll remove it after the spike):

```ts
// SPIKE: temporary test handler for live-seek experimentation. REMOVE before merging.
import { ipcMain } from "electron";
ipcMain.handle("replay:embed:spikeRewrite", async (_e, frame: number) => {
  if (!activeSession) return { ok: false, reason: "no session" };
  const newCommandId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const data = {
    mode: "queue",
    queue: [{ path: activeSession.replayPath, startFrame: Math.max(0, Math.floor(frame)) }],
    isRealTimeMode: true,
    commandId: newCommandId,
  };
  fs.writeFileSync(activeSession.commFile, JSON.stringify(data));
  return { ok: true, commandId: newCommandId };
});
```

In the renderer DevTools console, with a replay open at frame 0 and ~30 seconds into playback, run:

```js
await window.require?.("electron").ipcRenderer.invoke("replay:embed:spikeRewrite", 18000)
```

(If `window.require` is unavailable due to context isolation, temporarily expose `spikeRewrite` through the preload bridge for testing.)

- [ ] **Step 4: Observe Dolphin behavior**

Three possible outcomes:

| Observation | Decision |
|---|---|
| Dolphin jumps to frame 18000 (~5min mark) live, no respawn | **GO live-seek path** in Task 5 |
| Dolphin keeps playing as if nothing happened | **NO-GO** — fallback path in Task 5 |
| Dolphin restarts from new frame (visible flash) | Treat as **NO-GO** — same UX as fallback, simpler path |

Watch for at least 5 seconds after the rewrite to confirm.

- [ ] **Step 5: Document the conclusion**

Replace the SPIKE comment in `writeCommFile` with a permanent doc comment at the top of `embeddedReplay.ts` (above the `EmbedSession` interface), summarizing what was learned. Example for NO-GO outcome:

```ts
// Slippi Dolphin's playback build does NOT live-watch the comm file after
// startup, even with isRealTimeMode: true. Verified 2026-05-09 by writing
// queue {startFrame: 18000} into the active comm file mid-playback —
// Dolphin ignored the change. Seek therefore goes through kill+respawn
// (see seekHandler below). The renderer masks the respawn with a "Seeking…"
// overlay over the stage.
```

Example for GO outcome:

```ts
// Slippi Dolphin's playback build watches the comm file for queue updates
// when isRealTimeMode: true. Rewriting the file with a new startFrame and
// fresh commandId triggers a live re-seek with no respawn. Verified
// 2026-05-09. See seekHandler below — live path takes precedence over the
// kill+respawn fallback.
```

- [ ] **Step 6: Remove the SPIKE handler**

Remove the temporary `replay:embed:spikeRewrite` ipcMain handler added in Step 3.

If the outcome was NO-GO, also revert the `isRealTimeMode: true` change in `writeCommFile` (set back to `false`) — keeping it true buys nothing if Dolphin ignores live updates.

If the outcome was GO, leave `isRealTimeMode: true` in place — Task 5's live-seek path needs it.

- [ ] **Step 7: Commit the decision artifact**

```bash
git add src/main/handlers/embeddedReplay.ts
git commit -m "Spike: investigate Slippi live-seek, document outcome"
```

---

## Task 5: Implement the seek IPC handler

**Files:**
- Modify: `src/main/handlers/embeddedReplay.ts:297-301` (`replay:embed:seek` handler)
- Modify: `src/preload/index.ts` (verify `embedReplaySeek` already exposed; add ready/seeked-event listener if needed)

The renderer calls `window.clippi.embedReplaySeek(sessionId, frame)`. Today this writes the comm file but Dolphin ignores it. This task makes it actually seek — using whichever path Task 4 settled on.

### Branch A: Task 4 returned GO (live-seek works)

- [ ] **Step A1: Implement live-seek in the IPC handler**

Replace the existing `replay:embed:seek` handler in `embeddedReplay.ts`:

```ts
safeHandle("replay:embed:seek", async (_e, sessionId: string, frame: number) => {
  if (!activeSession || activeSession.id !== sessionId) return { ok: false, reason: "no session" };
  // Live re-seek: rewrite comm file with new startFrame + fresh commandId.
  // Dolphin (in isRealTimeMode: true) picks up the change without restart.
  writeCommFile(activeSession.commFile, activeSession.replayPath, Math.max(0, Math.floor(frame)));
  return { ok: true, mode: "live" as const };
});
```

(Note: `writeCommFile` writes a fresh `commandId` on every call, so no extra work is needed.)

### Branch B: Task 4 returned NO-GO (fallback path)

- [ ] **Step B1: Implement kill+respawn seek**

Replace the existing `replay:embed:seek` handler with a kill+respawn path. The renderer-facing contract is "seek requested; ready event fires when complete."

```ts
safeHandle("replay:embed:seek", async (_e, sessionId: string, frame: number) => {
  if (process.platform !== "win32") return { ok: false, reason: "windows-only" };
  if (!activeSession || activeSession.id !== sessionId) return { ok: false, reason: "no session" };

  const replayPath = activeSession.replayPath;
  const mainWindow = getMainWindow();
  if (!mainWindow) return { ok: false, reason: "no main window" };

  // Snapshot last known bounds before tearing down — we'll reuse them on
  // respawn so the new Dolphin pins to the same stage rect.
  const lastBounds = lastSessionBounds;
  if (!lastBounds) return { ok: false, reason: "no bounds snapshot" };

  // Tear down current session.
  killSession(activeSession);
  activeSession = null;

  // Spawn a new session at the requested frame with the same bounds.
  // The renderer will receive replay:embed:ready when it's pinned and visible.
  await spawnEmbedSession(replayPath, lastBounds, Math.max(0, Math.floor(frame)));
  return { ok: true, mode: "respawn" as const };
});
```

This requires two supporting changes in `embeddedReplay.ts`:

1. Track `lastSessionBounds` whenever `replay:embed:setBounds` is called or a session is opened. Add at module scope, near `let activeSession: EmbedSession | null = null;`:

```ts
let lastSessionBounds: { x: number; y: number; width: number; height: number } | null = null;
```

2. Update both `replay:embed:open` and `replay:embed:setBounds` handlers to refresh `lastSessionBounds` on every call (the renderer's bounds, not the screen-space bounds — that conversion happens at spawn time).

3. Extract the spawn logic from `replay:embed:open` into a helper `spawnEmbedSession(replayPath, bounds, startFrame)` that both `open` and `seek` can call. The helper performs everything currently inline in the `open` handler from `const { dolphinPath, isoPath } = ...` through the `findDolphinWindows(...)` block. The `replay:embed:open` handler becomes a thin wrapper:

```ts
safeHandle("replay:embed:open", async (_e, args: OpenArgs): Promise<OpenResult> => {
  if (process.platform !== "win32") {
    return { embedded: false, reason: "Embedded playback is only supported on Windows" };
  }
  const safeReplayPath = validatePath(args.replayPath);
  if (activeSession) {
    killSession(activeSession);
    activeSession = null;
  }
  lastSessionBounds = args.bounds;
  return spawnEmbedSession(safeReplayPath, args.bounds, args.startFrame ?? 0);
});
```

Where `spawnEmbedSession` returns the same `OpenResult` shape and performs all the work the `open` handler does today, including emitting `replay:embed:ready`/`error` events.

- [ ] **Step B2: Verify the renderer's existing seek flow works with the new contract**

`ReplayPlayer.tsx`'s existing useEffect on `[open, replayPath, startFrame, seekToken]` already closes + reopens the session on any seek. Branch B's handler does the same thing server-side. To avoid double-tearing-down, gate the renderer effect to fire only on `[open, replayPath]` for opens, and dispatch `embedReplaySeek` only on `[seekToken]` changes after the first open. This is handled in Task 7.

### Both branches: shared follow-up

- [ ] **Step 5.1: Add `seeked` event for symmetry (optional, both branches)**

To let the renderer clear `seekState` deterministically, the main process emits a `replay:embed:seeked` event after the seek IPC call completes. Add to both branches' handlers (after the `writeCommFile` / `spawnEmbedSession` call):

```ts
const win = getMainWindow();
win?.webContents.send("replay:embed:seeked", { sessionId, frame });
```

For Branch B (kill+respawn), the `replay:embed:ready` event already fires when the new session pins — that's a sufficient seeked signal. The explicit `seeked` event is more useful for Branch A where there's no respawn.

- [ ] **Step 5.2: Expose `onEmbedReplaySeeked` in the preload bridge**

In `src/preload/index.ts`, add to the `api` object near the existing `onEmbedReplayReady`:

```ts
onEmbedReplaySeeked: (
  callback: (sessionId: string, frame: number) => void,
): (() => void) => {
  const listener = (_e: unknown, payload: { sessionId: string; frame: number }) =>
    callback(payload.sessionId, payload.frame);
  ipcRenderer.on("replay:embed:seeked", listener);
  return () => ipcRenderer.removeListener("replay:embed:seeked", listener);
},
```

Add the matching type in `src/renderer/global.d.ts` next to the other `onEmbedReplay*` declarations. Find the existing `onEmbedReplayReady` line and add below it:

```ts
onEmbedReplaySeeked: (cb: (sessionId: string, frame: number) => void) => () => void;
```

- [ ] **Step 5.3: Type-check the main process**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: no errors.

- [ ] **Step 5.4: Manual smoke test**

Run: `npm run dev`. Open a replay. After it's playing, open the renderer DevTools and run:

```js
const { sessionId } = useReplayPlayerStore.getState();  // hypothetical accessor; in practice trigger via the UI in Task 7
```

For now, just verify dev mode boots with no main-process errors and a replay still opens normally. Full seek verification happens after Task 7 wires the UI.

- [ ] **Step 5.5: Commit**

```bash
git add src/main/handlers/embeddedReplay.ts src/preload/index.ts src/renderer/global.d.ts
git commit -m "Wire replay:embed:seek to live-seek (or kill+respawn fallback per spike)"
```

---

## Task 6: `ReplayScrubber` component + CSS

**Files:**
- Create: `src/renderer/components/ReplayScrubber.tsx`
- Modify: `src/renderer/styles/replay-player.css` (append scrubber styles)

Pure presentational component. Receives `currentFrame`, `totalFrames`, `onSeek`. Internal state for drag and hover only.

- [ ] **Step 1: Write the component**

Create `src/renderer/components/ReplayScrubber.tsx`:

```tsx
import { useCallback, useRef, useState } from "react";
import { clampFrame, frameToTimestamp } from "../utils/scrubber";

export interface ReplayScrubberProps {
  /** Current playback frame (puck position when not dragging). */
  currentFrame: number;
  /** Total frames of the replay (must be > 0; render nothing otherwise). */
  totalFrames: number;
  /** Called once on pointer-up after a click or drag with the final frame. */
  onSeek: (frame: number) => void;
}

interface DragState {
  ghostFrame: number;
}

export function ReplayScrubber({ currentFrame, totalFrames, onSeek }: ReplayScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverFrame, setHoverFrame] = useState<number | null>(null);

  const frameAtClientX = useCallback(
    (clientX: number): number => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return clampFrame(ratio * totalFrames, totalFrames);
    },
    [totalFrames],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = frameAtClientX(e.clientX);
      setDrag({ ghostFrame: f });
      // Capture so pointermove fires even if the cursor leaves the bar.
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [frameAtClientX],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const f = frameAtClientX(e.clientX);
      if (drag) {
        setDrag({ ghostFrame: f });
      } else {
        setHoverFrame(f);
      }
    },
    [drag, frameAtClientX],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag) return;
      const finalFrame = frameAtClientX(e.clientX);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      setDrag(null);
      onSeek(finalFrame);
    },
    [drag, frameAtClientX, onSeek],
  );

  const onPointerLeave = useCallback(() => {
    if (!drag) setHoverFrame(null);
  }, [drag]);

  const displayFrame = drag ? drag.ghostFrame : currentFrame;
  const fillPct = totalFrames > 0 ? (displayFrame / totalFrames) * 100 : 0;
  const tooltipFrame = drag ? drag.ghostFrame : hoverFrame;
  const tooltipPct = tooltipFrame != null && totalFrames > 0 ? (tooltipFrame / totalFrames) * 100 : 0;

  return (
    <div className="replay-scrubber-row">
      <div
        ref={trackRef}
        className="replay-scrubber-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        role="slider"
        aria-label="Replay timeline"
        aria-valuemin={0}
        aria-valuemax={totalFrames}
        aria-valuenow={Math.floor(displayFrame)}
      >
        <div className="replay-scrubber-fill" style={{ width: `${fillPct}%` }} />
        <div className="replay-scrubber-puck" style={{ left: `${fillPct}%` }} />
        {tooltipFrame != null && (
          <div className="replay-scrubber-tooltip" style={{ left: `${tooltipPct}%` }}>
            {frameToTimestamp(tooltipFrame)}
          </div>
        )}
      </div>
      <div className="replay-scrubber-time">
        {frameToTimestamp(displayFrame)} / {frameToTimestamp(totalFrames)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append the CSS**

Append to `src/renderer/styles/replay-player.css`:

```css
/* ─── Scrubber ─────────────────────────────────────────────────────── */

.replay-scrubber-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px 4px;
  flex-shrink: 0;
}

.replay-scrubber-track {
  position: relative;
  flex: 1;
  height: 18px; /* generous click target around a 4px visual bar */
  cursor: pointer;
  touch-action: none; /* let pointer events handle drag */
}

.replay-scrubber-track::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  transform: translateY(-50%);
}

.replay-scrubber-fill {
  position: absolute;
  left: 0;
  top: 50%;
  height: 4px;
  background: var(--accent, #6ea8ff);
  border-radius: 2px;
  transform: translateY(-50%);
  pointer-events: none;
}

.replay-scrubber-puck {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  border-radius: 50%;
  background: var(--accent, #6ea8ff);
  border: 2px solid var(--surface, #0a0c10);
  transform: translateY(-50%);
  pointer-events: none;
  transition: transform 0.08s ease;
}

.replay-scrubber-track:hover .replay-scrubber-puck {
  transform: translateY(-50%) scale(1.18);
}

.replay-scrubber-tooltip {
  position: absolute;
  bottom: 22px;
  transform: translateX(-50%);
  background: rgba(15, 18, 26, 0.96);
  color: var(--text, #f3f4f6);
  font-size: 11px;
  font-family: ui-monospace, "JetBrains Mono", monospace;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: none;
  white-space: nowrap;
}

.replay-scrubber-time {
  font-size: 11px;
  font-family: ui-monospace, "JetBrains Mono", monospace;
  color: var(--text-muted, #6b7280);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ─── Seeking overlay ──────────────────────────────────────────────── */

.replay-player-seeking-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.92);
  color: var(--text-muted, #9ca3af);
  font-size: 13px;
  z-index: 1;
  pointer-events: none;
}

/* ─── Hotkey help ──────────────────────────────────────────────────── */

.replay-hotkey-help {
  position: relative;
  display: flex;
}

.replay-hotkey-help-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 18, 26, 0.98);
  color: var(--text, #f3f4f6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 3;
}
.replay-hotkey-help:hover .replay-hotkey-help-tooltip,
.replay-hotkey-help:focus-within .replay-hotkey-help-tooltip {
  opacity: 1;
}
.replay-hotkey-help-tooltip kbd {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  padding: 1px 5px;
  margin-right: 4px;
  font-family: ui-monospace, "JetBrains Mono", monospace;
}
```

- [ ] **Step 3: Verify the renderer build picks it up**

Run: `npm run dev` (or just `npx vite build` for a quick type-check pass without launching Electron).

Expected: no TypeScript errors. Component is unused at this point — that's expected; Task 7 wires it.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/ReplayScrubber.tsx src/renderer/styles/replay-player.css
git commit -m "Add ReplayScrubber component and styles"
```

---

## Task 7: Wire the scrubber into `ReplayPlayer`

**Files:**
- Modify: `src/renderer/components/ReplayPlayer.tsx`

This is the biggest task. It does five things:
1. Splits the existing useEffect: open vs seek.
2. Adds the rAF loop that maintains a local `displayFrame`.
3. Renders `<ReplayScrubber>` when `totalFrames > 0`.
4. Renders the seeking overlay when `seekState === "seeking"`.
5. Adds the `?` hotkey help button.

- [ ] **Step 1: Add new imports + store reads**

At the top of `ReplayPlayer.tsx`, add to the existing imports:

```tsx
import { HelpCircle } from "lucide-react";
import { ReplayScrubber } from "./ReplayScrubber";
import { estimateFrame } from "../utils/scrubber";
```

In the component body, after the existing store-state reads, add:

```tsx
const totalFrames = useReplayPlayerStore((s) => s.totalFrames);
const seekState = useReplayPlayerStore((s) => s.seekState);
const setSeekState = useReplayPlayerStore((s) => s.setSeekState);
const seekToFrame = useReplayPlayerStore((s) => s.seekToFrame);
```

- [ ] **Step 2: Add component-local state for the puck**

After the existing `useState` calls, add:

```tsx
const [displayFrame, setDisplayFrame] = useState(0);
const playAnchorRef = useRef<{ frame: number; wallTimeMs: number; pausedAtMs: number | null }>({
  frame: 0,
  wallTimeMs: Date.now(),
  pausedAtMs: null,
});
```

- [ ] **Step 3: Split the open vs seek effects**

Replace the existing single useEffect (the one with the 120ms timeout that calls `embedReplayOpen`) with TWO effects:

```tsx
// Open / re-open the embedded session ONLY when the replay path or open
// flag changes. Seeks within an open session route through the seek
// effect below — they don't kill+reopen unconditionally.
useEffect(() => {
  if (!open || !replayPath || !stageRef.current) return;

  let cancelled = false;
  const stage = stageRef.current;

  const timeout = setTimeout(async () => {
    if (cancelled) return;

    const bounds = getStageBounds(stage);

    try {
      if (sessionIdRef.current != null) {
        await window.clippi.embedReplayClose(sessionIdRef.current).catch(() => {});
        sessionIdRef.current = null;
        sessionPathRef.current = null;
        setSessionId(null);
      }

      setStatus("opening");
      setErrMsg(null);
      setIsPaused(false);

      const result = await window.clippi.embedReplayOpen(replayPath, bounds, startFrame ?? undefined);
      if (cancelled) return;

      if (!result.embedded) {
        setStatus("fallback");
        setErrMsg(result.reason ?? "Embedded playback unavailable on this OS");
        if (startFrame != null) {
          await window.clippi.openInDolphinAtFrame(replayPath, startFrame).catch(() => {});
        } else {
          await window.clippi.openInDolphin(replayPath).catch(() => {});
        }
        return;
      }

      if (result.sessionId) {
        setSessionId(result.sessionId);
        sessionIdRef.current = result.sessionId;
        sessionPathRef.current = replayPath;
        // Anchor playback estimate at the requested frame.
        playAnchorRef.current = {
          frame: startFrame ?? 0,
          wallTimeMs: Date.now(),
          pausedAtMs: null,
        };
        setDisplayFrame(startFrame ?? 0);
        lastSeekTokenRef.current = seekToken;
      }
    } catch (err) {
      if (cancelled) return;
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : String(err));
    }
  }, 120);

  return () => {
    cancelled = true;
    clearTimeout(timeout);
  };
  // Intentionally NOT depending on startFrame/seekToken — those are handled
  // by the seek effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, replayPath]);

// Seek within an open session: triggered by seekToken changes after the
// initial open completed.
useEffect(() => {
  if (!open || !sessionId || seekToken === lastSeekTokenRef.current) return;
  if (startFrame == null) return;

  const targetFrame = startFrame;
  lastSeekTokenRef.current = seekToken;

  let cancelled = false;
  (async () => {
    try {
      const res = (await window.clippi.embedReplaySeek(sessionId, targetFrame)) as
        | { ok: boolean; mode?: "live" | "respawn"; reason?: string }
        | boolean;
      if (cancelled) return;
      // Re-anchor the playback estimate at the new frame, regardless of mode.
      playAnchorRef.current = {
        frame: targetFrame,
        wallTimeMs: Date.now(),
        pausedAtMs: isPaused ? Date.now() : null,
      };
      setDisplayFrame(targetFrame);
      // For live-seek mode there's no ready event; clear seek state now.
      // For respawn mode the ready listener (existing) will clear it.
      if (typeof res === "object" && res?.mode === "live") {
        setSeekState("idle");
      }
    } catch {
      if (!cancelled) setSeekState("idle");
    }
  })();

  return () => {
    cancelled = true;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [seekToken, sessionId, open]);
```

- [ ] **Step 4: Update the ready listener to also clear seekState**

Find the existing `useEffect` that subscribes to `onEmbedReplayReady`. Modify the ready callback so it clears `seekState` too:

```tsx
const offReady = window.clippi.onEmbedReplayReady((sid) => {
  if (sid === sessionIdRef.current) {
    setStatus("ready");
    setSeekState("idle"); // covers respawn-mode seek completion
  }
});
```

Also wire the new `onEmbedReplaySeeked` listener in the same effect (added in Task 5):

```tsx
const offSeeked = window.clippi.onEmbedReplaySeeked((sid) => {
  if (sid === sessionIdRef.current) setSeekState("idle");
});
// in the cleanup:
return () => {
  offReady();
  offErr();
  offExited();
  offSeeked();
};
```

- [ ] **Step 5: Add the rAF loop driving displayFrame**

After the existing reposition useEffect, add:

```tsx
// Drive displayFrame from a rAF loop while playing. Re-anchored on every
// pause/play/seek, so drift is bounded.
useEffect(() => {
  if (!open || status !== "ready") return;
  let raf: number | null = null;
  const tick = () => {
    const a = playAnchorRef.current;
    const f = estimateFrame(a.frame, a.wallTimeMs, Date.now(), isPaused, a.pausedAtMs);
    setDisplayFrame(f);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    if (raf != null) cancelAnimationFrame(raf);
  };
}, [open, status, isPaused]);
```

- [ ] **Step 6: Re-anchor on pause/play toggle**

Modify `onTogglePause`:

```tsx
const onTogglePause = () => {
  if (!sessionId) return;
  window.clippi.embedReplaySendKey(sessionId, VK_SPACE);
  const nowPaused = !isPaused;
  setIsPaused(nowPaused);
  if (nowPaused) {
    // Freeze the estimate at "now".
    playAnchorRef.current = {
      ...playAnchorRef.current,
      pausedAtMs: Date.now(),
    };
  } else {
    // Resume from the current displayFrame at the new wall time.
    playAnchorRef.current = {
      frame: displayFrame,
      wallTimeMs: Date.now(),
      pausedAtMs: null,
    };
  }
};
```

- [ ] **Step 7: Render the scrubber and seeking overlay in the stage**

Find the JSX `<div className="replay-player-stage" ref={stageRef}>` block. Inside it, add a sibling for the seeking overlay (after the existing `status === "fallback"` block):

```tsx
{seekState === "seeking" && (
  <div className="replay-player-seeking-overlay">Seeking…</div>
)}
```

Then, between the `</div>` closing `replay-player-stage` and the `<div className="replay-player-footer">`, add:

```tsx
{totalFrames != null && totalFrames > 0 && (
  <ReplayScrubber
    currentFrame={displayFrame}
    totalFrames={totalFrames}
    onSeek={(frame) => seekToFrame(frame)}
  />
)}
```

- [ ] **Step 8: Add the `?` hotkey help button to the controls row**

In the `replay-player-controls` div, after the existing Restart button and the `<div style={{ width: "4px" }} />` spacer, add:

```tsx
<div className="replay-hotkey-help" tabIndex={0} aria-label="Keyboard shortcuts">
  <button className="replay-control-btn" type="button" aria-haspopup="true">
    <HelpCircle size={14} />
  </button>
  <div className="replay-hotkey-help-tooltip" role="tooltip">
    <div><kbd>Space</kbd> Pause / Play</div>
    <div><kbd>←</kbd> <kbd>→</kbd> Frame step</div>
    <div><kbd>Esc</kbd> Close</div>
  </div>
</div>
```

- [ ] **Step 9: Type-check the renderer**

Run: `npx vite build`
Expected: build succeeds. Any TS errors must be fixed inline.

- [ ] **Step 10: Run unit tests to confirm nothing regressed**

Run: `npm test`
Expected: all green. The new component isn't unit-tested but pure helpers and store are.

- [ ] **Step 11: Commit**

```bash
git add src/renderer/components/ReplayPlayer.tsx
git commit -m "Wire scrubber, rAF puck loop, seeking overlay, and hotkey help into ReplayPlayer"
```

---

## Task 8: Pass `totalFrames` through `openPlayer` call sites

**Files:**
- Modify: `src/renderer/components/GameDrawer.tsx:132`
- Modify: `src/renderer/components/CoachingModal.tsx:151`
- Modify: `src/renderer/components/StockTimeline.tsx:120` (and props)
- Modify: `src/renderer/utils/timestampLinks.tsx:38` (and the function signature)

The store now accepts an optional `totalFrames`. Pass it from every call site that has the duration in scope. Sites that don't have it leave it undefined — scrubber simply won't render for those opens.

- [ ] **Step 1: GameDrawer**

Replace `src/renderer/components/GameDrawer.tsx:129-133`:

```tsx
const onWatchReplay = () => {
  if (!game?.replayPath) return;
  setCoachingOpen(true);
  const totalFrames =
    typeof game.durationSeconds === "number" && game.durationSeconds > 0
      ? Math.floor(game.durationSeconds * 60)
      : undefined;
  openPlayer(game.replayPath, 0, game.playerCharacter, game.opponentCharacter, totalFrames);
};
```

- [ ] **Step 2: CoachingModal**

`CoachingModal` doesn't currently know the game's duration. Thread it through as a new optional prop. Two callers exist:

- `GameDrawer.tsx:179-189` — has `game.durationSeconds`, passes the prop.
- `Characters.tsx:587-594` — character-scope coaching with `replayPath=""`; passes nothing (the empty path already disables the Watch button and timestamp links). No update needed there.

**Edits:**

1. Add `durationSeconds?: number;` to `CoachingModalProps` in `src/renderer/components/CoachingModal.tsx:8-26`. Add `durationSeconds` to the destructured props on line 28-39.

2. In the same file, just inside the function body (after the destructure, before `useState` calls), add:

```tsx
const totalFrames =
  typeof durationSeconds === "number" && durationSeconds > 0
    ? Math.floor(durationSeconds * 60)
    : undefined;
```

3. Replace `CoachingModal.tsx:141`:

```tsx
markdownComponents={replayPath ? makeTimestampComponents(replayPath, totalFrames) : undefined}
```

4. Replace `CoachingModal.tsx:151`:

```tsx
onClick={() => openPlayer(replayPath, 0, playerCharacter, opponentCharacter, totalFrames)}
```

5. In `GameDrawer.tsx:179-189`, add the `durationSeconds` prop to the `<CoachingModal>` call:

```tsx
<CoachingModal
  isOpen={coachingOpen}
  onClose={() => setCoachingOpen(false)}
  scope="game"
  id={game.id}
  title={`${game.playerCharacter ?? "—"} vs ${game.opponentCharacter} on ${game.stage}`}
  replayPath={game.replayPath}
  playerCharacter={game.playerCharacter}
  opponentCharacter={game.opponentCharacter}
  durationSeconds={game.durationSeconds}
  variant="alongsideDrawer"
/>
```

`Characters.tsx:587` does not need modification — that scope has no replay anyway.

- [ ] **Step 3: StockTimeline**

The stock click handler lives in the inner `Row` component (`StockTimeline.tsx:99-171`), called from the outer `<StockTimeline>` (lines 173-onward). The outer component is invoked from one place only: `GameDrawer.tsx:167`.

Three concrete edits:

1. Add `totalFrames?: number` to the outer `StockTimeline` props (`StockTimeline.tsx:177-181`):

```tsx
export function StockTimeline({
  replayPath,
  playerCharacter,
  opponentCharacter,
  totalFrames,
}: {
  replayPath: string;
  playerCharacter: string;
  opponentCharacter: string;
  totalFrames?: number;
}) {
```

2. Pass `totalFrames` through to the `Row` component everywhere `Row` is rendered inside `StockTimeline`'s JSX (search the file for `<Row` to find the render sites — there should be one for the player and one for the opponent). Add a matching prop on `Row`'s signature (`StockTimeline.tsx:91-106`):

```tsx
function Row({
  stocks,
  totalDuration,
  color,
  colorRgb,
  minDmg,
  maxDmg,
  isPlayer,
  momentumStocks,
  replayPath,
  totalFrames,
}: {
  stocks: StockTimelineRow["stocks"];
  totalDuration: number;
  color: string;
  colorRgb: string;
  minDmg: number;
  maxDmg: number;
  isPlayer: boolean;
  momentumStocks: Set<number>;
  replayPath: string;
  totalFrames?: number;
}) {
```

3. Update the click handler at `StockTimeline.tsx:118-121`:

```tsx
const onStockClick = () => {
  const frame = timestampToFrame(stock.startTime);
  openPlayer(replayPath, frame, undefined, undefined, totalFrames);
};
```

4. Update the single call site at `GameDrawer.tsx:167`:

```tsx
<StockTimeline
  replayPath={game.replayPath}
  playerCharacter={game.playerCharacter ?? "—"}
  opponentCharacter={game.opponentCharacter}
  totalFrames={
    typeof game.durationSeconds === "number" && game.durationSeconds > 0
      ? Math.floor(game.durationSeconds * 60)
      : undefined
  }
/>
```

(Adjust the closing tag if the existing call uses different prop names; preserve those — only add `totalFrames`.)

- [ ] **Step 4: timestampLinks**

The factory is `makeTimestampComponents(replayPath: string)` at `timestampLinks.tsx:27`. It's called from exactly one place: `CoachingModal.tsx:141`.

Two edits:

1. Extend the factory signature in `src/renderer/utils/timestampLinks.tsx:27`:

```tsx
export function makeTimestampComponents(replayPath: string, totalFrames?: number): Components {
```

And update the click handler at line 38:

```tsx
useReplayPlayerStore.getState().openPlayer(replayPath, frame, undefined, undefined, totalFrames);
```

2. Update the single caller at `CoachingModal.tsx:141`:

```tsx
markdownComponents={
  replayPath
    ? makeTimestampComponents(replayPath, /* totalFrames passed in Step 2 */ totalFrames)
    : undefined
}
```

`totalFrames` here is the same local variable you derived in Step 2 above (`Math.floor(durationSeconds * 60)` where available, `undefined` otherwise).

- [ ] **Step 5: ReplayPlayer.tsx Restart button**

Find `ReplayPlayer.tsx:223` (the `onRestart` handler):

```tsx
const onRestart = () => {
  if (!replayPath) return;
  openPlayer(replayPath, 0);
};
```

Replace with:

```tsx
const onRestart = () => {
  if (!replayPath) return;
  // Re-use the existing totalFrames in the store; openPlayer's "same path"
  // branch keeps it intact.
  openPlayer(replayPath, 0, playerCharacter ?? undefined, opponentCharacter ?? undefined, totalFrames ?? undefined);
};
```

- [ ] **Step 6: Type-check**

Run: `npx vite build`
Expected: no TS errors. Fix any inline.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/GameDrawer.tsx src/renderer/components/CoachingModal.tsx src/renderer/components/StockTimeline.tsx src/renderer/utils/timestampLinks.tsx src/renderer/components/ReplayPlayer.tsx
git commit -m "Pass totalFrames through openPlayer call sites"
```

---

## Task 9: Manual integration verification

**Files:** none — this is an end-to-end manual test pass.

- [ ] **Step 1: Boot dev mode**

Run: `npm run dev`

Wait for the renderer to mount and the file watcher to be ready.

- [ ] **Step 2: Open a replay through the GameDrawer**

Click any imported game in the dashboard / library to open its drawer. Click "Watch Replay". Expect:
- Right-side panel slides in
- "Launching Dolphin…" spinner
- Dolphin pins to the stage rect after a moment
- Scrubber appears with the puck at frame 0
- `0:00 / M:SS` time readout matches the game's duration

- [ ] **Step 3: Watch the puck advance**

Let the replay play for ~60 seconds. The puck should advance ~1/Nth of the way across the bar, where N = duration in minutes. Approximate is fine.

- [ ] **Step 4: Click-to-seek at 5 distinct positions**

Click the bar at: 10%, 30%, 50%, 70%, 90%. After each click:
- Brief "Seeking…" overlay (only on respawn-mode fallback)
- Dolphin lands at approximately the right point (verify by checking what's happening on screen against the stock timeline)
- Puck snaps to the clicked position

- [ ] **Step 5: Drag-to-seek**

Hold the puck and drag end-to-end without releasing. Confirm:
- Puck follows the cursor
- Tooltip shows the target `M:SS` near the cursor
- Dolphin keeps playing at its current position (no IPC fired during drag)
- On pointer-up, Dolphin seeks to the released position

- [ ] **Step 6: Drag past the right edge**

Start a drag, then move the cursor far past the right edge of the bar. Puck should clamp to the end. Release; Dolphin should land at the last frame.

- [ ] **Step 7: Click at frame 0**

Click at the very left of the bar. Should produce a Restart-equivalent — Dolphin replays from the beginning. (On Branch B fallback this re-spawns; on Branch A live-seek this re-anchors.)

- [ ] **Step 8: Verify Space hijack fix**

While the replay is playing, click into the coaching textarea. Type "hello world" — including the space. Confirm:
- Space character lands in the textarea
- Dolphin does NOT pause
- ArrowLeft / ArrowRight move the textarea cursor, do NOT step Dolphin frames

Then click outside the textarea and press Space. Dolphin pauses. Press again — resumes.

- [ ] **Step 9: Hover the `?` button**

Hover the `?` button in the controls row. Tooltip should appear showing Space / ←→ / Esc.

- [ ] **Step 10: Resize MAGI's window**

Drag MAGI's window to a different size. Confirm:
- Dolphin tracks the new stage rect (existing behavior)
- Scrubber stretches to the new width
- Puck stays at the correct proportion

- [ ] **Step 11: Close mid-seek**

Start a drag, release at a new position, and IMMEDIATELY hit Esc (or click ✕). Confirm:
- No orphan Dolphin process (check Task Manager — `Slippi Dolphin.exe` should be gone)
- Re-opening any replay works fresh

- [ ] **Step 12: Open a game without `durationSeconds`**

If the test DB has any older rows missing `duration_seconds`, open one. Confirm the scrubber does not render but frame-step / pause / restart still work. (If no such rows exist, skip this step.)

- [ ] **Step 13: Run the full test suite once more**

Run: `npm test`
Expected: all green.

- [ ] **Step 14: Commit a final notes / changelog if you keep one**

If the project tracks a CHANGELOG, add an entry. Otherwise no commit needed for this task.

---

## Self-review notes

**Spec coverage:**
- ✅ Timeline scrubber with click-to-jump, drag-to-seek, hover tooltip → Tasks 6, 7
- ✅ Current-frame indicator (puck) driven by wall-clock estimate → Tasks 1, 7
- ✅ "Seeking…" overlay during respawn → Tasks 6 (CSS), 7 (render)
- ✅ Indeterminate-mode (no scrubber when `totalFrames` missing) → Task 7 conditional
- ✅ Spike on Slippi live-seek + documented decision → Task 4
- ✅ Seek IPC handler implemented per spike outcome → Task 5
- ✅ Polish: keydown scope guard → Task 3
- ✅ Polish: hotkey help button → Tasks 6 (CSS), 7 (render)
- ✅ Pass totalFrames through all `openPlayer` call sites → Task 8
- ✅ Unit tests for pure helpers + store → Tasks 1, 2
- ✅ Manual end-to-end checklist → Task 9

**Out of scope (per spec):** speed control, volume, hover thumbnails, multi-game queue, macOS/Linux embedded — none touched.

**Type consistency check:**
- `seekToFrame(frame: number): void` — same signature in store (Task 2) and called from scrubber's `onSeek` (Task 7).
- `setSeekState("idle" | "seeking")` — same in store (Task 2) and ReplayPlayer (Tasks 7).
- `totalFrames: number | null` — same in store and prop type for ReplayScrubber (which expects `number > 0`; the parent gates on `totalFrames != null && totalFrames > 0`).
- `embedReplaySeek` return shape — Task 5 returns `{ ok, mode, reason? }`; Task 7 reads it as that shape and falls back gracefully if it's a boolean (legacy).
