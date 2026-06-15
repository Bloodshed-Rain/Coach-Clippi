import { describe, expect, it } from "vitest";

import { computeRadarForPeriod, computeRadarStats, type RadarGameStats } from "../src/renderer/radarStats";

function game(overrides: Partial<RadarGameStats> = {}): RadarGameStats {
  return {
    neutralWinRate: 0.5,
    lCancelRate: 0.75,
    openingsPerKill: 5,
    avgDamagePerOpening: 32,
    conversionRate: 0.42,
    avgDeathPercent: 105,
    recoverySuccessRate: 0.5,
    edgeguardSuccessRate: 0.4,
    wavedashCount: 18,
    dashDanceFrames: 1200,
    ledgeEntropy: 0.8,
    knockdownEntropy: 0.7,
    shieldPressureEntropy: 0.6,
    diSurvivalScore: 0.55,
    diComboScore: 0.52,
    powerShieldCount: 0,
    playedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeRadarStats", () => {
  it("includes power shields in the defense axis", () => {
    const noPowerShields = computeRadarStats([game({ powerShieldCount: 0 })]);
    const frequentPowerShields = computeRadarStats([game({ powerShieldCount: 4 })]);

    expect(frequentPowerShields.defense).toBeGreaterThan(noPowerShields.defense);
  });

  it("filters period windows before computing comparison radar", () => {
    const games = [
      game({ neutralWinRate: 0.2, playedAt: "2026-01-01T00:00:00.000Z" }),
      game({ neutralWinRate: 0.2, playedAt: "2026-01-02T00:00:00.000Z" }),
      game({ neutralWinRate: 0.2, playedAt: "2026-01-03T00:00:00.000Z" }),
      game({ neutralWinRate: 0.8, playedAt: "2026-02-01T00:00:00.000Z" }),
      game({ neutralWinRate: 0.8, playedAt: "2026-02-02T00:00:00.000Z" }),
      game({ neutralWinRate: 0.8, playedAt: "2026-02-03T00:00:00.000Z" }),
    ];

    const current = computeRadarForPeriod(games, "2026-02-01T00:00:00.000Z");
    const previous = computeRadarForPeriod(games, "2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z");

    expect(current?.neutral).toBeCloseTo(80);
    expect(previous?.neutral).toBeCloseTo(20);
  });
});
