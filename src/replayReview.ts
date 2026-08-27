export const REPLAY_FRAMES_PER_SECOND = 60;
export const DEFAULT_REPLAY_PRE_ROLL_FRAMES = REPLAY_FRAMES_PER_SECOND * 2;
export const DEFAULT_REPLAY_REVIEW_AFTER_FRAMES = REPLAY_FRAMES_PER_SECOND * 4;

export type ReplayReviewMarkerKind = "highlight" | "player-stock" | "opponent-stock";

export interface ReplayReviewMarker {
  id: string;
  frame: number;
  label: string;
  kind: ReplayReviewMarkerKind;
}

export interface ReplaySeekRequest {
  id: number;
  frame: number;
  endFrame?: number;
  label?: string;
}

export interface ReplayReviewClip {
  startFrame: number;
  endFrame: number;
}

export function clampReplayFrame(frame: number, durationFrames: number): number {
  if (!Number.isFinite(frame)) return 0;
  const maxFrame = Number.isFinite(durationFrames) ? Math.max(0, Math.floor(durationFrames)) : Number.MAX_SAFE_INTEGER;
  return Math.min(maxFrame, Math.max(0, Math.floor(frame)));
}

export function buildReplayReviewClip(
  markerFrame: number,
  durationFrames: number,
  preRollFrames: number = DEFAULT_REPLAY_PRE_ROLL_FRAMES,
  afterFrames: number = DEFAULT_REPLAY_REVIEW_AFTER_FRAMES,
): ReplayReviewClip {
  const marker = clampReplayFrame(markerFrame, durationFrames);
  const startFrame = clampReplayFrame(marker - Math.max(0, preRollFrames), durationFrames);
  const endFrame = Math.max(startFrame, clampReplayFrame(marker + Math.max(0, afterFrames), durationFrames));
  return { startFrame, endFrame };
}

export function formatReplayFrame(frame: number): string {
  const seconds = Math.max(0, Math.floor(frame / REPLAY_FRAMES_PER_SECOND));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
