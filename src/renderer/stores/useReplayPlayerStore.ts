import { create } from "zustand";

interface ReplayPlayerState {
  open: boolean;
  replayPath: string | null;
  playerCharacter: string | null;
  opponentCharacter: string | null;
  startFrame: number | null;
  seekRevision: number;
  openPlayer: (replayPath: string, startFrame?: number, playerCharacter?: string, opponentCharacter?: string) => void;
  closePlayer: () => void;
}

export const useReplayPlayerStore = create<ReplayPlayerState>((set, get) => ({
  open: false,
  replayPath: null,
  playerCharacter: null,
  opponentCharacter: null,
  startFrame: null,
  seekRevision: 0,
  openPlayer: (replayPath, startFrame, playerCharacter, opponentCharacter) => {
    const cur = get();
    if (cur.open && cur.replayPath === replayPath) {
      set({
        startFrame: startFrame ?? 0,
        playerCharacter: playerCharacter ?? cur.playerCharacter,
        opponentCharacter: opponentCharacter ?? cur.opponentCharacter,
        seekRevision: cur.seekRevision + 1,
      });
      return;
    }
    set({
      open: true,
      replayPath,
      playerCharacter: playerCharacter ?? null,
      opponentCharacter: opponentCharacter ?? null,
      startFrame: startFrame ?? null,
      seekRevision: cur.seekRevision + 1,
    });
  },
  closePlayer: () =>
    set({
      open: false,
      replayPath: null,
      playerCharacter: null,
      opponentCharacter: null,
      startFrame: null,
    }),
}));
