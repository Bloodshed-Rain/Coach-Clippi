import { describe, expect, it } from "vitest";
import {
  clampCornermanOverlayTransparency,
  DEFAULT_CORNERMAN_OVERLAY_TRANSPARENCY,
  getCornermanOverlayAlphas,
} from "../src/cornermanOverlayTransparency";

describe("cornerman overlay transparency", () => {
  it("clamps values to the supported slider range", () => {
    expect(clampCornermanOverlayTransparency(-10)).toBe(15);
    expect(clampCornermanOverlayTransparency(90)).toBe(85);
    expect(clampCornermanOverlayTransparency(42.4)).toBe(42);
    expect(clampCornermanOverlayTransparency(null)).toBe(DEFAULT_CORNERMAN_OVERLAY_TRANSPARENCY);
  });

  it("converts transparency into usable alpha values", () => {
    expect(getCornermanOverlayAlphas(58)).toEqual({
      toast: "0.42",
      header: "0.14",
      card: "0.48",
    });
  });
});
