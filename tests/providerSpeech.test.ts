import { afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../src/config";
import { streamProviderSpeech } from "../src/providerSpeech";
import type { ProviderSpeechRequest } from "../src/providerVoice";

function config(overrides: Partial<Config> = {}): Config {
  return {
    apiKeys: {},
    azureEndpoint: null,
    ...overrides,
  } as Config;
}

function request(overrides: Partial<ProviderSpeechRequest> = {}): ProviderSpeechRequest {
  return {
    requestId: "voice-1",
    purpose: "live",
    provider: "openai",
    model: "gpt-4o-mini-tts",
    voice: "marin",
    text: "Hold center and wait for the roll.",
    instructions: "Speak with calm urgency.",
    speed: 1.05,
    ...overrides,
  };
}

function streamedPcmResponse(): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0, 1]));
        controller.enqueue(new Uint8Array([2, 3]));
        controller.close();
      },
    }),
    { status: 200 },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("streamProviderSpeech", () => {
  it("streams OpenAI PCM with bearer authentication", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(streamedPcmResponse());
    const chunks: number[] = [];

    await streamProviderSpeech(config({ apiKeys: { openai: "openai-secret" } }), request(), (chunk) => {
      chunks.push(...chunk);
    });

    expect(chunks).toEqual([0, 1, 2, 3]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/audio/speech");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer openai-secret",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input: "Hold center and wait for the roll.",
      instructions: "Speak with calm urgency.",
      response_format: "pcm",
      stream_format: "audio",
      speed: 1.05,
    });
  });

  it("routes an Azure deployment through the resource v1 speech endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(streamedPcmResponse());

    await streamProviderSpeech(
      config({
        apiKeys: { azure: "azure-secret" },
        azureEndpoint: "https://magi-test.openai.azure.com/",
      }),
      request({ provider: "azure", model: "magi-tts", voice: "cedar" }),
      () => {},
    );

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://magi-test.openai.azure.com/openai/v1/audio/speech");
    expect(init?.headers).toMatchObject({
      "api-key": "azure-secret",
      "Content-Type": "application/json",
    });
    expect(init?.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(String(init?.body))).toMatchObject({ model: "magi-tts", voice: "cedar" });
  });

  it("fails before sending when the provider key is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(streamProviderSpeech(config(), request(), () => {})).rejects.toThrow("API key is not set");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
