import { describe, expect, it } from "vitest";
import path from "path";
import { SlippiGame, type ActionCountsType, type ConversionType, type OverallType } from "@slippi/slippi-js/node";

import {
  buildLiveStatsSnapshot,
  classifyOpeningTypes,
  computeStatDelta,
  formatLiveStatValue,
  LIVE_STAT_DEF_BY_ID,
  type CornermanLiveBaseline,
  type CornermanLiveStatId,
  type CornermanLiveStatsPlayer,
} from "../src/cornermanLiveStats";
import { getCharacterName, getPlayerTag } from "../src/pipeline/helpers";
import { processGame } from "../src/pipeline";

// ── Fixtures ──────────────────────────────────────────────────────────

function ratioT(count: number, total: number) {
  return { count, total, ratio: total ? count / total : undefined };
}

function actionCounts(playerIndex: number, over: Partial<ActionCountsType> = {}): ActionCountsType {
  return {
    playerIndex,
    wavedashCount: 0,
    wavelandCount: 0,
    airDodgeCount: 0,
    dashDanceCount: 0,
    spotDodgeCount: 0,
    ledgegrabCount: 0,
    rollCount: 0,
    edgeCancelCount: { success: 0, slow: 0 },
    lCancelCount: { success: 0, fail: 0 },
    attackCount: {
      jab1: 0, jab2: 0, jab3: 0, jabm: 0, dash: 0, ftilt: 0, utilt: 0, dtilt: 0,
      fsmash: 0, usmash: 0, dsmash: 0, nair: 0, fair: 0, bair: 0, uair: 0, dair: 0,
    },
    grabCount: { success: 0, fail: 0 },
    throwCount: { up: 0, forward: 0, back: 0, down: 0 },
    groundTechCount: { away: 0, in: 0, neutral: 0, fail: 0 },
    wallTechCount: { success: 0, fail: 0 },
    ...over,
  } as ActionCountsType;
}

function overall(playerIndex: number, over: Partial<OverallType> = {}): OverallType {
  return {
    playerIndex,
    inputCounts: { buttons: 0, triggers: 0, cstick: 0, joystick: 0, total: 0 },
    conversionCount: 0,
    totalDamage: 0,
    killCount: 0,
    successfulConversions: ratioT(0, 0),
    inputsPerMinute: ratioT(0, 0),
    digitalInputsPerMinute: ratioT(0, 0),
    openingsPerKill: ratioT(0, 0),
    damagePerOpening: ratioT(0, 0),
    neutralWinRatio: ratioT(0, 0),
    counterHitRatio: ratioT(0, 0),
    beneficialTradeRatio: ratioT(0, 0),
    ...over,
  } as OverallType;
}

function conv(over: Partial<ConversionType>): ConversionType {
  return {
    playerIndex: 1,
    startFrame: 100,
    endFrame: 160,
    startPercent: 0,
    currentPercent: 40,
    endPercent: 40,
    moves: [{ playerIndex: 0, frame: 100, moveId: 15, hitCount: 1, damage: 10 }],
    didKill: false,
    openingType: "neutral-win",
    lastHitBy: 0,
    ...over,
  } as ConversionType;
}

const PLAYERS: CornermanLiveStatsPlayer[] = [
  { playerIndex: 0, tag: "ME", character: "Fox", isTarget: true },
  { playerIndex: 1, tag: "OPP", character: "Marth", isTarget: false },
];

function targetStats(snapshot: ReturnType<typeof buildLiveStatsSnapshot>) {
  const target = snapshot.players.find((p) => p.isTarget)!;
  const byId = (id: CornermanLiveStatId) => target.stats.find((s) => s.id === id)!;
  return byId;
}

// ── buildLiveStatsSnapshot ────────────────────────────────────────────

