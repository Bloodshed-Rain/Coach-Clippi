// Resolves the user's live-stats preferences from config into a validated shape.
// Mirrors cornermanPopupSettings.ts: pure, no IO, tolerant of malformed input.

import {
  ALL_LIVE_STAT_IDS,
  isCornermanLiveStatId,
  type CornermanLiveStatId,
} from "./cornermanLiveStats";

export interface CornermanLiveStatsSettings {
  enabled: boolean;
  /** Which stats the overlay strip shows (max MAX_OVERLAY_STATS). The Cornerman
   *  page always shows the full registry regardless of this. */
  overlayStatIds: CornermanLiveStatId[];
}

/** The overlay's glance budget — four tiles cover execution, conversion, punish,
 *  and neutral without becoming stat soup. */
export const MAX_OVERLAY_STATS = 4;

export const DEFAULT_CORNERMAN_LIVE_STATS_SETTINGS: CornermanLiveStatsSettings = {
  enabled: true,
  overlayStatIds: ["lCancelRate", "openingsPerKill", "damagePerOpening", "neutralWins"],
};

function normalizeEnabled(value: unknown): boolean {
  return typeof value === "boolean" ? value : DEFAULT_CORNERMAN_LIVE_STATS_SETTINGS.enabled;
}

/** Keep known stat ids, drop duplicates and unknowns, cap at MAX_OVERLAY_STATS.
 *  Falls back to the defaults when nothing valid survives. */
export function normalizeOverlayStatIds(value: unknown): CornermanLiveStatId[] {
  if (!Array.isArray(value)) return [...DEFAULT_CORNERMAN_LIVE_STATS_SETTINGS.overlayStatIds];
  const seen = new Set<CornermanLiveStatId>();
  for (const raw of value) {
    if (isCornermanLiveStatId(raw)) seen.add(raw);
    if (seen.size >= MAX_OVERLAY_STATS) break;
  }
  if (seen.size === 0) return [...DEFAULT_CORNERMAN_LIVE_STATS_SETTINGS.overlayStatIds];
  // Preserve the user's ordering by walking the input, not the registry.
  const ordered: CornermanLiveStatId[] = [];
  for (const raw of value) {
    if (isCornermanLiveStatId(raw) && seen.has(raw) && !ordered.includes(raw)) ordered.push(raw);
    if (ordered.length >= MAX_OVERLAY_STATS) break;
  }
  return ordered;
}

export function resolveCornermanLiveStatsSettings(config: {
  cornermanLiveStatsEnabled?: unknown;
  cornermanOverlayStatIds?: unknown;
}): CornermanLiveStatsSettings {
  return {
    enabled: normalizeEnabled(config.cornermanLiveStatsEnabled),
    overlayStatIds: normalizeOverlayStatIds(config.cornermanOverlayStatIds),
  };
}

export { ALL_LIVE_STAT_IDS };
