import { create } from "zustand";

interface ReplayPlayerState {
  open: boolean;
  replayPath: string | null;
  playerCharacter: string | null;
  opponentCharacter: string | null;
  /** Last requested seek frame; bumped via `seekToken` so identical frames
   *  still trigger a re-seek. */
  startFrame: number | null;
  seekToken: number;
  /** Total frames of the open replay. Null when unknown — scrubber hides. */
  totalFrames: number | null;
  /** "seeking" while an in-flight seek IPC is pending; drives the overlay. */
  seekState: "idle" | "seeking";
  openPlayer: (
    replayPath: string,
    startFrame?: number,
    playerCharacter?: string,
    opponentCharacter?: string,
    totalFrames?: number,
  ) => void;
  closePlayer: () => void;
  /** Request a seek within the open session. Bumps seekToken; sets seekState. */
  seekToFrame: (frame: number) => void;
  setSeekState: (state: "idle" | "seeking") => void;
}

export const useReplayPlayerStore = create<ReplayPlayerState>((set, get) => ({
  open: false,
  replayPath: null,
  playerCharacter: null,
  opponentCharacter: null,
  startFrame: null,
  seekToken: 0,
  totalFrames: null,
  seekState: "idle",
  openPlayer: (replayPath, startFrame, playerCharacter, opponentCharacter, totalFrames) => {
    const cur = get();
    if (cur.open && cur.replayPath === replayPath) {
      // Same replay already open — just seek (and refresh totalFrames if provided).
      set({
        startFrame: startFrame ?? null,
        seekToken: cur.seekToken + 1,
        seekState: "seeking",
        ...(totalFrames != null ? { totalFrames } : {}),
      });
      return;
    }
    set({
      open: true,
      replayPath,
      playerCharacter: playerCharacter ?? null,
      opponentCharacter: opponentCharacter ?? null,
      startFrame: startFrame ?? null,
      seekToken: cur.seekToken + 1,
      totalFrames: totalFrames ?? null,
      seekState: "idle",
    });
  },
  closePlayer: () =>
    set({
      open: false,
      replayPath: null,
      playerCharacter: null,
      opponentCharacter: null,
      startFrame: null,
      totalFrames: null,
      seekState: "idle",
    }),
  seekToFrame: (frame) => {
    const cur = get();
    set({
      startFrame: frame,
      seekToken: cur.seekToken + 1,
      seekState: "seeking",
    });
  },
  setSeekState: (state) => set({ seekState: state }),
}));
