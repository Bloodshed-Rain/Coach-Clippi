import { afterEach, describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import { callLLM, callLLMStream, isUsableLLMResponse, NoModelSelectedError, LLM_DEFAULTS } from "../src/llm";

const LLM_SOURCE = fs.readFileSync(path.resolve(__dirname, "../src/llm.ts"), "utf-8");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("callLLM provider selection", () => {
  it("rejects provider safety metadata as an analysis", () => {
    expect(isUsableLLMResponse("User Safety: safe")).toBe(false);
    expect(isUsableLLMResponse("Safety: unsafe.")).toBe(false);
    expect(isUsableLLMResponse("Your shield pressure is safe on block.")).toBe(true);
  });

  it("retries when a provider returns only safety metadata", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "User Safety: safe" } }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "A real coaching analysis." } }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await callLLM({
      systemPrompt: "system",
      userPrompt: "user",
      config: {
        ...LLM_DEFAULTS,
        modelId: "openrouter/free",
        activeProvider: "openrouter",
        apiKeys: { openrouter: "test-key" },
      },
    });

    expect(result).toBe("A real coaching analysis.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects with NoModelSelectedError when no model is configured (no silent fallback)", async () => {
    await expect(callLLM({ systemPrompt: "s", userPrompt: "u", config: LLM_DEFAULTS })).rejects.toThrow(
      NoModelSelectedError,
    );
  });

  it("streaming rejects the same way", async () => {
    await expect(callLLMStream({ systemPrompt: "s", userPrompt: "u", config: LLM_DEFAULTS }, () => {})).rejects.toThrow(
      NoModelSelectedError,
    );
  });

  it("keeps the final SSE event when the stream closes without a newline", async () => {
    const payload = 'data:{"choices":[{"delta":{"content":"Final coaching note"}}]}';
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(payload));
            controller.close();
          },
        }),
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      ),
    );
    const chunks: string[] = [];

    const result = await callLLMStream(
      {
        systemPrompt: "system",
        userPrompt: "user",
        config: {
          ...LLM_DEFAULTS,
          modelId: "gpt-4o-mini",
          activeProvider: "openai",
          apiKeys: { openai: "test-key" },
        },
      },
      (chunk) => chunks.push(chunk),
    );

    expect(result).toBe("Final coaching note");
    expect(chunks).toEqual(["Final coaching note"]);
  });

  it("never reroutes a failed provider to Pollinations", () => {
    // The old behavior silently sent the user's gameplay data to a free
    // third-party API on ANY provider error. Guard against reintroduction.
    expect(LLM_SOURCE).not.toContain("Falling back to free Pollinations");
    expect(LLM_SOURCE).not.toMatch(/catch[\s\S]{0,200}callPollinations/);
  });

  it("routes an Azure deployment through the configured Azure resource", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "Azure response" } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await callLLM({
      systemPrompt: "system",
      userPrompt: "user",
      config: {
        ...LLM_DEFAULTS,
        modelId: "gpt-4o",
        activeProvider: "azure",
        apiKeys: { azure: "azure-secret" },
        azureEndpoint: "https://magi-test.openai.azure.com/",
      },
    });

    expect(result).toBe("Azure response");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://magi-test.openai.azure.com/openai/v1/chat/completions");
    expect(request?.headers).toMatchObject({
      "api-key": "azure-secret",
      "Content-Type": "application/json",
    });
    expect(request?.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(String(request?.body))).toMatchObject({ model: "gpt-4o" });
  });

  it("requires an Azure resource endpoint before sending data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      callLLM({
        systemPrompt: "system",
        userPrompt: "user",
        config: {
          ...LLM_DEFAULTS,
          modelId: "deployment",
          activeProvider: "azure",
          apiKeys: { azure: "azure-secret" },
        },
      }),
    ).rejects.toThrow("Azure OpenAI endpoint is not set");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
