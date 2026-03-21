import { loadConfig } from "../../config.js";
import { MODELS, LLM_DEFAULTS, getModelLabel } from "../../llm.js";
import { llmQueue } from "../../llmQueue.js";
import type { SafeHandleFn } from "../ipc.js";

export function registerLlmHandlers(safeHandle: SafeHandleFn): void {
  // Fetch OpenRouter models from main process (renderer is blocked by CSP)
  safeHandle("openrouter:models", async () => {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) throw new Error(`OpenRouter API ${res.status}`);
    const json = await res.json() as { data: any[] };
    return json.data;
  });

  // LLM models list — for the Settings UI
  safeHandle("llm:models", () => MODELS);
  safeHandle("llm:currentModel", () => {
    const config = loadConfig();
    const modelId = config.llmModelId ?? LLM_DEFAULTS.modelId;
    return { modelId, label: getModelLabel(modelId) };
  });

  // Queue status — so UI can show "3 analyses pending..."
  safeHandle("queue:status", () => ({
    pending: llmQueue.pending,
    processing: llmQueue.isProcessing,
  }));
}
