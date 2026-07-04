import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { callLLM, callLLMStream, NoModelSelectedError, LLM_DEFAULTS } from "../src/llm";

const LLM_SOURCE = fs.readFileSync(path.resolve(__dirname, "../src/llm.ts"), "utf-8");

describe("callLLM provider selection", () => {
  it("rejects with NoModelSelectedError when no model is configured (no silent fallback)", async () => {
    await expect(callLLM({ systemPrompt: "s", userPrompt: "u", config: LLM_DEFAULTS })).rejects.toThrow(
      NoModelSelectedError,
    );
  });

  it("streaming rejects the same way", async () => {
    await expect(
      callLLMStream({ systemPrompt: "s", userPrompt: "u", config: LLM_DEFAULTS }, () => {}),
    ).rejects.toThrow(NoModelSelectedError);
  });

  it("never reroutes a failed provider to Pollinations", () => {
    // The old behavior silently sent the user's gameplay data to a free
    // third-party API on ANY provider error. Guard against reintroduction.
    expect(LLM_SOURCE).not.toContain("Falling back to free Pollinations");
    expect(LLM_SOURCE).not.toMatch(/catch[\s\S]{0,200}callPollinations/);
  });
});
