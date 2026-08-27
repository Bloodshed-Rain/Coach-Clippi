import {
  DEFAULT_PROVIDER_VOICE,
  DEFAULT_PROVIDER_VOICE_INSTRUCTIONS,
  DEFAULT_PROVIDER_VOICE_MODEL,
  type CornermanVoiceBackend,
} from "./providerVoice";

export type CornermanVoiceLiveAlertMode = "all" | "high" | "off";

export interface CornermanVoiceSettings {
  enabled: boolean;
  backend: CornermanVoiceBackend;
  betweenGameAdjustments: boolean;
  liveAlerts: CornermanVoiceLiveAlertMode;
  voiceURI: string | null;
  model: string;
  providerVoice: string;
  instructions: string;
  rate: number;
  volume: number;
  cooldownSeconds: number;
}

export const MIN_CORNERMAN_VOICE_RATE = 0.75;
export const MAX_CORNERMAN_VOICE_RATE = 1.5;
export const MIN_CORNERMAN_VOICE_COOLDOWN_SECONDS = 5;
export const MAX_CORNERMAN_VOICE_COOLDOWN_SECONDS = 30;

export const DEFAULT_CORNERMAN_VOICE_SETTINGS: CornermanVoiceSettings = {
  // Voice is opt-in so an upgrade never produces unexpected audio.
  enabled: false,
  backend: "system",
  betweenGameAdjustments: true,
  liveAlerts: "high",
  voiceURI: null,
  model: DEFAULT_PROVIDER_VOICE_MODEL,
  providerVoice: DEFAULT_PROVIDER_VOICE,
  instructions: DEFAULT_PROVIDER_VOICE_INSTRUCTIONS,
  rate: 1.05,
  volume: 0.8,
  cooldownSeconds: 10,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeCornermanVoiceLiveAlerts(value: unknown): CornermanVoiceLiveAlertMode {
  return value === "all" || value === "high" || value === "off" ? value : DEFAULT_CORNERMAN_VOICE_SETTINGS.liveAlerts;
}

export function normalizeCornermanVoiceBackend(value: unknown): CornermanVoiceBackend {
  return value === "system" || value === "openai" || value === "azure"
    ? value
    : DEFAULT_CORNERMAN_VOICE_SETTINGS.backend;
}

function normalizeProviderString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function normalizeCornermanVoiceURI(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeCornermanVoiceRate(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_CORNERMAN_VOICE_SETTINGS.rate;
  return Math.round(clamp(numeric, MIN_CORNERMAN_VOICE_RATE, MAX_CORNERMAN_VOICE_RATE) * 100) / 100;
}

export function normalizeCornermanVoiceVolume(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_CORNERMAN_VOICE_SETTINGS.volume;
  return Math.round(clamp(numeric, 0, 1) * 100) / 100;
}

export function normalizeCornermanVoiceCooldownSeconds(value: unknown): number {
  const numeric =
    typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_CORNERMAN_VOICE_SETTINGS.cooldownSeconds;
  return Math.round(clamp(numeric, MIN_CORNERMAN_VOICE_COOLDOWN_SECONDS, MAX_CORNERMAN_VOICE_COOLDOWN_SECONDS));
}

export function resolveCornermanVoiceSettings(config: {
  cornermanVoiceEnabled?: unknown;
  cornermanVoiceBackend?: unknown;
  cornermanVoiceBetweenGameAdjustments?: unknown;
  cornermanVoiceLiveAlerts?: unknown;
  cornermanVoiceURI?: unknown;
  cornermanVoiceModel?: unknown;
  cornermanProviderVoice?: unknown;
  cornermanVoiceInstructions?: unknown;
  cornermanVoiceRate?: unknown;
  cornermanVoiceVolume?: unknown;
  cornermanVoiceCooldownSeconds?: unknown;
}): CornermanVoiceSettings {
  return {
    enabled: normalizeBoolean(config.cornermanVoiceEnabled, DEFAULT_CORNERMAN_VOICE_SETTINGS.enabled),
    backend: normalizeCornermanVoiceBackend(config.cornermanVoiceBackend),
    betweenGameAdjustments: normalizeBoolean(
      config.cornermanVoiceBetweenGameAdjustments,
      DEFAULT_CORNERMAN_VOICE_SETTINGS.betweenGameAdjustments,
    ),
    liveAlerts: normalizeCornermanVoiceLiveAlerts(config.cornermanVoiceLiveAlerts),
    voiceURI: normalizeCornermanVoiceURI(config.cornermanVoiceURI),
    model: normalizeProviderString(config.cornermanVoiceModel, DEFAULT_CORNERMAN_VOICE_SETTINGS.model),
    providerVoice: normalizeProviderString(
      config.cornermanProviderVoice,
      DEFAULT_CORNERMAN_VOICE_SETTINGS.providerVoice,
    ),
    instructions: normalizeProviderString(
      config.cornermanVoiceInstructions,
      DEFAULT_CORNERMAN_VOICE_SETTINGS.instructions,
    ),
    rate: normalizeCornermanVoiceRate(config.cornermanVoiceRate),
    volume: normalizeCornermanVoiceVolume(config.cornermanVoiceVolume),
    cooldownSeconds: normalizeCornermanVoiceCooldownSeconds(config.cornermanVoiceCooldownSeconds),
  };
}
