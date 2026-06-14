import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const ANALYSIS_HANDLER_SOURCE = fs.readFileSync(path.resolve(__dirname, "../src/main/handlers/analysis.ts"), "utf-8");
const REPLAY_ANALYZER_SOURCE = fs.readFileSync(path.resolve(__dirname, "../src/replayAnalyzer.ts"), "utf-8");
const GAME_THEATER_SOURCE = fs.readFileSync(path.resolve(__dirname, "../src/renderer/pages/GameTheater.tsx"), "utf-8");

describe("analysis scope separation", () => {
  it("regular game-analysis caches ignore cornerman rows", () => {
    const scopedGameCacheMatches = ANALYSIS_HANDLER_SOURCE.match(/game_id = \? AND scope = 'game'/g) ?? [];

    expect(scopedGameCacheMatches.length).toBeGreaterThanOrEqual(2);
    expect(REPLAY_ANALYZER_SOURCE).toContain("game_id = ? AND model_used = ? AND scope = 'game'");
  });

  it("game detail does not preload cornerman cards as regular coaching", () => {
    expect(GAME_THEATER_SOURCE).toContain("return gameScope?.analysisText;");
  });

  it("shows game coaching above post-game stats", () => {
    expect(GAME_THEATER_SOURCE.indexOf("<CoachingPanel")).toBeGreaterThan(-1);
    expect(GAME_THEATER_SOURCE.indexOf("<GameStats game={game} />")).toBeGreaterThan(-1);
    expect(GAME_THEATER_SOURCE.indexOf("<CoachingPanel")).toBeLessThan(
      GAME_THEATER_SOURCE.indexOf("<GameStats game={game} />"),
    );
  });
});
