import { describe, expect, it } from "vitest";
import {
  buildReplaySearchTerms,
  buildReplaySignatureSearchKeys,
  normalizeReplaySearchQuery,
} from "../src/replaySearch";

describe("replay search normalization", () => {
  it("normalizes punctuation and casing", () => {
    expect(normalizeReplaySearchQuery("  Zero-to-Death!! ")).toBe("zero to death");
  });

  it("recognizes common event aliases and plurals", () => {
    expect(buildReplaySearchTerms("ZTD")).toContain("zero to death");
    expect(buildReplaySearchTerms("Ken combos")).toContain("ken combo");
    expect(buildReplaySearchTerms("waveshines")).toContain("waveshine");
  });

  it("matches compact and spaced move names", () => {
    expect(buildReplaySearchTerms("waveshine up smash")).toContain("waveshine upsmash");
    expect(buildReplaySearchTerms("rest kills")).toContain("rest kill");
  });

  it("maps technique searches to positive per-game signature counters", () => {
    expect(buildReplaySignatureSearchKeys("Ken combos")).toEqual(["kenCombos"]);
    expect(buildReplaySignatureSearchKeys("waveshines")).toEqual(["multiShineCombos", "waveshineToUpsmash"]);
    expect(buildReplaySignatureSearchKeys("ZAIN")).toEqual([]);
  });
});
