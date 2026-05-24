import { describe, it, expect, beforeEach } from "vitest";
import { useGlobalStore } from "../src/renderer/stores/useGlobalStore";

describe("useGlobalStore", () => {
  beforeEach(() => {
    useGlobalStore.setState({ density: "comfortable", colorMode: "liquid", watcherActive: false, gamesCount: 0 });
  });

  it("defaults density to comfortable", () => {
    expect(useGlobalStore.getState().density).toBe("comfortable");
  });

  it("setDensity updates the slice", () => {
    useGlobalStore.getState().setDensity("compact");
    expect(useGlobalStore.getState().density).toBe("compact");
  });

  it("tracks shell status for the current replay library", () => {
    useGlobalStore.getState().setWatcherActive(true);
    useGlobalStore.getState().setGamesCount(42);
    const state = useGlobalStore.getState();
    expect(state.watcherActive).toBe(true);
    expect(state.gamesCount).toBe(42);
  });
});
