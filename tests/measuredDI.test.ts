import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import { processGame, DI_DEADZONE, assembleUserPrompt } from "../src/pipeline";
import type { GameResult } from "../src/pipeline";

const TEST_REPLAYS_DIR = path.resolve(__dirname, "fixtures");

const replays = fs
  .readdirSync(TEST_REPLAYS_DIR)
  .filter((f) => f.endsWith(".slp"))
  .map((f) => path.join(TEST_REPLAYS_DIR, f));

// Parse every fixture once; suites below assert over all of them.
const results: GameResult[] = replays.map((fp, i) => processGame(fp, i + 1));

const VERDICTS = ["NO_DI", "WRONG_DI", "OK_DI", "GOOD_DI", "SD", "UNKNOWN"];
const THROW_DIRECTIONS = ["forward", "back", "up", "down"];

describe("measuredDI: death verdicts", () => {
  it("every died stock gets a verdict; surviving stocks get none", () => {
    for (const r of results) {
      for (const s of r.frameEvents.stocks) {
        if (s.died) {
          expect(s.verdict).not.toBeNull();
          expect(VERDICTS).toContain(s.verdict);
        } else {
          expect(s.verdict).toBeNull();
          expect(s.diScore).toBeNull();
          expect(s.resourceFault).toBe(false);
        }
      }
    }
  });

  it("scored verdicts have consistent stick + score data", () => {
    for (const r of results) {
      for (const s of r.frameEvents.stocks) {
        if (s.verdict === "GOOD_DI" || s.verdict === "OK_DI" || s.verdict === "WRONG_DI") {
          expect(s.diScore).not.toBeNull();
          expect(s.diScore!).toBeGreaterThanOrEqual(0);
          expect(s.diScore!).toBeLessThanOrEqual(1);
          const mag = Math.hypot(s.diStickX ?? 0, s.diStickY ?? 0);
          expect(mag).toBeGreaterThanOrEqual(DI_DEADZONE);
          expect(s.launchAngleDeg).not.toBeNull();
          expect(s.launchAngleDeg!).toBeGreaterThanOrEqual(-180);
          expect(s.launchAngleDeg!).toBeLessThanOrEqual(180);
          // Verdict thresholds must match the score.
          if (s.verdict === "GOOD_DI") expect(s.diScore!).toBeGreaterThanOrEqual(0.7);
          if (s.verdict === "WRONG_DI") expect(s.diScore!).toBeLessThan(0.3);
        }
        if (s.verdict === "NO_DI") {
          const mag = Math.hypot(s.diStickX ?? 0, s.diStickY ?? 0);
          expect(mag).toBeLessThan(DI_DEADZONE);
          expect(s.finalHitFrame).not.toBeNull();
        }
      }
    }
  });

  it("finds at least one gradeable death across the fixtures", () => {
    const graded = results
      .flatMap((r) => r.frameEvents.stocks)
      .filter((s) => s.died && s.verdict !== "UNKNOWN" && s.verdict !== "SD");
    expect(graded.length).toBeGreaterThan(0);
  });

  it("final hit frame sits inside the stock window", () => {
    for (const r of results) {
      for (const s of r.frameEvents.stocks) {
        if (s.finalHitFrame != null && s.endFrame != null) {
          expect(s.finalHitFrame).toBeGreaterThanOrEqual(s.startFrame);
          expect(s.finalHitFrame).toBeLessThanOrEqual(s.endFrame);
        }
      }
    }
  });
});

describe("measuredDI: throw DI records", () => {
  it("records are well-formed and sorted", () => {
    for (const r of results) {
      const t = r.frameEvents.throwDI;
      for (let i = 0; i < t.length; i++) {
        const rec = t[i]!;
        expect([0, 1]).toContain(rec.victimSlot);
        expect(THROW_DIRECTIONS).toContain(rec.throwDirection);
        expect(rec.sector).toBeGreaterThanOrEqual(0);
        expect(rec.sector).toBeLessThanOrEqual(7);
        expect(rec.percent).toBeGreaterThanOrEqual(0);
        expect(rec.noDI).toBe(Math.hypot(rec.stickX, rec.stickY) < DI_DEADZONE);
        if (i > 0) expect(rec.frame).toBeGreaterThanOrEqual(t[i - 1]!.frame);
      }
    }
  });

  it("games with grab-throw conversions produce throw DI records", () => {
    // Only assert when a throw move (52-55) appears in a conversion.
    for (const r of results) {
      const throwsLanded = r.frameEvents.conversions.some((c) => c.moves.some((m) => m.moveId >= 52 && m.moveId <= 55));
      if (throwsLanded) {
        expect(r.frameEvents.throwDI.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("measuredDI: surfaced to coaching", () => {
  it("prompt contains the Measured DI section when deaths exist", () => {
    const withDeath = results.find((r) => r.frameEvents.stocks.some((s) => s.died && s.verdict != null));
    if (!withDeath) return;
    const tag = withDeath.gameSummary.players[0].tag;
    const prompt = assembleUserPrompt([withDeath], tag);
    expect(prompt).toContain("Measured DI");
  });

  it("death key moments carry DI verdict text when gradeable", () => {
    for (const r of results) {
      for (const slot of [0, 1] as const) {
        const gradeable = r.frameEvents.stocks.filter(
          (s) =>
            s.victimSlot === slot &&
            s.died &&
            (s.verdict === "NO_DI" || s.verdict === "WRONG_DI" || s.verdict === "GOOD_DI"),
        );
        if (gradeable.length === 0) continue;
        const deathMoments = r.derivedInsights[slot].keyMoments.filter((m) => m.type === "death");
        // At least one death moment should carry the measured-DI annotation.
        if (deathMoments.length > 0) {
          expect(deathMoments.some((m) => m.description.includes("DI"))).toBe(true);
        }
      }
    }
  });
});
