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

const FINAL_GRADES = ["punish-taken", "punish-missed", "unsafe-challenge", "correct-hold", "neutral", "unknown"];
const KINDS = ["grounded", "aerial", "special", "grab", "projectile"];
const CHOICES = [
  "roll forward",
  "roll backward",
  "spot dodge",
  "grab OOS",
  "attack OOS",
  "aerial OOS",
  "special OOS",
  "jump OOS",
  "hold shield",
  "drop shield",
  null,
];

describe("shieldEvents: block records", () => {
  it("records are well-formed and sorted", () => {
    for (const r of results) {
      const blocks = r.frameEvents.shieldBlocks;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i]!;
        expect([0, 1]).toContain(b.defenderSlot);
        expect(KINDS).toContain(b.attackKind);
        expect(CHOICES).toContain(b.choice);
        expect(b.stringId).toBeGreaterThanOrEqual(0);
        if (b.stringFinal) {
          expect(FINAL_GRADES).toContain(b.grade);
        } else {
          expect(b.grade).toBe("pressured");
        }
        if (b.defenderActionableFrame != null) {
          expect(b.defenderActionableFrame).toBeGreaterThan(b.blockFrame);
        }
        if (b.frameGap != null) {
          expect(b.defenderActionableFrame).not.toBeNull();
          expect(b.attackerActionableFrame).not.toBeNull();
          expect(b.frameGap).toBe(b.attackerActionableFrame! - b.defenderActionableFrame!);
        }
        if (i > 0) expect(b.blockFrame).toBeGreaterThanOrEqual(blocks[i - 1]!.blockFrame);
      }
    }
  });

  it("string ids are per-defender monotone and finals terminate strings", () => {
    for (const r of results) {
      for (const slot of [0, 1] as const) {
        const mine = r.frameEvents.shieldBlocks.filter((b) => b.defenderSlot === slot);
        for (let i = 1; i < mine.length; i++) {
          expect(mine[i]!.stringId).toBeGreaterThanOrEqual(mine[i - 1]!.stringId);
          // A non-final block must be followed by another block in the same string.
          if (!mine[i - 1]!.stringFinal) {
            expect(mine[i]!.stringId).toBe(mine[i - 1]!.stringId);
          }
        }
        if (mine.length > 0) expect(mine[mine.length - 1]!.stringFinal).toBe(true);
      }
    }
  });

  it("grades respect their frame-gap preconditions", () => {
    for (const r of results) {
      for (const b of r.frameEvents.shieldBlocks.filter((x) => x.stringFinal)) {
        if (b.grade === "punish-taken" || b.grade === "punish-missed") {
          expect(b.frameGap!).toBeGreaterThanOrEqual(8);
          expect(b.inGrabRange).toBe(true);
          if (b.grade === "punish-taken") expect(b.punishedAttacker).toBe(true);
        }
        if (b.grade === "unsafe-challenge") {
          expect(b.frameGap!).toBeLessThanOrEqual(-2);
          expect(b.gotHit).toBe(true);
        }
        if (b.grade === "correct-hold") {
          expect(b.frameGap!).toBeLessThanOrEqual(-2);
        }
        if (b.grade === "unknown") {
          expect(b.frameGap).toBeNull();
        }
      }
    }
  });

  it("cross-checks with on-shield attack instances", () => {
    // If the tagger saw attacks land on shield, block events must exist for
    // the victim (and vice-versa block events imply shield contact happened).
    for (const r of results) {
      for (const slot of [0, 1] as const) {
        const attackerOnShield = r.frameEvents.attacks[slot].filter((a) => a.onShield).length;
        const victimBlocks = r.frameEvents.shieldBlocks.filter((b) => b.defenderSlot !== slot).length;
        if (attackerOnShield > 0) {
          expect(victimBlocks).toBeGreaterThan(0);
        }
      }
    }
  });

  it("fixtures with shield play produce block records", () => {
    const total = results.reduce((n, r) => n + r.frameEvents.shieldBlocks.length, 0);
    expect(total).toBeGreaterThan(0);
  });
});
