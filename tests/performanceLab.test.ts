import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const PAGE_SOURCE = fs.readFileSync(path.resolve(__dirname, "../src/renderer/pages/PerformanceLab.tsx"), "utf-8");
const HANDLER_SOURCE = fs.readFileSync(path.resolve(__dirname, "../src/main/handlers/stats.ts"), "utf-8");
const PRELOAD_SOURCE = fs.readFileSync(path.resolve(__dirname, "../src/preload/index.ts"), "utf-8");

describe("Performance Lab integration", () => {
  it("uses a deterministic scorecard and avoids causal claims", () => {
    expect(PAGE_SOURCE).toContain("Current-form scorecard");
    expect(PAGE_SOURCE).toContain("not a verdict on why you lost");
    expect(PAGE_SOURCE).toContain("Replay facts first");
  });

  it("exposes the review and training workflows across Electron IPC", () => {
    expect(HANDLER_SOURCE).toContain('"stats:performanceHub"');
    expect(HANDLER_SOURCE).toContain('"stats:trainingLog:create"');
    expect(HANDLER_SOURCE).toContain('"stats:gameReviewNotes:add"');
    expect(PRELOAD_SOURCE).toContain("getPerformanceHub");
    expect(PRELOAD_SOURCE).toContain("createTrainingLog");
    expect(PRELOAD_SOURCE).toContain("addGameReviewNote");
  });
});
