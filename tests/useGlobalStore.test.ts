import { describe, it, expect, beforeEach } from "vitest";
import { useGlobalStore } from "../src/renderer/stores/useGlobalStore";

describe("useGlobalStore", () => {
  beforeEach(() => {
    useGlobalStore.setState({
      density: "comfortable",
      colorMode: "liquid",
      watcherActive: false,
      gamesCount: 0,
      cornermanHistory: [],
    });
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

  describe("cornermanHistory", () => {
    interface TestCard {
      text: string;
      gameNumber: number;
      opponentTag: string;
      wins: number;
      losses: number;
    }
    const makeCard = (gameNumber: number): TestCard => ({
      text: `Card text for game ${gameNumber}`,
      gameNumber,
      opponentTag: "OPP#123",
      wins: gameNumber,
      losses: 0,
    });

    it("starts empty", () => {
      expect(useGlobalStore.getState().cornermanHistory).toHaveLength(0);
    });

    it("addCornermanCard prepends cards newest-first with unique ids", () => {
      const { addCornermanCard } = useGlobalStore.getState();
      addCornermanCard(makeCard(1));
      addCornermanCard(makeCard(2));

      const history = useGlobalStore.getState().cornermanHistory;
      expect(history).toHaveLength(2);
      // newest (game 2) is first
      expect(history[0].gameNumber).toBe(2);
      expect(history[1].gameNumber).toBe(1);
      // ids must be unique strings
      expect(history[0].id).toBeTruthy();
      expect(history[1].id).toBeTruthy();
      expect(history[0].id).not.toBe(history[1].id);
    });

    it("clearCornermanHistory empties the list", () => {
      const { addCornermanCard, clearCornermanHistory } = useGlobalStore.getState();
      addCornermanCard(makeCard(1));
      addCornermanCard(makeCard(2));
      expect(useGlobalStore.getState().cornermanHistory).toHaveLength(2);

      clearCornermanHistory();
      expect(useGlobalStore.getState().cornermanHistory).toHaveLength(0);
    });
  });
});
