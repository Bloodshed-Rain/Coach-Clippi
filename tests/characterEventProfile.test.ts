import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// getCharacterEventProfile aggregates the v10-v14 per-instance event tables
// for one character. We point db.ts at a throwaway home directory (so getDb()
// builds the real schema + migrations in a temp DB), seed two characters'
// games plus event rows through the real insert helpers, and assert on the
// aggregation: character isolation, is_player perspective, condition splits,
// distinct-game coverage, and trivia sums.

vi.mock("os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("os")>();
  const { mkdtempSync } = await import("fs");
  const { join } = await import("path");
  const home = mkdtempSync(join(actual.tmpdir(), "magi-character-events-"));
  const homedir = () => home;
  return { ...actual, homedir, default: { ...actual, homedir } };
});

describe("character analytics page wiring", () => {
  const charactersSource = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/pages/Characters.tsx"),
    "utf-8",
  );
  const modules = [
    "IdentityCard",
    "FormStrip",
    "PunishEconomy",
    "HabitLedger",
    "RecoveryMatrix",
    "DeathReport",
    "StageCard",
    "TriviaCard",
  ];

  it("mounts every character analytics module", () => {
    for (const moduleName of modules) {
      expect(charactersSource).toContain(`./characters/${moduleName}`);
      expect(charactersSource).toContain(`<${moduleName}`);
    }
  });
});

// better-sqlite3's native addon is compiled for Electron's ABI (see CLAUDE.md),
// so instantiating it under vitest's plain Node throws NODE_MODULE_VERSION
// errors. Node's built-in sqlite covers the exact Database surface db.ts uses
// (exec / prepare / pragma / transaction / close), so the queries under test
// run against real SQLite either way.
vi.mock("better-sqlite3", async () => {
  const { DatabaseSync } = await import("node:sqlite");

  class Database {
    private db: InstanceType<typeof DatabaseSync>;

    constructor(dbPath: string) {
      this.db = new DatabaseSync(dbPath);
    }

    pragma(source: string): unknown {
      return this.db.prepare(`PRAGMA ${source}`).all();
    }

    exec(sql: string): void {
      this.db.exec(sql);
    }

    prepare(sql: string) {
      return this.db.prepare(sql);
    }

    transaction<T extends (...args: unknown[]) => unknown>(fn: T) {
      return (...args: Parameters<T>): ReturnType<T> => {
        this.db.exec("BEGIN");
        try {
          const result = fn(...args) as ReturnType<T>;
          this.db.exec("COMMIT");
          return result;
        } catch (err) {
          this.db.exec("ROLLBACK");
          throw err;
        }
      };
    }

    close(): void {
      this.db.close();
    }
  }

  return { default: Database };
});

import {
  getDb,
  closeDb,
  insertGame,
  insertGameStats,
  insertConversionEvents,
  insertStockDeaths,
  insertThrowDIRows,
  insertRecoverySpans,
  insertShieldBlocks,
  insertWhiffEvents,
  insertHabitInstances,
  getCharacterEventProfile,
  type InsertGameParams,
  type InsertGameStatsParams,
  type ConversionEventRow,
  type StockDeathRow,
  type RecoverySpanRow,
  type ShieldBlockRow,
  type WhiffEventRow,
  type HabitInstanceRow,
} from "../src/db";

let hashCounter = 0;

function seedGame(overrides: Partial<InsertGameParams> = {}): number {
  hashCounter++;
  const params: InsertGameParams = {
    sessionId: null,
    replayPath: `C:/replays/test-${hashCounter}.slp`,
    replayHash: `hash-${hashCounter}`,
    playedAt: "2026-07-01 12:00:00",
    stage: "Battlefield",
    durationSeconds: 180,
    playerCharacter: "Fox",
    opponentCharacter: "Marth",
    playerTag: "HERO",
    playerConnectCode: "HERO#123",
    opponentTag: "VILLAIN",
    opponentConnectCode: "VILN#456",
    result: "win",
    endMethod: "stocks",
    playerFinalStocks: 2,
    playerFinalPercent: 40,
    opponentFinalStocks: 0,
    opponentFinalPercent: 100,
    gameNumber: 1,
    ...overrides,
  };
  return insertGame(params);
}

