import { describe, expect, it } from "vitest";

import { shouldEmitSnapshot } from "../src/cornermanLiveMonitor";

describe("shouldEmitSnapshot", () => {
  it("always emits the first snapshot (instant paint on becoming owner)", () => {
    expect(shouldEmitSnapshot({ nowMs: 0, lastEmitMs: 0, isFirst: true, phaseChanged: false, advanced: false })).toBe(true);
  });

  it("emits immediately on a live→ended phase change (freeze FINAL without waiting)", () => {
    expect(shouldEmitSnapshot({ nowMs: 100, lastEmitMs: 0, isFirst: false, phaseChanged: true, advanced: false })).toBe(true);
  });

  it("does not emit a paused/wedged game (no frame advancement)", () => {
    // Renderer surfaces this silence as STALE rather than us pushing stale frames.
    expect(shouldEmitSnapshot({ nowMs: 10_000, lastEmitMs: 0, isFirst: false, phaseChanged: false, advanced: false })).toBe(false);
  });

  it("throttles advancing snapshots to the emit window", () => {
    expect(shouldEmitSnapshot({ nowMs: 1500, lastEmitMs: 0, isFirst: false, phaseChanged: false, advanced: true })).toBe(false);
    expect(shouldEmitSnapshot({ nowMs: 2000, lastEmitMs: 0, isFirst: false, phaseChanged: false, advanced: true })).toBe(true);
    expect(shouldEmitSnapshot({ nowMs: 2500, lastEmitMs: 0, isFirst: false, phaseChanged: false, advanced: true })).toBe(true);
  });
});
