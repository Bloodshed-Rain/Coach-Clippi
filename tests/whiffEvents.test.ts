import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import { processGame } from "../src/pipeline";
import type { GameResult } from "../src/pipeline";

const TEST_REPLAYS_DIR = path.resolve(__dirname, "fixtures");

const replays = fs
  .readdirSync(TEST_REPLAYS_DIR)
  .filter((f) => f.endsWith(".slp"))
  .map((f) => path.join(TEST_REPLAYS_DIR, f));

const results: GameResult[] = replays.map((fp, i) => processGame(fp, i + 1));

const KINDS = ["grounded", "aerial", "special", "grab"];

describe("whiffEvents: ledger records", () => {
  it("records are well-formed and sorted", () => {
    for (const r of results) {
      const whiffs = r.frameEvents.whiffs;
      for (let i = 0; i < whiffs.length; i++) {
        const w = whiffs[i]!;
        expect([0, 1]).toContain(w.whifferSlot);
        expect(KINDS).toContain(w.attackKind);
        expect(typeof w.attackLabel).toBe("string");
        expect(w.vulnerableEndFrame).toBeGreaterThanOrEqual(w.startFrame);
        expect(w.vulnerableEndFrame - w.startFrame).toBeLessThanOrEqual(90);
        expect(w.minDistance).toBeGreaterThanOrEqual(0);
        if (w.reactionDelay != null) expect(w.reactionDelay).toBeGreaterThan(0);
        if (i > 0) expect(w.startFrame).toBeGreaterThanOrEqual(whiffs[i - 1]!.startFrame);
      }
    }
  });

  it("opportunities require proximity", () => {
    for (const r of results) {
      for (const w of r.frameEvents.whiffs.filter((x) => x.opportunity)) {
        expect(w.minDistance).toBeLessThanOrEqual(40);
      }
    }
  });

  it("whiff events only come from unconnected attack instances", () => {
    for (const r of results) {
      for (const w of r.frameEvents.whiffs) {
        const backing = r.frameEvents.attacks[w.whifferSlot].find((a) => a.startFrame === w.startFrame && !a.connected);
        expect(backing).toBeDefined();
      }
    }
  });

  it("punished opportunities are backed by an observer conversion", () => {
    for (const r of results) {
      for (const w of r.frameEvents.whiffs.filter((x) => x.punished)) {
        const observerSlot = w.whifferSlot === 0 ? 1 : 0;
        const backing = r.frameEvents.conversions.some(
          (c) =>
            c.attackerSlot === observerSlot &&
            c.startFrame >= w.startFrame &&
            c.startFrame <= w.vulnerableEndFrame + 20,
        );
        expect(backing).toBe(true);
      }
    }
  });

  it("a real game produces whiffs, and some in-range ones", () => {
    const all = results.flatMap((r) => r.frameEvents.whiffs);
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((w) => w.opportunity)).toBe(true);
  });
});
