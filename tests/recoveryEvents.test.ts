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

const LANDINGS = ["ledge", "stage", "death"];
const DEPTHS = ["onstage", "ledge", "shallow", "deep"];
const ROUTES = ["high", "mid", "low", null];
const QUADRANTS = ["left-high", "left-low", "right-high", "right-low"];

describe("recoveryEvents: span records", () => {
  it("spans are well-formed and sorted", () => {
    for (const r of results) {
      const spans = r.frameEvents.recoverySpans;
      for (let i = 0; i < spans.length; i++) {
        const s = spans[i]!;
        expect([0, 1]).toContain(s.playerSlot);
        expect(s.endFrame).toBeGreaterThanOrEqual(s.startFrame);
        expect(LANDINGS).toContain(s.landing);
        expect(DEPTHS).toContain(s.edgeguarderDepth);
        expect(ROUTES).toContain(s.route);
        expect(QUADRANTS).toContain(s.launchQuadrant);
        expect(s.edgeguarderInvincibleLedgeFrames).toBeGreaterThanOrEqual(0);
        if (i > 0) expect(s.startFrame).toBeGreaterThanOrEqual(spans[i - 1]!.startFrame);
      }
    }
  });

  it("djEarly implies the double jump was actually used", () => {
    for (const r of results) {
      for (const s of r.frameEvents.recoverySpans) {
        if (s.djEarly) expect(s.djFrame).not.toBeNull();
        if (s.djFrame != null) {
          expect(s.djFrame).toBeGreaterThanOrEqual(s.startFrame);
          expect(s.djFrame).toBeLessThanOrEqual(s.endFrame);
        }
        if (s.upbDelay != null) expect(s.upbDelay).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("death spans reconcile with died stock records", () => {
    for (const r of results) {
      for (const s of r.frameEvents.recoverySpans.filter((x) => x.landing === "death")) {
        const backing = r.frameEvents.stocks.some(
          (st) =>
            st.victimSlot === s.playerSlot && st.died && st.endFrame != null && Math.abs(st.endFrame - s.endFrame) < 60,
        );
        expect(backing).toBe(true);
      }
    }
  });

  it("deep or shallow edgeguarder depth implies the span was contested", () => {
    for (const r of results) {
      for (const s of r.frameEvents.recoverySpans) {
        if (s.edgeguarderDepth === "shallow" || s.edgeguarderDepth === "deep" || s.edgeguarderDepth === "ledge") {
          expect(s.contested).toBe(true);
        }
      }
    }
  });

  it("fixtures with offstage play produce spans", () => {
    // At least one fixture should contain a recovery situation.
    const total = results.reduce((n, r) => n + r.frameEvents.recoverySpans.length, 0);
    expect(total).toBeGreaterThan(0);
  });
});