function seedStats(gameId: number, overrides: Partial<InsertGameStatsParams> = {}): void {
  const params: InsertGameStatsParams = {
    gameId,
    neutralWins: 10,
    neutralLosses: 8,
    neutralWinRate: 0.55,
    counterHits: 3,
    openingsPerKill: 4,
    totalOpenings: 16,
    totalConversions: 10,
    conversionRate: 0.6,
    avgDamagePerOpening: 25,
    killConversions: 4,
    lCancelRate: 0.85,
    wavedashCount: 0,
    dashDanceFrames: 400,
    avgStagePositionX: 0,
    timeOnPlatform: 0.1,
    timeInAir: 0,
    timeAtLedge: 0,
    totalDamageTaken: 300,
    totalDamageDealt: 0,
    avgDeathPercent: 95,
    recoveryAttempts: 4,
    recoverySuccessRate: 0.75,
    ledgeEntropy: 0.5,
    knockdownEntropy: 0.5,
    shieldPressureEntropy: 0.5,
    powerShieldCount: 1,
    edgeguardAttempts: 3,
    edgeguardSuccessRate: 0.66,
    shieldPressureSequences: 5,
    shieldPressureAvgDamage: 12,
    shieldBreaks: 0,
    shieldPokeRate: 0.1,
    diSurvivalScore: 0.5,
    diComboScore: 0.5,
    diAvgComboLengthReceived: 2,
    diAvgComboLengthDealt: 3,
    ...overrides,
  };
  insertGameStats(params);
}

function mkDeath(overrides: Partial<StockDeathRow> = {}): StockDeathRow {
  return {
    victimIsPlayer: true,
    stockNumber: 1,
    startFrame: 0,
    endFrame: 1000,
    startPercent: 0,
    deathPercent: 100,
    killerMoveId: null,
    deathDirection: null,
    died: true,
    verdict: null,
    diScore: null,
    stickX: null,
    stickY: null,
    launchAngleDeg: null,
    resourceFault: false,
    finalHitFrame: null,
    ...overrides,
  };
}

function mkHabit(overrides: Partial<HabitInstanceRow> = {}): HabitInstanceRow {
  return {
    isPlayer: true,
    situation: "knockdown",
    option: "getup",
    frame: 500,
    percent: 60,
    cornered: false,
    pressured: false,
    punished: false,
    ...overrides,
  };
}

function mkSpan(overrides: Partial<RecoverySpanRow> = {}): RecoverySpanRow {
  return {
    recoveringIsPlayer: true,
    startFrame: 100,
    endFrame: 250,
    startX: -90,
    startY: -20,
    launchQuadrant: "left-low",
    djFrame: null,
    djEarly: false,
    route: null,
    upbDelay: null,
    airdodgeUsed: false,
    landing: "ledge",
    edgeguarderDepth: "onstage",
    edgeguarderInvincibleLedgeFrames: 0,
    contested: false,
    hitDuringRecovery: false,
    ...overrides,
  };
}

function mkBlock(overrides: Partial<ShieldBlockRow> = {}): ShieldBlockRow {
  return {
    defenderIsPlayer: true,
    blockFrame: 300,
    attackKind: "aerial",
    attackLabel: "fair",
    defenderActionableFrame: 310,
    attackerActionableFrame: 318,
    frameGap: 8,
    inGrabRange: true,
    choice: "grab OOS",
    grade: "neutral",
    stringId: 0,
    stringFinal: true,
    punishedAttacker: false,
    gotHit: false,
    ...overrides,
  };
}

function mkWhiff(overrides: Partial<WhiffEventRow> = {}): WhiffEventRow {
  return {
    whifferIsPlayer: false,
    startFrame: 400,
    vulnerableEndFrame: 430,
    attackLabel: "fsmash",
    attackKind: "grounded",
    minDistance: 20,
    opportunity: true,
    punished: false,
    reactionDelay: null,
    ...overrides,
  };
}

function mkConversion(overrides: Partial<ConversionEventRow> = {}): ConversionEventRow {
  return {
    attackerIsPlayer: true,
    startFrame: 600,
    endFrame: 800,
    startPercent: 0,
    endPercent: 30,
    damage: 30,
    moveCount: 3,
    openerMoveId: 2,
    lastMoveId: 16,
    openingType: "neutral-win",
    didKill: false,
    movesJson: "[]",
    ...overrides,
  };
}

