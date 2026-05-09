import { describe, it, expect } from "vitest";
import { estimateFrame, clampFrame, frameToTimestamp } from "../src/renderer/utils/scrubber";

describe("estimateFrame", () => {
  it("returns playStartFrame at zero elapsed", () => {
    expect(estimateFrame(120, 1000, 1000, false, null)).toBe(120);
  });

  it("advances 60 frames per second while playing", () => {
    expect(estimateFrame(0, 1000, 2000, false, null)).toBe(60);
    expect(estimateFrame(0, 1000, 6000, false, null)).toBe(300);
  });

  it("freezes at pausedAtWallTimeMs when paused", () => {
    // Anchored at t=1000, paused at t=2000, current t=10000.
    // Should report 60 frames (1s of play), not 540.
    expect(estimateFrame(0, 1000, 10000, true, 2000)).toBe(60);
  });

  it("falls back to nowMs when paused with null pausedAt", () => {
    expect(estimateFrame(0, 1000, 2000, true, null)).toBe(60);
  });

  it("clamps negative results to zero", () => {
    // Time travel: now < playStartWallTime
    expect(estimateFrame(0, 5000, 1000, false, null)).toBe(0);
  });

  it("preserves a non-zero playStartFrame across elapsed time", () => {
    expect(estimateFrame(300, 1000, 2000, false, null)).toBe(360);
  });
});

describe("clampFrame", () => {
  it("returns target unchanged when in range", () => {
    expect(clampFrame(50, 100)).toBe(50);
  });

  it("clamps above totalFrames - 1", () => {
    expect(clampFrame(200, 100)).toBe(99);
  });

  it("clamps negative to zero", () => {
    expect(clampFrame(-5, 100)).toBe(0);
  });

  it("floors fractional targets", () => {
    expect(clampFrame(50.7, 100)).toBe(50);
  });

  it("returns floored max(0, target) when totalFrames is null", () => {
    expect(clampFrame(50, null)).toBe(50);
    expect(clampFrame(-5, null)).toBe(0);
  });

  it("returns floored max(0, target) when totalFrames is zero", () => {
    expect(clampFrame(50, 0)).toBe(50);
  });
});

describe("frameToTimestamp", () => {
  it("formats zero as 0:00", () => {
    expect(frameToTimestamp(0)).toBe("0:00");
  });

  it("formats sub-minute frames with zero-padded seconds", () => {
    expect(frameToTimestamp(60)).toBe("0:01");
    expect(frameToTimestamp(540)).toBe("0:09");
    expect(frameToTimestamp(600)).toBe("0:10");
  });

  it("formats multi-minute frames", () => {
    expect(frameToTimestamp(3600)).toBe("1:00");
    expect(frameToTimestamp(3660)).toBe("1:01");
    expect(frameToTimestamp(23400)).toBe("6:30");
  });

  it("clamps negative input to 0:00", () => {
    expect(frameToTimestamp(-10)).toBe("0:00");
  });
});
