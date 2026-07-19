import { describe, expect, it } from "vitest";

import {
  DEFAULT_CORNERMAN_LIVE_STATS_SETTINGS,
  MAX_OVERLAY_STATS,
  normalizeOverlayStatIds,
  resolveCornermanLiveStatsSettings,
} from "../src/cornermanLiveStatsSettings";

describe("resolveCornermanLiveStatsSettings", () => {
  it("returns defaults for an empty config", () => {
    expect(resolveCornermanLiveStatsSettings({})).toEqual(DEFAULT_CORNERMAN_LIVE_STATS_SETTINGS);
  });

  it("respects an explicit enabled=false", () => {
    expect(resolveCornermanLiveStatsSettings({ cornermanLiveStatsEnabled: false }).enabled).toBe(false);
  });

  it("falls back to default enabled when the value is not a boolean", () => {
    expect(resolveCornermanLiveStatsSettings({ cornermanLiveStatsEnabled: "yes" }).enabled).toBe(true);
  });
});

describe("normalizeOverlayStatIds", () => {
  it("defaults when not an array", () => {
    expect(normalizeOverlayStatIds(undefined)).toEqual(DEFAULT_CORNERMAN_LIVE_STATS_SETTINGS.overlayStatIds);
    expect(normalizeOverlayStatIds("lCancelRate")).toEqual(DEFAULT_CORNERMAN_LIVE_STATS_SETTINGS.overlayStatIds);
  });

  it("drops unknown ids", () => {
    expect(normalizeOverlayStatIds(["lCancelRate", "bogus", "grabSuccess"])).toEqual(["lCancelRate", "grabSuccess"]);
  });

  it("caps at MAX_OVERLAY_STATS", () => {
    const result = normalizeOverlayStatIds([
      "lCancelRate",
      "openingsPerKill",
      "damagePerOpening",
      "neutralWins",
      "grabSuccess",
      "rolls",
    ]);
    expect(result).toHaveLength(MAX_OVERLAY_STATS);
    expect(result).toEqual(["lCancelRate", "openingsPerKill", "damagePerOpening", "neutralWins"]);
  });

  it("dedupes while preserving user order", () => {
    expect(normalizeOverlayStatIds(["grabSuccess", "grabSuccess", "lCancelRate"])).toEqual([
      "grabSuccess",
      "lCancelRate",
    ]);
  });

  it("falls back to defaults when nothing valid survives", () => {
    expect(normalizeOverlayStatIds(["nope", 42, null])).toEqual(DEFAULT_CORNERMAN_LIVE_STATS_SETTINGS.overlayStatIds);
  });
});
