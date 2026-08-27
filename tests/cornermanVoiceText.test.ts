import { describe, expect, it } from "vitest";
import type { CornermanLiveEvent, CornermanLiveEventType } from "../src/cornermanLiveEvents";
import { buildCornermanVoiceTip, extractCornermanSpokenAdjustment } from "../src/cornermanVoiceText";

function liveEvent(type: CornermanLiveEventType, overrides: Partial<CornermanLiveEvent> = {}): CornermanLiveEvent {
  return {
    id: `${type}:1`,
    type,
    title: "Huge Conversion",
    body: "Opponent hit You for 70%.",
    timestamp: "1:00",
    frame: 3600,
    actorTag: "OPP",
    actorCharacter: "Fox",
    actorIsTarget: false,
    victimTag: "YOU",
    victimCharacter: "Marth",
    victimIsTarget: true,
    importance: "high",
    ...overrides,
  };
}

describe("cornerman voice text", () => {
  it("turns an opponent conversion into a defensive adjustment", () => {
    expect(buildCornermanVoiceTip(liveEvent("chain-grab", { title: "Chain Grab" }))).toBe(
      "Watch the grab conversion. Mix your tech and directional influence.",
    );
  });

  it("reinforces a successful player conversion without reading the full alert", () => {
    expect(
      buildCornermanVoiceTip(
        liveEvent("early-kill", {
          title: "Early Kill",
          body: "You took OPP's stock from 42%.",
          actorIsTarget: true,
          victimIsTarget: false,
        }),
      ),
    ).toBe("Early Kill. Good finish. Reset to center and keep the same win condition.");
  });

  it("extracts only the final adjustment from a between-game card", () => {
    const card = `## The Read
- They rolled in 4/5 times.

## Where You're Bleeding
- Your OOS choices were late.

## The Adjustment
**Hold center, wait for the roll, then punish with f-smash.**`;

    expect(extractCornermanSpokenAdjustment(card)).toBe(
      "Next game. Hold center, wait for the roll, then punish with forward smash.",
    );
  });

  it("does not read malformed cards", () => {
    expect(extractCornermanSpokenAdjustment("No structured adjustment here.")).toBeNull();
  });
});
