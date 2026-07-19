import { describe, expect, it } from "vitest";
import type { FramesType } from "@slippi/slippi-js/node";

import { collectPeachTurnipPullStats } from "../src/peachItems";

describe("collectPeachTurnipPullStats", () => {
  it("counts only items first observed as Peach-owned pulls", () => {
    const frames = {
      100: {
        frame: 100,
        start: undefined,
        players: {},
        followers: {},
        items: [{ frame: 100, typeId: 6, owner: -1, spawnId: 1 }],
        stageEvents: undefined,
      },
      101: {
        frame: 101,
        start: undefined,
        players: {},
        followers: {},
        items: [{ frame: 101, typeId: 6, owner: 0, spawnId: 1 }],
        stageEvents: undefined,
      },
      120: {
        frame: 120,
        start: undefined,
        players: {},
        followers: {},
        items: [{ frame: 120, typeId: 99, turnipFace: 7, owner: 0, spawnId: 2 }],
        stageEvents: undefined,
      },
      121: {
        frame: 121,
        start: undefined,
        players: {},
        followers: {},
        items: [{ frame: 121, typeId: 99, turnipFace: 7, owner: 0, spawnId: 2 }],
        stageEvents: undefined,
      },
      140: {
        frame: 140,
        start: undefined,
        players: {},
        followers: {},
        items: [{ frame: 140, typeId: 7, owner: 0, spawnId: 3 }],
        stageEvents: undefined,
      },
    } as FramesType;

    const stats = collectPeachTurnipPullStats({
      frames,
      playerIndex: 0,
      myConversions: [],
      lastFrame: 160,
    });

    expect(stats).not.toBeNull();
    expect(stats?.totalPulls).toBe(2);
    expect(stats?.faces).toEqual([{ face: "stitch face", count: 1 }]);
    expect(stats?.rareItems).toEqual([{ item: "Mr. Saturn", count: 1 }]);
  });
});