describe("buildLiveStatsSnapshot", () => {
  it("computes rate stats and counters for the target", () => {
    const stats = {
      actionCounts: [
        actionCounts(0, { lCancelCount: { success: 9, fail: 3 }, grabCount: { success: 2, fail: 2 }, wavedashCount: 7 }),
        actionCounts(1),
      ],
      overall: [
        overall(0, { openingsPerKill: ratioT(8, 2), damagePerOpening: ratioT(240.4, 8) }),
        overall(1),
      ],
      conversions: [] as ConversionType[],
    };
    const snap = buildLiveStatsSnapshot(stats, PLAYERS, 600, "g.slp", false);
    const stat = targetStats(snap);

    expect(stat("lCancelRate").value).toBeCloseTo(0.75, 5); // 9 / 12
    expect(stat("lCancelRate")).toMatchObject({ count: 9, total: 12 });
    expect(stat("openingsPerKill")).toMatchObject({ value: 4, count: 8, total: 2 });
    expect(stat("damagePerOpening")).toMatchObject({ value: 240.4 / 8, count: 240, total: 8 }); // count rounded
    expect(stat("grabSuccess").value).toBeCloseTo(0.5, 5);
    expect(stat("wavedashes")).toMatchObject({ value: 7, count: 7, total: 0 });
    expect(snap.phase).toBe("live");
    expect(snap.gameKey).toBe("g.slp");
  });

  it("returns null value (never a fake 0) when there is nothing to divide", () => {
    const stats = {
      actionCounts: [actionCounts(0), actionCounts(1)],
      overall: [overall(0), overall(1)], // openingsPerKill ratio undefined (no kills)
      conversions: [] as ConversionType[],
    };
    const stat = targetStats(buildLiveStatsSnapshot(stats, PLAYERS, 300, "g.slp", false));
    expect(stat("lCancelRate").value).toBeNull();
    expect(stat("openingsPerKill").value).toBeNull();
    expect(formatLiveStatValue(LIVE_STAT_DEF_BY_ID.lCancelRate, stat("lCancelRate"))).toBe("—");
  });

  it("looks up stats rows by playerIndex field, not array position (P2 vs P4)", () => {
    // Ports 1 and 3 → array indices 0,1 but playerIndex 1,3. Indexing by position
    // would attribute the wrong row.
    const players: CornermanLiveStatsPlayer[] = [
      { playerIndex: 1, tag: "P2", character: "Falco", isTarget: true },
      { playerIndex: 3, tag: "P4", character: "Peach", isTarget: false },
    ];
    const stats = {
      actionCounts: [
        actionCounts(1, { lCancelCount: { success: 10, fail: 0 } }),
        actionCounts(3, { lCancelCount: { success: 1, fail: 9 } }),
      ],
      overall: [overall(1), overall(3)],
      conversions: [] as ConversionType[],
    };
    const snap = buildLiveStatsSnapshot(stats, players, 500, "g.slp", false);
    const me = snap.players.find((p) => p.isTarget)!;
    expect(me.stats.find((s) => s.id === "lCancelRate")!.value).toBeCloseTo(1.0, 5); // P2's own 10/10
  });

  it("is total when a player's rows are missing (doubles/empty actionCounts)", () => {
    const stats = {
      actionCounts: [] as ActionCountsType[], // slippi yields none for non-1v1
      overall: [overall(0), overall(1)],
      conversions: [] as ConversionType[],
    };
    const stat = targetStats(buildLiveStatsSnapshot(stats, PLAYERS, 400, "g.slp", false));
    expect(stat("lCancelRate").value).toBeNull();
    expect(stat("wavedashes").count).toBe(0);
  });

  it("marks phase ended when told", () => {
    const stats = { actionCounts: [actionCounts(0), actionCounts(1)], overall: [overall(0), overall(1)], conversions: [] };
    expect(buildLiveStatsSnapshot(stats, PLAYERS, 999, "g.slp", true).phase).toBe("ended");
  });
});

// ── classifyOpeningTypes: the neutral-win drift fix ───────────────────

