import { describe, it, expect } from "vitest";
import {
  computeOverlayBounds,
  OVERLAY_WIDTH,
  OVERLAY_HEIGHT,
  OVERLAY_MARGIN,
} from "../src/overlayLayout";

describe("computeOverlayBounds", () => {
  it("anchors to the bottom-right of the work area with a margin", () => {
    const workArea = { x: 0, y: 0, width: 1920, height: 1040 };
    const b = computeOverlayBounds(workArea);
    expect(b.width).toBe(OVERLAY_WIDTH);
    expect(b.height).toBe(OVERLAY_HEIGHT);
    expect(b.x).toBe(1920 - OVERLAY_WIDTH - OVERLAY_MARGIN);
    expect(b.y).toBe(1040 - OVERLAY_HEIGHT - OVERLAY_MARGIN);
  });

  it("respects a work area that does not start at the origin (secondary monitor / taskbar offsets)", () => {
    const workArea = { x: 1920, y: 40, width: 1280, height: 980 };
    const b = computeOverlayBounds(workArea);
    expect(b.x).toBe(1920 + 1280 - OVERLAY_WIDTH - OVERLAY_MARGIN);
    expect(b.y).toBe(40 + 980 - OVERLAY_HEIGHT - OVERLAY_MARGIN);
  });

  it("never returns coordinates left/above the work area origin on tiny screens", () => {
    const workArea = { x: 0, y: 0, width: 300, height: 200 };
    const b = computeOverlayBounds(workArea);
    expect(b.x).toBe(0); // clamped to the work-area origin
    expect(b.y).toBe(0);
  });

  it("clamps one dimension independently when only that dimension overflows", () => {
    const narrow = computeOverlayBounds({ x: 0, y: 0, width: 300, height: 1080 });
    expect(narrow.x).toBe(0); // clamped
    expect(narrow.y).toBe(1080 - OVERLAY_HEIGHT - OVERLAY_MARGIN);

    const short = computeOverlayBounds({ x: 0, y: 0, width: 1920, height: 200 });
    expect(short.x).toBe(1920 - OVERLAY_WIDTH - OVERLAY_MARGIN);
    expect(short.y).toBe(0); // clamped
  });

  it("handles negative-origin work areas (monitor left of primary)", () => {
    const b = computeOverlayBounds({ x: -1920, y: 0, width: 1920, height: 1040 });
    expect(b.x).toBe(-1920 + 1920 - OVERLAY_WIDTH - OVERLAY_MARGIN);
    expect(b.y).toBe(1040 - OVERLAY_HEIGHT - OVERLAY_MARGIN);
  });
});
