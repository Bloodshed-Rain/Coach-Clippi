import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import { processGame, findPlayerIdx, computeAdaptationSignals, assembleUserPrompt } from "../src/pipeline";

const TEST_REPLAYS_DIR = path.resolve(__dirname, "../test-replays");

function listReplays(): string[] {
  if (!fs.existsSync(TEST_REPLAYS_DIR)) return [];
  return fs
    .readdirSync(TEST_REPLAYS_DIR)
    .filter((f) => f.endsWith(".slp"))
    .map((f) => path.join(TEST_REPLAYS_DIR, f));
}

// Replay fixtures live only on developer machines (not committed). When they
// are absent (fresh clone / CI), the fixture-dependent suites skip cleanly
// instead of failing on ENOENT.
const hasReplays = listReplays().length > 0;

function getTestReplay(): string {
  const files = listReplays();
  if (files.length === 0) throw new Error("No test replays found");
  return files[0]!;
}

function getMultipleTestReplays(count: number): string[] {
  return listReplays().slice(0, count);
}

describe("processGame", () => {
  it.skipIf(!hasReplays)("parses a valid .slp file and returns GameResult shape", () => {
    const filePath = getTestReplay();
    const result = processGame(filePath, 1);

    expect(result).toHaveProperty("gameSummary");
    expect(result).toHaveProperty("derivedInsights");
    expect(result).toHaveProperty("startAt");

    const { gameSummary } = result;
    expect(gameSummary.players).toHaveLength(2);
    expect(gameSummary.stage).toBeTruthy();
    expect(gameSummary.duration).toBeGreaterThan(0);
    expect(gameSummary.result).toHaveProperty("winner");
    expect(gameSummary.result).toHaveProperty("endMethod");
  });

  it.skipIf(!hasReplays)("returns valid player stats", () => {
    const filePath = getTestReplay();
    const { gameSummary } = processGame(filePath, 1);

    for (const player of gameSummary.players) {
      expect(player.character).toBeTruthy();
      expect(player.tag).toBeTruthy();
      expect(player.neutralWinRate).toBeGreaterThanOrEqual(0);
      expect(player.neutralWinRate).toBeLessThanOrEqual(1);
      expect(player.lCancelRate).toBeGreaterThanOrEqual(0);
      expect(player.lCancelRate).toBeLessThanOrEqual(1);
      expect(player.totalOpenings).toBeGreaterThanOrEqual(0);
      expect(player.stocks).toBeInstanceOf(Array);
    }
  });

  it.skipIf(!hasReplays)("returns valid derived insights", () => {
    const filePath = getTestReplay();
    const { derivedInsights } = processGame(filePath, 1);

    expect(derivedInsights).toHaveLength(2);
    for (const insights of derivedInsights) {
      expect(insights).toHaveProperty("afterKnockdown");
      expect(insights).toHaveProperty("afterLedgeGrab");
      expect(insights).toHaveProperty("afterShieldPressure");
      expect(insights).toHaveProperty("performanceByStock");
      expect(insights).toHaveProperty("adaptationSignals");
    }
  });

  it("throws on nonexistent file", () => {
    expect(() => processGame("/nonexistent/file.slp", 1)).toThrow();
  });

  it("throws on non-slp file", () => {
    const configPath = path.resolve(__dirname, "../package.json");
    expect(() => processGame(configPath, 1)).toThrow();
  });
});

describe("findPlayerIdx", () => {
  it.skipIf(!hasReplays)("finds a player by tag", () => {
    const filePath = getTestReplay();
    const { gameSummary } = processGame(filePath, 1);
    const tag = gameSummary.players[0].tag;

    const idx = findPlayerIdx(gameSummary, tag);
    expect(idx).toBe(0);
  });

  it.skipIf(!hasReplays)("returns 0 as fallback for unknown tag", () => {
    const filePath = getTestReplay();
    const { gameSummary } = processGame(filePath, 1);

    const idx = findPlayerIdx(gameSummary, "NONEXISTENT_PLAYER_TAG_XYZ");
    expect(idx).toBe(0);
  });
});

describe("computeAdaptationSignals", () => {
  it.skipIf(!hasReplays)("returns signals for multi-game sets", () => {
    const replays = getMultipleTestReplays(3);
    if (replays.length < 2) return; // skip if not enough replays

    const results = replays.map((fp, i) => processGame(fp, i + 1));
    const tag = results[0]!.gameSummary.players[0].tag;
    const signals = computeAdaptationSignals(results, tag);

    expect(signals).toBeInstanceOf(Array);
  });
});

describe("assembleUserPrompt", () => {
  it.skipIf(!hasReplays)("produces a non-empty prompt string", () => {
    const filePath = getTestReplay();
    const result = processGame(filePath, 1);
    const tag = result.gameSummary.players[0].tag;

    const prompt = assembleUserPrompt([result], tag);
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });
});
