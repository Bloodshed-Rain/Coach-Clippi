import type { Config } from "./config";
import { PROVIDER_BY_ID } from "./llmProviders";
import type { CloudVoiceProvider, ProviderSpeechRequest } from "./providerVoice";

const MAX_SPEECH_TEXT_LENGTH = 4096;

function getProviderKey(provider: CloudVoiceProvider, config: Config): string | null {
  const configured = config.apiKeys[provider];
  if (configured) return configured;
  const envVar = PROVIDER_BY_ID[provider].envVar;
  return envVar ? (process.env[envVar] ?? null) : null;
}

function resolveAzureSpeechUrl(config: Config): string {
  const endpoint = config.azureEndpoint?.trim() || process.env.AZURE_OPENAI_ENDPOINT?.trim();
  if (!endpoint) {
    throw new Error(
      "Azure OpenAI endpoint is not set. Add it in Settings or set the AZURE_OPENAI_ENDPOINT environment variable.",
    );
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Azure OpenAI endpoint must be a valid HTTPS URL.");
  }
  if (url.protocol !== "https:") throw new Error("Azure OpenAI endpoint must use HTTPS.");

  const path = url.pathname.replace(/\/+$/, "");
  if (!path) {
    url.pathname = "/openai/v1/audio/speech";
  } else if (/\/openai$/i.test(path)) {
    url.pathname = `${path}/v1/audio/speech`;
  } else if (/\/openai\/v1$/i.test(path)) {
    url.pathname = `${path}/audio/speech`;
  } else {
    url.pathname = `${path}/openai/v1/audio/speech`;
  }
  url.search = "";
  url.hash = "";
  return url.toString();
}

function validateSpeechRequest(request: ProviderSpeechRequest): void {
  if (request.provider !== "openai" && request.provider !== "azure") {
    throw new Error("Voice provider must be OpenAI or Azure OpenAI.");
  }
  if (!request.model.trim()) throw new Error("Voice model or deployment name is required.");
  if (!request.voice.trim()) throw new Error("Provider voice is required.");
  if (!request.text.trim()) throw new Error("Speech text is required.");
  if (request.text.length > MAX_SPEECH_TEXT_LENGTH) {
    throw new Error(`Speech text must be ${MAX_SPEECH_TEXT_LENGTH} characters or fewer.`);
  }
  if (!Number.isFinite(request.speed) || request.speed < 0.25 || request.speed > 4) {
    throw new Error("Speech speed must be between 0.25 and 4.");
  }
}

export async function streamProviderSpeech(
  config: Config,
  request: ProviderSpeechRequest,
  onChunk: (chunk: Uint8Array) => void,
  signal?: AbortSignal,
): Promise<void> {
  validateSpeechRequest(request);
  const apiKey = getProviderKey(request.provider, config);
  if (!apiKey) {
    throw new Error(
      `${PROVIDER_BY_ID[request.provider].label} API key is not set. Add it in Settings or set the ${PROVIDER_BY_ID[request.provider].envVar} environment variable.`,
    );
  }

  const url = request.provider === "azure" ? resolveAzureSpeechUrl(config) : "https://api.openai.com/v1/audio/speech";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(request.provider === "azure" ? { "api-key": apiKey } : { Authorization: `Bearer ${apiKey}` }),
  };
  const requestInit: RequestInit = {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: request.model.trim(),
      voice: request.voice.trim(),
      input: request.text.trim(),
      ...(request.instructions?.trim() ? { instructions: request.instructions.trim() } : {}),
      response_format: "pcm",
      stream_format: "audio",
      speed: request.speed,
    }),
  };
  if (signal) requestInit.signal = signal;
  const response = await fetch(url, requestInit);

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1000);
    throw new Error(`${PROVIDER_BY_ID[request.provider].label} speech API error (${response.status}): ${detail}`);
  }
  if (!response.body) throw new Error(`${PROVIDER_BY_ID[request.provider].label} speech response has no audio body.`);

  const reader = response.body.getReader();
  let receivedBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.byteLength) continue;
    const chunk = new Uint8Array(value);
    receivedBytes += chunk.byteLength;
    onChunk(chunk);
  }
  if (receivedBytes === 0) throw new Error(`${PROVIDER_BY_ID[request.provider].label} returned empty speech audio.`);
}
