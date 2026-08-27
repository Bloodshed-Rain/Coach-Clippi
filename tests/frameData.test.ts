import { describe, it, expect } from "vitest";
import { JUMPSQUAT_FRAMES, getJumpsquatFrames, getStandingGrabActiveFrame, getAerialFrameData } from "../src/pipeline";
import { CHARACTER_DATA } from "../src/pipeline/characterData";
import { STAGE_LEDGE_X } from "../src/pipeline/helpers";

describe("frameData: jumpsquat table", () => {
  it("covers every character in CHARACTER_DATA", () => {
    for (const name of Object.keys(CHARACTER_DATA)) {
      expect(JUMPSQUAT_FRAMES[name], `missing jumpsquat for ${name}`).toBeDefined();
    }
  });

  it("values are within Melee's real 3-8 frame range", () => {
    for (const [name, frames] of Object.entries(JUMPSQUAT_FRAMES)) {
      expect(frames, name).toBeGreaterThanOrEqual(3);
      expect(frames, name).toBeLessThanOrEqual(8);
    }
  });

  it("well-known anchors are correct", () => {
    expect(getJumpsquatFrames("Fox")).toBe(3);
    expect(getJumpsquatFrames("Falco")).toBe(5);
    expect(getJumpsquatFrames("Bowser")).toBe(8);
    expect(getJumpsquatFrames("UNKNOWN")).toBe(4); // fallback
  });
});

describe("frameData: grab startup", () => {
  it("defaults to frame 7 with tether/tongue exceptions slower", () => {
    expect(getStandingGrabActiveFrame("Fox")).toBe(7);
    expect(getStandingGrabActiveFrame("Marth")).toBe(7);
    expect(getStandingGrabActiveFrame("Yoshi")).toBeGreaterThan(7);
    expect(getStandingGrabActiveFrame("Samus")).toBeGreaterThan(7);
  });
});

describe("frameData: slippi-js accessors", () => {
  it("getAerialFrameData returns real landing lag + autocancel data (Fox internal id 1)", () => {
    const nair = getAerialFrameData(1, "nair");
    expect(nair).toBeDefined();
    expect(nair!.landingLag).toBe(15);
    expect(nair!.lcancelledLandingLag).toBe(7);
    expect(nair!.autoCancelBefore).toBeGreaterThan(0);
    expect(nair!.autoCancelAfter).toBeGreaterThan(nair!.autoCancelBefore);
  });
});

describe("stage ledge coordinates", () => {
  it("covers all six legal stages with exact ledge X values", () => {
    expect(STAGE_LEDGE_X[31]).toBeCloseTo(68.4); // Battlefield
    expect(STAGE_LEDGE_X[32]).toBeCloseTo(85.57); // FD
    expect(STAGE_LEDGE_X[8]).toBeCloseTo(56.0); // Yoshi's
    expect(STAGE_LEDGE_X[28]).toBeCloseTo(77.27); // Dreamland
    expect(STAGE_LEDGE_X[2]).toBeCloseTo(63.35); // FoD
    expect(STAGE_LEDGE_X[3]).toBeCloseTo(87.75); // Stadium
  });
});
