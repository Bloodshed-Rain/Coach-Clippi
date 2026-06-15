import { describe, expect, it } from "vitest";
import { expandCornermanShorthand } from "../src/cornermanText";

describe("expandCornermanShorthand", () => {
  it("expands common stat and defensive shorthand", () => {
    expect(expandCornermanShorthand("Neutral WR fell 12pp; stop jumping OOS and clean up DI.")).toBe(
      "Neutral win rate fell 12 percentage points; stop jumping out of shield and clean up directional influence.",
    );
  });

  it("expands compact damage and move names", () => {
    expect(expandCornermanShorthand("avg dmg/op was low; punish bair with up-B, then f-smash.")).toBe(
      "average damage per opening was low; punish back air with up special, then forward smash.",
    );
  });
});
