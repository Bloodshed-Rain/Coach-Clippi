import { describe, it, expect, beforeEach } from "vitest";
import { useReplayPlayerStore } from "../src/renderer/stores/useReplayPlayerStore";

describe("useReplayPlayerStore — totalFrames + seek", () => {
  beforeEach(() => {
    useReplayPlayerStore.setState({
      open: false,
      replayPath: null,
      playerCharacter: null,
      opponentCharacter: null,
      startFrame: null,
      seekToken: 0,
      totalFrames: null,
      seekState: "idle",
    });
  });

  it("openPlayer accepts and stores totalFrames", () => {
    useReplayPlayerStore.getState().openPlayer("/r.slp", 0, "Marth", "Falco", 23400);
    expect(useReplayPlayerStore.getState().totalFrames).toBe(23400);
  });

  it("openPlayer leaves totalFrames null when not provided", () => {
    useReplayPlayerStore.getState().openPlayer("/r.slp", 0, "Marth", "Falco");
    expect(useReplayPlayerStore.getState().totalFrames).toBeNull();
  });

  it("seekToFrame bumps seekToken and sets startFrame and seekState", () => {
    useReplayPlayerStore.getState().openPlayer("/r.slp", 0, "Marth", "Falco", 1000);
    const tokenBefore = useReplayPlayerStore.getState().seekToken;
    useReplayPlayerStore.getState().seekToFrame(500);
    const after = useReplayPlayerStore.getState();
    expect(after.startFrame).toBe(500);
    expect(after.seekToken).toBe(tokenBefore + 1);
    expect(after.seekState).toBe("seeking");
  });

  it("setSeekState transitions back to idle", () => {
    useReplayPlayerStore.setState({ seekState: "seeking" });
    useReplayPlayerStore.getState().setSeekState("idle");
    expect(useReplayPlayerStore.getState().seekState).toBe("idle");
  });

  it("closePlayer resets totalFrames and seekState", () => {
    useReplayPlayerStore.getState().openPlayer("/r.slp", 0, "Marth", "Falco", 23400);
    useReplayPlayerStore.setState({ seekState: "seeking" });
    useReplayPlayerStore.getState().closePlayer();
    const s = useReplayPlayerStore.getState();
    expect(s.totalFrames).toBeNull();
    expect(s.seekState).toBe("idle");
  });

  it("openPlayer on same replay sets seekState to seeking and bumps seekToken", () => {
    useReplayPlayerStore.getState().openPlayer("/r.slp", 0, "Marth", "Falco", 1000);
    const tokenBefore = useReplayPlayerStore.getState().seekToken;
    // First open — seekState should be idle.
    expect(useReplayPlayerStore.getState().seekState).toBe("idle");

    // Re-open same path with a new startFrame — should hit the same-replay branch.
    useReplayPlayerStore.getState().openPlayer("/r.slp", 500);
    const after = useReplayPlayerStore.getState();
    expect(after.startFrame).toBe(500);
    expect(after.seekToken).toBe(tokenBefore + 1);
    expect(after.seekState).toBe("seeking");
    // totalFrames was set on first open and not provided on re-open; should remain.
    expect(after.totalFrames).toBe(1000);
  });
});
