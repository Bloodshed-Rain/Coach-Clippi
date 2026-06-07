import { describe, it, expect } from "vitest";
import { assembleOpponentDossierPrompt, SYSTEM_PROMPT_SCOUT } from "../src/pipeline/prompt";

describe("assembleOpponentDossierPrompt", () => {
  const headToHead = {
    opponentTag: "Lime",
    wins: 4,
    losses: 10,
    totalGames: 14,
    winRate: 0.2857,
    characterBreakdown: [{ opponentCharacter: "FOX", wins: 4, losses: 10, totalGames: 14, winRate: 0.2857 }],
    stageBreakdown: [{ stage: "BATTLEFIELD", wins: 1, losses: 5, totalGames: 6, winRate: 0.1667 }],
  };
  const yourStatsVsThem = { gamesPlayed: 14, avgNeutralWinRate: 0.41, avgConversionRate: 0.45 };

  it("is opponent-focused, not self-focused, and embeds the real numbers", () => {
    const p = assembleOpponentDossierPrompt(headToHead, yourStatsVsThem, null, null);
    expect(p).toContain("Lime");
    expect(p).toContain("BATTLEFIELD");
    expect(p).toMatch(/beat|defeat|exploit|game plan/i);
    expect(p).toContain("4"); // wins value present
  });

  it("includes the opponent tendencies block only when scouting data is provided", () => {
    const withScout = assembleOpponentDossierPrompt(headToHead, yourStatsVsThem, null, {
      gamesAnalyzed: 12,
      wakeup: { roll: 0.64, getupAttack: 0.1, standUp: 0.26 },
      topKillMoves: [{ move: "Up Smash", count: 9 }],
    });
    expect(withScout).toMatch(/tendenc|habit|wakeup/i);
    expect(withScout).toContain("0.64");

    const without = assembleOpponentDossierPrompt(headToHead, yourStatsVsThem, null, null);
    expect(without).not.toMatch(/OPPONENT TENDENCIES/);
  });

  it("SYSTEM_PROMPT_SCOUT frames MAGI as a scout producing a game plan", () => {
    expect(SYSTEM_PROMPT_SCOUT).toMatch(/scout|game plan|beat/i);
  });
});