beforeAll(() => {
  getDb();

  // ── Fox: two games WITH events, one without (backfill gap) ─────────
  const foxG1 = seedGame({ durationSeconds: 200, result: "win", playerFinalStocks: 4 });
  const foxG2 = seedGame({ durationSeconds: 100, result: "loss", playerFinalStocks: 0, opponentFinalStocks: 2 });
  const foxG3 = seedGame({ durationSeconds: 300, result: "win", playerFinalStocks: 2 }); // no event rows

  seedStats(foxG1, { wavedashCount: 10, totalDamageDealt: 300.5, timeInAir: 0.5, timeAtLedge: 0.1 });
  seedStats(foxG2, { wavedashCount: 20, totalDamageDealt: 200, timeInAir: 0.5, timeAtLedge: 0.1 });
  seedStats(foxG3, { wavedashCount: 30, totalDamageDealt: 99.5, timeInAir: 0.5, timeAtLedge: 0.1 });

  // Deaths: 3 own (GOOD_DI / NO_DI+resource-fault / SD), 1 survived stock,
  // 1 opponent death that must stay out of the deaths bucket.
  insertStockDeaths(foxG1, [
    mkDeath({ verdict: "GOOD_DI", deathPercent: 80, killerMoveId: 16, deathDirection: "up" }),
    mkDeath({
      stockNumber: 2,
      verdict: "NO_DI",
      deathPercent: 120,
      killerMoveId: 15,
      deathDirection: "left",
      resourceFault: true,
    }),
    mkDeath({ victimIsPlayer: false, verdict: "WRONG_DI", deathPercent: 90, deathDirection: "right" }),
  ]);
  insertStockDeaths(foxG2, [
    mkDeath({ verdict: "SD", deathPercent: 40, deathDirection: "down" }),
    mkDeath({ stockNumber: 2, died: false, deathPercent: null }),
  ]);

  // Throw DI: two up-throws (one no-DI) + a forward-throw; opponent row excluded.
  insertThrowDIRows(foxG1, [
    {
      victimIsPlayer: true,
      frame: 100,
      throwDirection: "up",
      percent: 30,
      stickX: 0,
      stickY: 0,
      sector: 0,
      noDI: true,
    },
    {
      victimIsPlayer: true,
      frame: 900,
      throwDirection: "up",
      percent: 70,
      stickX: 0.9,
      stickY: 0.2,
      sector: 0,
      noDI: false,
    },
    {
      victimIsPlayer: true,
      frame: 1400,
      throwDirection: "forward",
      percent: 50,
      stickX: 0.9,
      stickY: 0,
      sector: 4,
      noDI: false,
    },
    {
      victimIsPlayer: false,
      frame: 2000,
      throwDirection: "back",
      percent: 55,
      stickX: 0,
      stickY: 0,
      sector: 0,
      noDI: true,
    },
  ]);

  // Habits: knockdown getup ×3 with condition splits, ledge roll ×1;
  // opponent-side copies must not leak into the player profile.
  insertHabitInstances(foxG1, [
    mkHabit({ cornered: true, punished: true }),
    mkHabit({ pressured: true }),
    mkHabit(),
    mkHabit({ situation: "ledge", option: "roll", pressured: true, punished: true }),
    mkHabit({ isPlayer: false }),
    mkHabit({ isPlayer: false, situation: "ledge", option: "roll", punished: true }),
  ]);

  // Recovery: 3 own spans; 2 opponent spans = own edgeguard opportunities.
  insertRecoverySpans(foxG1, [
    mkSpan({ route: "low", landing: "ledge" }),
    mkSpan({ route: "high", landing: "death", djFrame: 110, djEarly: true, contested: true }),
    mkSpan({ landing: "stage", contested: true }),
    mkSpan({ recoveringIsPlayer: false, edgeguarderDepth: "deep", landing: "death", contested: true }),
    mkSpan({ recoveringIsPlayer: false, edgeguarderDepth: "ledge", edgeguarderInvincibleLedgeFrames: 12 }),
  ]);

  // Shield: own defense (fair ×3 incl. a mid-string block, dash attack ×1)
  // and own pressure received (nair ×2 on the opponent's shield).
  insertShieldBlocks(foxG2, [
    mkBlock({ grade: "punish-taken", frameGap: 10, punishedAttacker: true }),
    mkBlock({ grade: "punish-missed", frameGap: 8 }),
    mkBlock({ grade: "pressured", frameGap: null, stringFinal: false, choice: null }),
    mkBlock({
      attackKind: "grounded",
      attackLabel: "dash attack",
      grade: "correct-hold",
      frameGap: -1,
      choice: "hold shield",
    }),
    mkBlock({
      defenderIsPlayer: false,
      attackLabel: "nair",
      grade: "punish-taken",
      frameGap: -3,
      punishedAttacker: true,
    }),
    mkBlock({ defenderIsPlayer: false, attackLabel: "nair", grade: "neutral", frameGap: -5 }),
  ]);

  // Whiffs: opponent whiffs = capture chances (3 opportunities, 1 punished,
  // delays 10/20); own whiffs = exposure, capped top-N by total.
  insertWhiffEvents(foxG2, [
    mkWhiff({ punished: true, reactionDelay: 10 }),
    mkWhiff({ reactionDelay: 20 }),
    mkWhiff(),
    mkWhiff({ opportunity: false, minDistance: 80 }),
    mkWhiff({ whifferIsPlayer: true, attackLabel: "fsmash", punished: true, reactionDelay: 12 }),
    mkWhiff({ whifferIsPlayer: true, attackLabel: "fsmash", opportunity: false }),
    mkWhiff({ whifferIsPlayer: true, attackLabel: "grab", opportunity: false }),
  ]);

  // Conversions: 2 neutral-wins (one kill at 130%, one squandered at 105%),
  // 1 counter-attack; opponent conversion at 150% must not count anywhere.
  insertConversionEvents(foxG1, [
    mkConversion({ didKill: true, endPercent: 130, damage: 30, lastMoveId: 16 }),
    mkConversion({ endPercent: 105, damage: 45 }),
    mkConversion({ openingType: "counter-attack", endPercent: 60, damage: 20, lastMoveId: 13 }),
    mkConversion({ attackerIsPlayer: false, endPercent: 150, damage: 50 }),
  ]);

  // ── Marth: one game with events that must never leak into Fox ──────
  const marthG1 = seedGame({ playerCharacter: "Marth", opponentCharacter: "Fox", result: "win", playerFinalStocks: 4 });
  seedStats(marthG1, { wavedashCount: 500, totalDamageDealt: 999 });
  insertStockDeaths(marthG1, [mkDeath({ verdict: "WRONG_DI", deathPercent: 60, killerMoveId: 17 })]);
  insertHabitInstances(marthG1, [mkHabit({ punished: true }), mkHabit({ situation: "oos", option: "roll forward" })]);
  insertConversionEvents(marthG1, [mkConversion({ endPercent: 110 })]);
  insertWhiffEvents(marthG1, [mkWhiff({ punished: true, reactionDelay: 99 })]);
  insertRecoverySpans(marthG1, [mkSpan({ landing: "death" })]);
  insertShieldBlocks(marthG1, [mkBlock({ grade: "punish-missed" })]);
  insertThrowDIRows(marthG1, [
    {
      victimIsPlayer: true,
      frame: 50,
      throwDirection: "down",
      percent: 10,
      stickX: 0,
      stickY: 0,
      sector: 0,
      noDI: true,
    },
  ]);
});

