export type CornermanVoiceBackend = "system" | "openai" | "azure";
export type CloudVoiceProvider = Exclude<CornermanVoiceBackend, "system">;

export const DEFAULT_PROVIDER_VOICE_MODEL = "gpt-4o-mini-tts";
export const DEFAULT_PROVIDER_VOICE = "marin";
export const DEFAULT_PROVIDER_VOICE_INSTRUCTIONS =
  "Speak like a concise esports coach: urgent but controlled, clear, and confident.";

export const PROVIDER_VOICE_OPTIONS = [
  "marin",
  "cedar",
  "coral",
  "alloy",
  "ash",
  "ballad",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
] as const;

export interface ProviderSpeechRequest {
  requestId: string;
  purpose: "live" | "preview";
  provider: CloudVoiceProvider;
  model: string;
  voice: string;
  text: string;
  instructions: string | null;
  speed: number;
}

export type ProviderSpeechEvent =
  | { requestId: string; type: "chunk"; chunk: Uint8Array }
  | { requestId: string; type: "done" }
  | { requestId: string; type: "cancelled" }
  | { requestId: string; type: "error"; message: string };
