import { describe, it, expect } from "vitest";
import { buildSparklinePoints } from "../src/renderer/components/ui/Sparkline";

describe("buildSparklinePoints", () => {
  it("maps a flat series to a horizontal line at mid-height", () => {
    const pts = buildSparklinePoints([5, 5, 5], 100, 40);
    expect(pts).toBe("0,40 50,40 100,40");
  });

  it("maps increasing series to a bottom-left → top-right diagonal", () => {
    const pts = buildSparklinePoints([0, 1, 2], 100, 40);
    expect(pts).toBe("0,40 50,20 100,0");
  });

  it("returns empty string for empty input", () => {
    expect(buildSparklinePoints([], 100, 40)).toBe("");
  });

  it("draws a single-value series as a flat line across the width", () => {
    expect(buildSparklinePoints([7], 100, 40)).toBe("0,40 100,40");
  });

  it("anchors to a fixed domain so a small wiggle stays near mid-height", () => {
    // Without a domain, [49,50,51] auto-scales to a full-height swing...
    expect(buildSparklinePoints([49, 50, 51], 100, 40)).toBe("0,40 50,20 100,0");
    // ...with a [0,100] domain it barely moves around the middle.
    const pts = buildSparklinePoints([49, 50, 51], 100, 40, [0, 100])
      .split(" ")
      .map((p) => Number(p.split(",")[1]));
    for (const y of pts) {
      expect(Math.abs(y - 20)).toBeLessThan(1); // all within 1px of mid (20)
    }
  });

  it("clamps values outside the domain to the plot box", () => {
    // 150 on a [0,100] domain clamps to the top (y=0), not above it.
    expect(buildSparklinePoints([150], 100, 40, [0, 100])).toBe("0,0 100,0");
    // -20 clamps to the bottom (y=h).
    expect(buildSparklinePoints([-20], 100, 40, [0, 100])).toBe("0,40 100,40");
  });
});
