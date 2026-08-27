import { describe, it, expect, beforeEach } from "vitest";
import { useReplayPlayerStore } from "../src/renderer/stores/useReplayPlayerStore";

describe("useReplayPlayerStore", () => {
  beforeEach(() => {
    useReplayPlayerStore.setState({
      open: false,
      replayPath: null,
      playerCharacter: null,
      opponentCharacter: null,
      startFrame: null,
      seekRevision: 0,
    });
  });

  it("openPlayer opens a replay", () => {
    useReplayPlayerStore.getState().openPlayer("/r.slp", 100, "Marth", "Falco");
    const s = useReplayPlayerStore.getState();
    expect(s.open).toBe(true);
    expect(s.replayPath).toBe("/r.slp");
    expect(s.startFrame).toBe(100);
    expect(s.playerCharacter).toBe("Marth");
    expect(s.opponentCharacter).toBe("Falco");
  });

  it("closePlayer closes the replay", () => {
    useReplayPlayerStore.getState().openPlayer("/r.slp", 0);
    useReplayPlayerStore.getState().closePlayer();
    const s = useReplayPlayerStore.getState();
    expect(s.open).toBe(false);
    expect(s.replayPath).toBeNull();
  });

  it("openPlayer seeks when the same replay is already open", () => {
    useReplayPlayerStore.getState().openPlayer("/r.slp", 0);
    const firstRevision = useReplayPlayerStore.getState().seekRevision;
    useReplayPlayerStore.getState().openPlayer("/r.slp", 500);
    const s = useReplayPlayerStore.getState();
    expect(s.startFrame).toBe(500);
    expect(s.seekRevision).toBe(firstRevision + 1);
  });
});
