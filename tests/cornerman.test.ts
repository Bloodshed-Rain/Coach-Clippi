import { describe, it, expect } from "vitest";
import path from "path";
import { processGame, findPlayerIdx } from "../src/pipeline";
import type { GameResult } from "../src/pipeline";
import { advanceLiveSet, SET_GAP_MS, MIN_GAME_SECONDS, type LiveSetState } from "../src/cornerman";

const FIXTURES = path.resolve(__dirname, "fixtures");
const game1 = processGame(path.join(FIXTURES, "game1.slp"), 1);
const game2 = processGame(path.join(FIXTURES, "game2.slp"), 2);
const targetTag = game1.gameSummary.players[0].tag;

/** Deep-clone a GameResult so tests can doctor fields without cross-contamination */
function clone(gr: GameResult): GameResult {
  return JSON.parse(JSON.stringify(gr)) as GameResult;
}

describe("advanceLiveSet", () => {
  it("starts a new set from null state", () => {
    const out = advanceLiveSet(null, game1, targetTag, Date.parse("2026-06-11T20:00:00Z"));
    expect(out).not.toBeNull();
    expect(out!.isNewSet).toBe(true);
    expect(out!.state.games).toHaveLength(1);
    expect(out!.state.targetTag).toBe(targetTag);
    expect(out!.state.opponentTag).toBe(
      game1.gameSummary.players[findPlayerIdx(game1.gameSummary, targetTag) === 0 ? 1 : 0].tag,
    );
  });

  it("continues the set for the same opponent within the gap window", () => {
    const first = advanceLiveSet(null, game1, targetTag, 0)!;
    const g2 = clone(game2);
    g2.gameSummary.duration = 50; // game2 fixture is too short (23.98s), so we fix it for testing
    const out = advanceLiveSet(first.state, g2, targetTag, 60_000)!;
    expect(out.isNewSet).toBe(false);
    expect(out.state.games).toHaveLength(2);
  });

  it("starts a new set after a gap longer than SET_GAP_MS (using arrival time when startAt is null)", () => {
    const g1 = clone(game1);
    const g2 = clone(game2);
    g1.startAt = null;
    g2.startAt = null;
    g2.gameSummary.duration = 50; // game2 fixture is too short, fix for testing
    const first = advanceLiveSet(null, g1, targetTag, 0)!;
    const out = advanceLiveSet(first.state, g2, targetTag, SET_GAP_MS + 1)!;
    expect(out.isNewSet).toBe(true);
    expect(out.state.games).toHaveLength(1);
  });

  it("starts a new set when the opponent changes", () => {
    const first = advanceLiveSet(null, game1, targetTag, 0)!;
    const g2 = clone(game2);
    g2.gameSummary.duration = 50; // game2 fixture is too short, fix for testing
    const oppIdx = findPlayerIdx(g2.gameSummary, targetTag) === 0 ? 1 : 0;
    g2.gameSummary.players[oppIdx].tag = "SOMEONE ELSE";
    g2.gameSummary.players[oppIdx].connectCode = "ELSE#999";
    const out = advanceLiveSet(first.state, g2, targetTag, 60_000)!;
    expect(out.isNewSet).toBe(true);
    expect(out.state.opponentTag).toBe("SOMEONE ELSE");
    expect(out.state.opponentKey).toBe("ELSE#999");
    expect(out.state.games).toHaveLength(1);
  });

  it("ignores games shorter than MIN_GAME_SECONDS", () => {
    const g = clone(game1);
    g.gameSummary.duration = MIN_GAME_SECONDS - 1;
    expect(advanceLiveSet(null, g, targetTag, 0)).toBeNull();
  });

  it("tracks score: win when winner is target, loss when winner is opponent, draw only when unresolvable", () => {
    const idx = findPlayerIdx(game1.gameSummary, targetTag);
    const oppIdx = idx === 0 ? 1 : 0;

    const winGame = clone(game1);
    winGame.gameSummary.result.winner = targetTag;
    winGame.gameSummary.result.finalStocks[idx] = 2;
    winGame.gameSummary.result.finalStocks[oppIdx] = 0;

    const lossGame = clone(game2);
    lossGame.gameSummary.duration = 50; // game2 fixture is too short, fix for testing
    lossGame.gameSummary.result.winner = lossGame.gameSummary.players[oppIdx].tag;
    lossGame.gameSummary.result.finalStocks[idx] = 0;
    lossGame.gameSummary.result.finalStocks[oppIdx] = 1;

    // A quit-out with a known winner is NOT a draw — only an unresolvable
    // ending (no winner data, both alive, no stock/percent signal) is.
    const drawGame = clone(game2);
    drawGame.gameSummary.duration = 50; // game2 fixture is too short, fix for testing
    drawGame.gameSummary.result.winner = "Unknown";
    drawGame.gameSummary.result.endMethod = "unknown";
    drawGame.gameSummary.result.finalStocks[idx] = 2;
    drawGame.gameSummary.result.finalStocks[oppIdx] = 2;

    let state: LiveSetState | null = null;
    state = advanceLiveSet(state, winGame, targetTag, 0)!.state;
    state = advanceLiveSet(state, lossGame, targetTag, 1000)!.state;
    state = advanceLiveSet(state, drawGame, targetTag, 2000)!.state;

    expect(state.wins).toBe(1);
    expect(state.losses).toBe(1);
    expect(state.games).toHaveLength(3);
  });
});