describe("classifyOpeningTypes", () => {
  it("labels a counter-attack even when the sticky openingType claims neutral-win", () => {
    // Opponent (idx1) combos target (victim idx0) 100→200. Target (idx0) hits back
    // starting at 150, while that combo is still resolving → counter-attack, not a
    // neutral win — regardless of the (deliberately wrong) sticky openingType.
    const oppCombo = conv({
      playerIndex: 0, // victim = target
      startFrame: 100,
      endFrame: 200,
      moves: [{ playerIndex: 1, frame: 100, moveId: 15, hitCount: 1, damage: 30 }],
      openingType: "neutral-win",
    });
    const targetCounter = conv({
      playerIndex: 1, // victim = opponent
      startFrame: 150,
      endFrame: 260,
      moves: [{ playerIndex: 0, frame: 150, moveId: 15, hitCount: 1, damage: 20 }],
      openingType: "neutral-win", // sticky + wrong
    });
    const types = classifyOpeningTypes([oppCombo, targetCounter]);
    expect(types.get(oppCombo)).toBe("neutral-win"); // opponent's clean opening
    expect(types.get(targetCounter)).toBe("counter-attack"); // recomputed, not trusted
  });

  it("flags same-startFrame conversions as trades", () => {
    const a = conv({ playerIndex: 0, startFrame: 300, moves: [{ playerIndex: 1, frame: 300, moveId: 15, hitCount: 1, damage: 10 }] });
    const b = conv({ playerIndex: 1, startFrame: 300, moves: [{ playerIndex: 0, frame: 300, moveId: 15, hitCount: 1, damage: 10 }] });
    const types = classifyOpeningTypes([a, b]);
    expect(types.get(a)).toBe("trade");
    expect(types.get(b)).toBe("trade");
  });

  it("feeds neutralWins so a counter-attack is not counted as the target's neutral win", () => {
    const oppCombo = conv({
      playerIndex: 0,
      startFrame: 100,
      endFrame: 200,
      moves: [{ playerIndex: 1, frame: 100, moveId: 15, hitCount: 1, damage: 30 }],
    });
    const targetCounter = conv({
      playerIndex: 1,
      startFrame: 150,
      endFrame: 260,
      moves: [{ playerIndex: 0, frame: 150, moveId: 15, hitCount: 1, damage: 20 }],
      openingType: "neutral-win",
    });
    const stats = {
      actionCounts: [actionCounts(0), actionCounts(1)],
      overall: [overall(0), overall(1)],
      conversions: [oppCombo, targetCounter],
    };
    const stat = targetStats(buildLiveStatsSnapshot(stats, PLAYERS, 300, "g.slp", true));
    // Target got 0 neutral wins (their opening was a counter-attack); opponent got 1.
    expect(stat("neutralWins")).toMatchObject({ count: 0, total: 1, value: 0 });
  });
});

// ── computeStatDelta ──────────────────────────────────────────────────

const baseline: CornermanLiveBaseline = {
  gamesSampled: 20,
  lCancelRate: 0.8,
  openingsPerKill: 4.0,
  avgDamagePerOpening: 30,
  neutralWinRate: 0.5,
};

describe("computeStatDelta", () => {
  it("shows a better (green) glyph when a higher-is-better stat beats baseline", () => {
    const d = computeStatDelta(LIVE_STAT_DEF_BY_ID.lCancelRate, { id: "lCancelRate", value: 0.92, count: 18, total: 20 }, baseline);
    expect(d).toMatchObject({ glyph: "▲", isBetter: true });
  });

  it("inverts good/bad for a lower-is-better stat (openings per kill)", () => {
    // 3.0 openings/kill vs usual 4.0 → fewer openings needed = better, but value went DOWN.
    const d = computeStatDelta(LIVE_STAT_DEF_BY_ID.openingsPerKill, { id: "openingsPerKill", value: 3.0, count: 9, total: 3 }, baseline);
    expect(d).toMatchObject({ glyph: "▼", isBetter: true });
  });

  it("suppresses a glyph below the sample threshold", () => {
    // lCancel minSample is 8 attempts; only 5 here.
    expect(computeStatDelta(LIVE_STAT_DEF_BY_ID.lCancelRate, { id: "lCancelRate", value: 0.99, count: 5, total: 5 }, baseline)).toBeNull();
  });

  it("suppresses a glyph inside the noise band", () => {
    expect(computeStatDelta(LIVE_STAT_DEF_BY_ID.lCancelRate, { id: "lCancelRate", value: 0.82, count: 20, total: 20 }, baseline)).toBeNull();
  });

  it("returns null with no baseline, a null baseline field, or a baseline-less stat", () => {
    expect(computeStatDelta(LIVE_STAT_DEF_BY_ID.lCancelRate, { id: "lCancelRate", value: 0.9, count: 20, total: 20 }, null)).toBeNull();
    expect(
      computeStatDelta(LIVE_STAT_DEF_BY_ID.lCancelRate, { id: "lCancelRate", value: 0.9, count: 20, total: 20 }, { ...baseline, lCancelRate: null }),
    ).toBeNull();
    expect(computeStatDelta(LIVE_STAT_DEF_BY_ID.grabSuccess, { id: "grabSuccess", value: 0.9, count: 20, total: 20 }, baseline)).toBeNull();
  });

  it("never shows a glyph for a null live value", () => {
    expect(computeStatDelta(LIVE_STAT_DEF_BY_ID.lCancelRate, { id: "lCancelRate", value: null, count: 0, total: 0 }, baseline)).toBeNull();
  });
});

