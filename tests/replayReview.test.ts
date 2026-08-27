import { describe, expect, it } from "vitest";
import { buildReplayReviewClip, clampReplayFrame, formatReplayFrame } from "../src/replayReview";

describe("replay review helpers", () => {
  it("builds a two-second pre-roll and four-second follow-through", () => {
    expect(buildReplayReviewClip(600, 1_200)).toEqual({ startFrame: 480, endFrame: 840 });
  });

  it("clips review ranges to the replay boundaries", () => {
    expect(buildReplayReviewClip(60, 700)).toEqual({ startFrame: 0, endFrame: 300 });
    expect(buildReplayReviewClip(650, 700)).toEqual({ startFrame: 530, endFrame: 700 });
  });

  it("normalizes frames and formats approximate playback time", () => {
    expect(clampReplayFrame(Number.NaN, 600)).toBe(0);
    expect(clampReplayFrame(900, 600)).toBe(600);
    expect(formatReplayFrame(3_723)).toBe("1:02");
  });
});
