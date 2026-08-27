import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CornermanLiveEvent } from "../src/cornermanLiveEvents";
import { CornermanSpeechCoach, type CornermanSpeechAdapter } from "../src/renderer/utils/cornermanSpeech";
import { DEFAULT_CORNERMAN_VOICE_SETTINGS } from "../src/cornermanVoiceSettings";

function event(id: string, importance: "info" | "high"): CornermanLiveEvent {
  return {
    id,
    type: "huge-conversion",
    title: "Huge Conversion",
    body: "Opponent hit You for 70%.",
    timestamp: "1:00",
    frame: 3600,
    actorTag: "OPP",
    actorCharacter: "Fox",
    actorIsTarget: false,
    victimTag: "YOU",
    victimCharacter: "Marth",
    victimIsTarget: true,
    importance,
  };
}

describe("CornermanSpeechCoach", () => {
  let spoken: Array<{ text: string; done: () => void }>;
  let cancel: ReturnType<typeof vi.fn<() => void>>;
  let adapter: CornermanSpeechAdapter;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    spoken = [];
    cancel = vi.fn();
    adapter = {
      cancel,
      speak: (text, _options, done) => spoken.push({ text, done }),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing until voice coaching is enabled", () => {
    const coach = new CornermanSpeechCoach(adapter);
    coach.enqueueLiveEvent(event("one", "high"));
    expect(spoken).toHaveLength(0);
  });

  it("rate-limits callouts and lets high-impact tips replace queued info", () => {
    const coach = new CornermanSpeechCoach(adapter);
    coach.configure({ ...DEFAULT_CORNERMAN_VOICE_SETTINGS, enabled: true, liveAlerts: "all" });

    coach.enqueueLiveEvent(event("one", "info"));
    coach.enqueueLiveEvent(event("two", "info"));
    coach.enqueueLiveEvent(event("three", "high"));
    expect(spoken).toHaveLength(1);

    spoken[0]!.done();
    vi.advanceTimersByTime(9_999);
    expect(spoken).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(spoken).toHaveLength(2);
    expect(spoken[1]!.text).toContain("deny the starter");
  });

  it("suppresses duplicate event ids", () => {
    const coach = new CornermanSpeechCoach(adapter);
    coach.configure({ ...DEFAULT_CORNERMAN_VOICE_SETTINGS, enabled: true, liveAlerts: "all" });
    coach.enqueueLiveEvent(event("same", "high"));
    spoken[0]!.done();
    coach.enqueueLiveEvent(event("same", "high"));
    vi.advanceTimersByTime(10_000);
    expect(spoken).toHaveLength(1);
  });

  it("interrupts a stale live callout for the between-game adjustment", () => {
    const coach = new CornermanSpeechCoach(adapter);
    coach.configure({ ...DEFAULT_CORNERMAN_VOICE_SETTINGS, enabled: true, liveAlerts: "all" });
    coach.enqueueLiveEvent(event("one", "high"));

    coach.speakBetweenGameAdjustment("## The Adjustment\nHold center and punish the roll.");

    expect(cancel).toHaveBeenCalledOnce();
    expect(spoken).toHaveLength(2);
    expect(spoken[1]!.text).toBe("Next game. Hold center and punish the roll.");
  });
});
