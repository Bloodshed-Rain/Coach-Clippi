import { create } from "zustand";
import { ColorMode } from "../themes";

export type Density = "comfortable" | "compact";

export interface CornermanHistoryCard extends CornermanCard {
  id: string;
}

interface GlobalState {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  density: Density;
  setDensity: (density: Density) => void;
  watcherActive: boolean;
  setWatcherActive: (active: boolean) => void;
  gamesCount: number;
  setGamesCount: (count: number) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  cornermanHistory: CornermanHistoryCard[];
  addCornermanCard: (card: CornermanCard) => void;
  clearCornermanHistory: () => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  colorMode: "liquid",
  setColorMode: (mode) => set({ colorMode: mode }),
  density: "comfortable",
  setDensity: (density) => set({ density }),
  watcherActive: false,
  setWatcherActive: (active) => set({ watcherActive: active }),
  gamesCount: 0,
  setGamesCount: (count) => set({ gamesCount: count }),
  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  cornermanHistory: [],
  addCornermanCard: (card) =>
    set((state) => ({
      cornermanHistory: [{ ...card, id: crypto.randomUUID() }, ...state.cornermanHistory],
    })),
  clearCornermanHistory: () => set({ cornermanHistory: [] }),
}));