afterAll(() => {
  closeDb();
  const home = os.homedir();
  if (home.includes("magi-character-events-")) {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

describe("getCharacterEventProfile", () => {
  it("counts total games and distinct games with events", () => {
    const profile = getCharacterEventProfile("Fox");
    expect(profile.character).toBe("Fox");
    expect(profile.totalGames).toBe(3);
    // Events exist in foxG1 and foxG2 only — foxG3 is a backfill gap. Each
    // event-bearing game appears in several tables but is counted once.
    expect(profile.gamesWithEvents).toBe(2);
  });

  it("isolates per-character data — Marth rows never leak into Fox", () => {
    const fox = getCharacterEventProfile("Fox");
    expect(fox.deaths.verdicts.find((v) => v.verdict === "WRONG_DI")).toBeUndefined();
    expect(fox.habits.find((h) => h.situation === "oos")).toBeUndefined();
    expect(fox.deaths.killerMoves.find((m) => m.moveId === 17)).toBeUndefined();
    expect(fox.deaths.throwDI.find((t) => t.direction === "down")).toBeUndefined();
    expect(fox.trivia.totalWavedashes).toBe(60);

    const marth = getCharacterEventProfile("Marth");
    expect(marth.totalGames).toBe(1);
    expect(marth.gamesWithEvents).toBe(1);
    expect(marth.deaths.total).toBe(1);
    expect(marth.deaths.verdicts).toEqual([{ verdict: "WRONG_DI", count: 1 }]);
    expect(marth.conversions.squanderedKillPercent).toBe(1);
    expect(marth.trivia.totalWavedashes).toBe(500);
  });

  it("filters deaths to the player's own died stocks and distributes verdicts", () => {
    const { deaths } = getCharacterEventProfile("Fox");
    // 3 died player stocks — the survived stock and the opponent's death are out.
    expect(deaths.total).toBe(3);
    expect(deaths.avgDeathPercent).toBe(80); // (80 + 120 + 40) / 3
    expect(deaths.resourceFaults).toBe(1);
    const byVerdict = Object.fromEntries(deaths.verdicts.map((v) => [v.verdict, v.count]));
    expect(byVerdict).toEqual({ GOOD_DI: 1, NO_DI: 1, SD: 1 });
    const byDirection = Object.fromEntries(deaths.directions.map((d) => [d.direction, d.count]));
    expect(byDirection).toEqual({ up: 1, left: 1, down: 1 });
  });

  it("resolves killer move names from the shared move-id mapping", () => {
    const { deaths } = getCharacterEventProfile("Fox");
    expect(deaths.killerMoves).toHaveLength(2);
    const uair = deaths.killerMoves.find((m) => m.moveId === 16);
    expect(uair).toMatchObject({ moveName: "uair", count: 1, avgDeathPercent: 80 });
    expect(deaths.killerMoves.find((m) => m.moveId === 15)?.moveName).toBe("bair");
  });

  it("groups victim-side throw DI by direction", () => {
    const { deaths } = getCharacterEventProfile("Fox");
    expect(deaths.throwDI).toEqual([
      { direction: "up", total: 2, noDI: 1 },
      { direction: "forward", total: 1, noDI: 0 },
    ]);
  });

  it("splits habit options by cornered/pressured/punished conditions", () => {
    const { habits } = getCharacterEventProfile("Fox");
    // Opponent-side habit copies are excluded: 2 player rows only.
    expect(habits).toHaveLength(2);
    const getup = habits.find((h) => h.situation === "knockdown" && h.option === "getup");
    expect(getup).toEqual({
      situation: "knockdown",
      option: "getup",
      total: 3,
      punished: 1,
      cornered: 1,
      corneredPunished: 1,
      pressured: 1,
      pressuredPunished: 0,
    });
    const roll = habits.find((h) => h.situation === "ledge" && h.option === "roll");
    expect(roll).toMatchObject({ total: 1, punished: 1, pressured: 1, pressuredPunished: 1 });
  });

  it("keeps own recovery spans and opponent spans in separate buckets", () => {
    const { recovery } = getCharacterEventProfile("Fox");
    expect(recovery.ownSpans).toBe(3);
    const byRoute = Object.fromEntries(recovery.routes.map((r) => [r.route, r]));
    expect(byRoute["low"]).toMatchObject({ total: 1, died: 0 });
    expect(byRoute["high"]).toMatchObject({ total: 1, died: 1 });
    expect(recovery.routes).toHaveLength(2); // NULL-route span is not a route row
    expect(recovery.djEarly).toEqual({ total: 1, died: 1 });
    expect(recovery.contested).toEqual({ total: 2, died: 1 });
    const byLanding = Object.fromEntries(recovery.landings.map((l) => [l.landing, l.count]));
    expect(byLanding).toEqual({ ledge: 1, death: 1, stage: 1 });

    // Opponent spans = this player's edgeguard opportunities, not own spans.
    expect(recovery.edgeguard.opportunities).toBe(2);
    expect(recovery.edgeguard.invincibleLedgeSpans).toBe(1);
    const byDepth = Object.fromEntries(recovery.edgeguard.byDepth.map((d) => [d.depth, d]));
    expect(byDepth["deep"]).toMatchObject({ total: 1, kills: 1 });
    expect(byDepth["ledge"]).toMatchObject({ total: 1, kills: 0 });
  });

  it("separates shield defense (own blocks) from pressure received", () => {
    const { shield } = getCharacterEventProfile("Fox");
    expect(shield.defense.total).toBe(4);
    const grades = Object.fromEntries(shield.defense.grades.map((g) => [g.grade, g.count]));
    expect(grades).toEqual({ "punish-taken": 1, "punish-missed": 1, pressured: 1, "correct-hold": 1 });
    const fair = shield.defense.byMove.find((m) => m.attackLabel === "fair");
    // AVG skips the NULL mid-string gap: (10 + 8) / 2.
    expect(fair).toEqual({ attackLabel: "fair", blocks: 3, punishTaken: 1, punishMissed: 1, avgFrameGap: 9 });

    expect(shield.pressure.total).toBe(2);
    expect(shield.pressure.byMove).toEqual([
      { attackLabel: "nair", blocks: 2, punishedByDefender: 1, avgFrameGap: -4 },
    ]);
  });

  it("computes whiff capture rate from opponent whiffs and exposure from own", () => {
    const { whiffs } = getCharacterEventProfile("Fox");
    // Opponent opportunity rows only — the out-of-range whiff is excluded.
    expect(whiffs.captureOpportunities).toBe(3);
    expect(whiffs.capturePunished).toBe(1);
    expect(whiffs.captureMedianReactionDelay).toBe(15); // median of [10, 20]
    const byLabel = Object.fromEntries(whiffs.exposure.map((e) => [e.attackLabel, e]));
    expect(byLabel["fsmash"]).toMatchObject({ total: 2, opportunities: 1, punished: 1 });
    expect(byLabel["grab"]).toMatchObject({ total: 1, opportunities: 0, punished: 0 });
  });

  it("aggregates own conversions and counts squandered kill percent", () => {
    const { conversions } = getCharacterEventProfile("Fox");
    expect(conversions.total).toBe(3); // opponent's conversion excluded
    const byType = Object.fromEntries(conversions.byOpeningType.map((o) => [o.openingType, o]));
    expect(byType["neutral-win"]).toMatchObject({ count: 2, avgDamage: 37.5, kills: 1 });
    expect(byType["counter-attack"]).toMatchObject({ count: 1, avgDamage: 20, kills: 0 });
    expect(conversions.killMoves).toEqual([{ moveId: 16, moveName: "uair", count: 1, avgKillPercent: 130 }]);
    // Reached 105% without killing = 1; the opponent's 150% conversion is not ours.
    expect(conversions.squanderedKillPercent).toBe(1);
  });

  it("sums trivia across all of the character's games", () => {
    const { trivia } = getCharacterEventProfile("Fox");
    expect(trivia.totalPlaytimeSeconds).toBe(600); // 200 + 100 + 300
    expect(trivia.longestGameSeconds).toBe(300);
    expect(trivia.fourStockWins).toBe(1); // only foxG1 won with 4 stocks
    expect(trivia.sdCount).toBe(1);
    expect(trivia.totalDamageDealt).toBe(600); // 300.5 + 200 + 99.5
    expect(trivia.totalWavedashes).toBe(60);
    // time_in_air / time_at_ledge are fractions of the game — seconds = fraction × duration.
    expect(trivia.airtimeSeconds).toBe(300); // 0.5 × (200 + 100 + 300)
    expect(trivia.ledgeSeconds).toBe(60); // 0.1 × 600
    expect(trivia.totalLasersOrProjectiles).toBeNull();
  });

  it("returns an empty profile for a character with no games", () => {
    const profile = getCharacterEventProfile("Bowser");
    expect(profile.totalGames).toBe(0);
    expect(profile.gamesWithEvents).toBe(0);
    expect(profile.habits).toEqual([]);
    expect(profile.deaths.total).toBe(0);
    expect(profile.deaths.avgDeathPercent).toBeNull();
    expect(profile.recovery.ownSpans).toBe(0);
    expect(profile.recovery.edgeguard.opportunities).toBe(0);
    expect(profile.shield.defense.total).toBe(0);
    expect(profile.whiffs.captureOpportunities).toBe(0);
    expect(profile.whiffs.captureMedianReactionDelay).toBeNull();
    expect(profile.conversions.total).toBe(0);
    expect(profile.trivia.totalPlaytimeSeconds).toBe(0);
    expect(profile.trivia.longestGameSeconds).toBeNull();
  });
});
