import { describe, it, expect } from "vitest";
import { classifyGameResult } from "../src/pipeline";

type ResultInfo = Parameters<typeof classifyGameResult>[0];

function res(overrides: Partial<ResultInfo>): ResultInfo {
  return {
    winner: "Unknown",
    endMethod: "stocks",
    finalStocks: [0, 2],
    finalPercents: [50, 20],
    ...overrides,
  };
}

describe("classifyGameResult", () => {
  it("trusts a known winner tag (win)", () => {
    const r = res({ winner: "MANG0", finalStocks: [2, 0] });
    expect(classifyGameResult(r, "MANG0", "PPMD", 0)).toBe("win");
  });

  it("trusts a known winner tag (loss)", () => {
    const r = res({ winner: "PPMD", finalStocks: [0, 2] });
    expect(classifyGameResult(r, "MANG0", "PPMD", 0)).toBe("loss");
  });

  it("does NOT mark an LRAS quit-out as a draw when the winner is known", () => {
    // Both players still have stocks — the old importer forced 'draw' here.
    const r = res({ winner: "MANG0", endMethod: "LRAS", finalStocks: [3, 2] });
    expect(classifyGameResult(r, "MANG0", "PPMD", 0)).toBe("win");
    expect(classifyGameResult(r, "PPMD", "MANG0", 1)).toBe("loss");
  });

  it("resolves an unknown-winner LRAS by stock lead", () => {
    const r = res({ winner: "Unknown", endMethod: "LRAS", finalStocks: [1, 3] });
    expect(classifyGameResult(r, "MANG0", "PPMD", 0)).toBe("loss");
    expect(classifyGameResult(r, "PPMD", "MANG0", 1)).toBe("win");
  });

  it("resolves an unknown-winner LRAS at equal stocks by lower percent", () => {
    const r = res({ winner: "Unknown", endMethod: "LRAS", finalStocks: [2, 2], finalPercents: [110.4, 35.2] });
    expect(classifyGameResult(r, "MANG0", "PPMD", 0)).toBe("loss");
    expect(classifyGameResult(r, "PPMD", "MANG0", 1)).toBe("win");
  });

  it("keeps a truly tied LRAS as a draw", () => {
    const r = res({ winner: "Unknown", endMethod: "LRAS", finalStocks: [2, 2], finalPercents: [42.7, 42.1] });
    // Same truncated percent — no basis to call it
    expect(classifyGameResult(r, "MANG0", "PPMD", 0)).toBe("draw");
  });

  it("resolves a completed game with no winner data by the 0-stock loser", () => {
    const r = res({ winner: "Unknown", endMethod: "unknown", finalStocks: [0, 1] });
    expect(classifyGameResult(r, "MANG0", "PPMD", 0)).toBe("loss");
    expect(classifyGameResult(r, "PPMD", "MANG0", 1)).toBe("win");
  });

  it("keeps an unknown ending with both players alive as a draw", () => {
    const r = res({ winner: "Unknown", endMethod: "unknown", finalStocks: [3, 2] });
    expect(classifyGameResult(r, "MANG0", "PPMD", 0)).toBe("draw");
  });

  it("falls back to stocks when both players share a tag (winner ambiguous)", () => {
    const r = res({ winner: "FOX", endMethod: "stocks", finalStocks: [4, 0] });
    expect(classifyGameResult(r, "FOX", "FOX", 0)).toBe("win");
    expect(classifyGameResult(r, "FOX", "FOX", 1)).toBe("loss");
  });

  it("resolves timeouts with unknown winner by stock lead", () => {
    const r = res({ winner: "Unknown", endMethod: "timeout", finalStocks: [2, 1], finalPercents: [80, 10] });
    expect(classifyGameResult(r, "MANG0", "PPMD", 0)).toBe("win");
  });

  it("treats a sub-30s quit-out as a false start (draw) even with a known winner", () => {
    const r = res({ winner: "MANG0", endMethod: "LRAS", finalStocks: [4, 3] });
    expect(classifyGameResult(r, "MANG0", "PPMD", 0, 12)).toBe("draw");
    expect(classifyGameResult(r, "PPMD", "MANG0", 1, 12)).toBe("draw");
  });

  it("does not apply the false-start rule at or past 30s", () => {
    const r = res({ winner: "MANG0", endMethod: "LRAS", finalStocks: [4, 3] });
    expect(classifyGameResult(r, "MANG0", "PPMD", 0, 30)).toBe("win");
    expect(classifyGameResult(r, "MANG0", "PPMD", 0, 145)).toBe("win");
  });

  it("does not apply the false-start rule when a player is already dead", () => {
    // A 25s 4-stock ending by LRAS-after-last-stock is still decisive
    const r = res({ winner: "MANG0", endMethod: "LRAS", finalStocks: [4, 0] });
    expect(classifyGameResult(r, "MANG0", "PPMD", 0, 25)).toBe("win");
  });
});