// ── Live-vs-post-game parity (streaming / multi-fetch path) ───────────

const FIXTURE = path.resolve(__dirname, "fixtures", "game1.slp");

function playersFromGame(game: SlippiGame): CornermanLiveStatsPlayer[] {
  const settings = game.getSettings()!;
  const active = settings.players.filter((p) => p.type !== 3);
  return active.map((p, i) => ({
    playerIndex: p.playerIndex,
    tag: getPlayerTag(p),
    character: getCharacterName(p.characterId),
    isTarget: i === 0,
  }));
}

describe("live snapshot matches post-game stats", () => {
  // A snapshot built from a completed parse must equal what the post-game
  // pipeline computes for the same file — including neutralWins, which is
  // re-derived here rather than read from slippi's fetch-order-dependent
  // openingType. (The growing-file / incremental path is exercised end-to-end by
  // scripts/simulate-live-replay.js, which also drives the monitor's stalled-
  // parser rebuild; a naive re-poll of one SlippiGame instance would instead hit
  // that wedge and under-count.)
  it("equals the post-game pipeline's own numbers on the real fixture", () => {
    const game = new SlippiGame(FIXTURE);
    const stats = game.getStats()!;
    const players = playersFromGame(game);
    const snap = buildLiveStatsSnapshot(stats, players, stats.lastFrame, "truth", true);

    // Fixture-rot guard: the fixture must actually exercise these stats somewhere.
    const sumTotal = (id: CornermanLiveStatId) =>
      snap.players.reduce((s, p) => s + p.stats.find((x) => x.id === id)!.total, 0);
    expect(sumTotal("lCancelRate")).toBeGreaterThan(0);
    expect(sumTotal("openingsPerKill")).toBeGreaterThan(0);
    expect(sumTotal("neutralWins")).toBeGreaterThan(0);

    const summary = processGame(FIXTURE, 1).gameSummary;
    for (const sp of snap.players) {
      const ps = summary.players.find((pl) => pl.tag === sp.tag);
      if (!ps) continue;
      const stat = (id: CornermanLiveStatId) => sp.stats.find((s) => s.id === id)!;
      if (stat("lCancelRate").total > 0) expect(stat("lCancelRate").value).toBeCloseTo(ps.lCancelRate, 4);
      if (stat("neutralWins").total > 0) expect(stat("neutralWins").value).toBeCloseTo(ps.neutralWinRate, 4);
      if (stat("openingsPerKill").total > 0) expect(stat("openingsPerKill").value).toBeCloseTo(ps.openingsPerKill, 4);
      // The pipeline rounds damage/opening to 2dp on the way to the DB; our raw
      // value keeps full precision but formats to the same integer for display.
      if (stat("damagePerOpening").total > 0)
        expect(stat("damagePerOpening").value).toBeCloseTo(ps.averageDamagePerOpening, 2);
    }
  });
});
