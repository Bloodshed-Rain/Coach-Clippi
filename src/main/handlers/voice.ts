import { loadConfig } from "../../config.js";
import { streamProviderSpeech } from "../../providerSpeech.js";
import type { ProviderSpeechEvent, ProviderSpeechRequest } from "../../providerVoice.js";
import type { SafeHandleFn } from "../ipc.js";

const SPEECH_TIMEOUT_MS = 30_000;

export function registerVoiceHandlers(safeHandle: SafeHandleFn): void {
  const activeRequests = new Map<string, AbortController>();

  safeHandle("voice:synthesize:start", async (event, request: ProviderSpeechRequest) => {
    if (!request || typeof request.requestId !== "string" || !request.requestId.trim()) {
      throw new Error("Voice request ID is required.");
    }

    activeRequests.get(request.requestId)?.abort();
    const controller = new AbortController();
    activeRequests.set(request.requestId, controller);
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, SPEECH_TIMEOUT_MS);
    const send = (payload: ProviderSpeechEvent) => {
      if (!event.sender.isDestroyed()) event.sender.send("voice:synthesis:event", payload);
    };

    try {
      await streamProviderSpeech(
        loadConfig(),
        request,
        (chunk) => {
          send({ requestId: request.requestId, type: "chunk", chunk });
        },
        controller.signal,
      );
      send({ requestId: request.requestId, type: "done" });
    } catch (error) {
      if (controller.signal.aborted && !timedOut) {
        send({ requestId: request.requestId, type: "cancelled" });
      } else {
        const message = timedOut
          ? "Provider voice request timed out."
          : error instanceof Error
            ? error.message
            : String(error);
        send({ requestId: request.requestId, type: "error", message });
        if (request.purpose === "live" && !event.sender.isDestroyed()) {
          event.sender.send("cornerman:error", `Voice: ${message}`);
        }
      }
    } finally {
      clearTimeout(timeout);
      if (activeRequests.get(request.requestId) === controller) activeRequests.delete(request.requestId);
    }
    return true;
  });

  safeHandle("voice:synthesize:cancel", (_event, requestId: string) => {
    activeRequests.get(requestId)?.abort();
    return true;
  });
}
