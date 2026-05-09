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
