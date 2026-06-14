import { describe, it, expect } from "vitest";
import {
  computeOverlayBounds,
  OVERLAY_HEIGHT,
  OVERLAY_MARGIN,
  OVERLAY_WIDTH,
  OVERLAY_RIGHT_MARGIN,
  normalizeOverlaySize,
  resizeOverlayBounds,
  snapOverlayBoundsToCorner,
} from "../src/overlayLayout";

describe("computeOverlayBounds", () => {
  it("anchors to the bottom-right of the work area with a margin", () => {
    const workArea = { x: 0, y: 0, width: 1920, height: 1040 };
    const b = computeOverlayBounds(workArea);
    expect(b.width).toBe(OVERLAY_WIDTH);
    expect(b.height).toBe(OVERLAY_HEIGHT);
    expect(b.x).toBe(1920 - OVERLAY_WIDTH - OVERLAY_RIGHT_MARGIN);
    expect(b.y).toBe(1040 - OVERLAY_HEIGHT - OVERLAY_MARGIN);
  });

  it("respects a work area that does not start at the origin (secondary monitor / taskbar offsets)", () => {
    const workArea = { x: 1920, y: 40, width: 1280, height: 980 };
    const b = computeOverlayBounds(workArea);
    expect(b.x).toBe(1920 + 1280 - OVERLAY_WIDTH - OVERLAY_RIGHT_MARGIN);
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
    expect(short.x).toBe(1920 - OVERLAY_WIDTH - OVERLAY_RIGHT_MARGIN);
    expect(short.y).toBe(0); // clamped
  });

  it("handles negative-origin work areas (monitor left of primary)", () => {
    const b = computeOverlayBounds({ x: -1920, y: 0, width: 1920, height: 1040 });
    expect(b.x).toBe(-1920 + 1920 - OVERLAY_WIDTH - OVERLAY_RIGHT_MARGIN);
    expect(b.y).toBe(1040 - OVERLAY_HEIGHT - OVERLAY_MARGIN);
  });

  it("uses saved corner and size when provided", () => {
    const b = computeOverlayBounds(
      { x: 0, y: 0, width: 1920, height: 1040 },
      { corner: "top-left", size: { width: 520, height: 360 } },
    );
    expect(b).toEqual({ x: OVERLAY_MARGIN, y: OVERLAY_MARGIN, width: 520, height: 360 });
  });

  it("normalizes tiny saved sizes to the minimum usable size", () => {
    expect(normalizeOverlaySize({ width: 100, height: 120 })).toEqual({ width: 320, height: 260 });
  });

  it("snaps moved bounds to the nearest corner", () => {
    const snapped = snapOverlayBoundsToCorner(
      { x: 1400, y: 40, width: 420, height: 300 },
      { x: 0, y: 0, width: 1920, height: 1040 },
    );
    expect(snapped.corner).toBe("top-right");
    expect(snapped.bounds).toEqual({
      x: 1920 - 420 - OVERLAY_RIGHT_MARGIN,
      y: OVERLAY_MARGIN,
      width: 420,
      height: 300,
    });
  });

  it("resizes from left/top handles while preserving the opposite edge", () => {
    const resized = resizeOverlayBounds({ x: 100, y: 80, width: 400, height: 480 }, "top-left", 40, 30);
    expect(resized).toEqual({ x: 140, y: 110, width: 360, height: 450 });
  });

  it("clamps custom resize to minimum size", () => {
    const resized = resizeOverlayBounds({ x: 100, y: 80, width: 400, height: 480 }, "bottom-left", 300, -300);
    expect(resized).toEqual({ x: 180, y: 80, width: 320, height: 260 });
  });
});
