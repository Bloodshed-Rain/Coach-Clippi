import { describe, expect, it } from "vitest";
import { buildReplayCommData } from "../src/replayComm";

describe("buildReplayCommData", () => {
  it("builds a queue command with a bounded review range", () => {
    expect(
      buildReplayCommData({
        replayPath: "C:\\replays\\game.slp",
        startFrame: 241.9,
        endFrame: 480.8,
        commandId: "review-1",
      }),
    ).toEqual({
      mode: "queue",
      queue: [{ path: "C:\\replays\\game.slp", startFrame: 241, endFrame: 480 }],
      isRealTimeMode: false,
      commandId: "review-1",
    });
  });

  it("clamps invalid ranges without mutating the replay path", () => {
    expect(
      buildReplayCommData({
        replayPath: "game.slp",
        startFrame: -123,
        endFrame: -1,
        commandId: "review-2",
      }),
    ).toEqual({
      mode: "queue",
      queue: [{ path: "game.slp", startFrame: 0, endFrame: 0 }],
      isRealTimeMode: false,
      commandId: "review-2",
    });
  });
});
