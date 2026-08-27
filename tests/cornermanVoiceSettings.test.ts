import { describe, expect, it } from "vitest";
import {
  DEFAULT_CORNERMAN_VOICE_SETTINGS,
  normalizeCornermanVoiceBackend,
  normalizeCornermanVoiceCooldownSeconds,
  normalizeCornermanVoiceLiveAlerts,
  normalizeCornermanVoiceRate,
  normalizeCornermanVoiceVolume,
  resolveCornermanVoiceSettings,
} from "../src/cornermanVoiceSettings";

describe("cornerman voice settings", () => {
  it("is opt-in and uses restrained defaults", () => {
    expect(resolveCornermanVoiceSettings({})).toEqual(DEFAULT_CORNERMAN_VOICE_SETTINGS);
    expect(DEFAULT_CORNERMAN_VOICE_SETTINGS.enabled).toBe(false);
    expect(DEFAULT_CORNERMAN_VOICE_SETTINGS.backend).toBe("system");
    expect(DEFAULT_CORNERMAN_VOICE_SETTINGS.liveAlerts).toBe("high");
  });

  it("normalizes alert modes and numeric controls", () => {
    expect(normalizeCornermanVoiceLiveAlerts("all")).toBe("all");
    expect(normalizeCornermanVoiceLiveAlerts("noisy")).toBe("high");
    expect(normalizeCornermanVoiceBackend("azure")).toBe("azure");
    expect(normalizeCornermanVoiceBackend("browser")).toBe("system");
    expect(normalizeCornermanVoiceRate(99)).toBe(1.5);
    expect(normalizeCornermanVoiceRate(0)).toBe(0.75);
    expect(normalizeCornermanVoiceVolume(2)).toBe(1);
    expect(normalizeCornermanVoiceVolume(-1)).toBe(0);
    expect(normalizeCornermanVoiceCooldownSeconds(1)).toBe(5);
    expect(normalizeCornermanVoiceCooldownSeconds(99)).toBe(30);
  });

  it("resolves a saved voice configuration", () => {
    expect(
      resolveCornermanVoiceSettings({
        cornermanVoiceEnabled: true,
        cornermanVoiceBackend: "azure",
        cornermanVoiceBetweenGameAdjustments: false,
        cornermanVoiceLiveAlerts: "all",
        cornermanVoiceURI: "Microsoft Aria",
        cornermanVoiceModel: "magi-tts",
        cornermanProviderVoice: "cedar",
        cornermanVoiceInstructions: "Speak with calm urgency.",
        cornermanVoiceRate: 1.2,
        cornermanVoiceVolume: 0.65,
        cornermanVoiceCooldownSeconds: 14,
      }),
    ).toEqual({
      enabled: true,
      backend: "azure",
      betweenGameAdjustments: false,
      liveAlerts: "all",
      voiceURI: "Microsoft Aria",
      model: "magi-tts",
      providerVoice: "cedar",
      instructions: "Speak with calm urgency.",
      rate: 1.2,
      volume: 0.65,
      cooldownSeconds: 14,
    });
  });
});
