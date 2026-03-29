# LLM Integration Layer Audit Report

**Date**: 2026-03-22
**Agent**: LLM-ORCHESTRATOR
**Scope**: Full audit of provider abstraction, prompt quality, queue management, analysis flow, IPC integration, and API key security.

---

## 1. Provider Abstraction (`src/llm.ts`)

### Supported Providers (5 total)

| Provider | API Key Source | Models | Request Format | Rate Limit Handling | Retry Logic |
|----------|---------------|--------|----------------|--------------------|----|
| **OpenRouter** | `config.openrouterApiKey` / `OPENROUTER_API_KEY` env | DeepSeek V3, DeepSeek R1, Claude Sonnet 4, Gemini 2.5 Flash, GPT-4o | OpenAI-compatible chat completions | 429 with `retry-after` header respect | 3 retries, exponential backoff |
| **Gemini** | `config.geminiApiKey` / `GEMINI_API_KEY` env | gemini-2.5-flash | Google `generateContent` API (v1beta) | 429 with exponential backoff | 3 retries |
| **Anthropic** | `config.anthropicApiKey` / `ANTHROPIC_API_KEY` env | claude-sonnet-4-20250514 | Messages API with `system` field | 429 with `retry-after` header respect | 3 retries |
| **OpenAI** | `config.openaiApiKey` / `OPENAI_API_KEY` env | gpt-4o | Chat completions | 429 with `retry-after` header respect | 3 retries |
| **Local** | N/A (no key needed) | Any (Ollama/LM Studio) | OpenAI-compatible at configurable endpoint | No 429 handling | 3 retries for empty responses only |

### Key Architecture Details

- **Default model**: `deepseek/deepseek-chat` (DeepSeek V3 via OpenRouter) -- very cost-effective choice.
- **Custom model heuristic**: `getModelProvider()` infers provider from model ID string patterns (`/` = OpenRouter, `gemini*` = Gemini, `claude*` = Anthropic, `gpt-*|o1|o3` = OpenAI, else = local). This is clever but has an edge case (see bugs below).
- **Fetch timeout**: 120 seconds for all providers. Appropriate for LLM calls.
- **No streaming support**: All calls are synchronous request/response. The UI blocks until the full response is received.

### Retry Logic Assessment

- **Good**: All providers retry up to 3 times on empty responses with linear backoff (`RETRY_DELAY_MS * attempt`).
- **Good**: 429 handling uses `retry-after` header where available (OpenRouter, Anthropic, OpenAI). Gemini uses pure exponential backoff.
- **Good**: Custom `EmptyResponseError` class for clear error typing.
- **Issue**: Non-429 HTTP errors (500, 502, 503) are NOT retried -- they throw immediately. Server errors from LLM providers are transient and should be retried.
- **Issue**: `AbortError` from timeout is only caught in `callLocal()`. Other providers will throw an uncaught `AbortError` if the 120s timeout fires, with a generic error message instead of a helpful timeout message.

### Bugs Found

1. **Heuristic collision**: A model ID like `claude-3.5-haiku` would route to Anthropic (correct), but `o3-mini` would also route to OpenAI -- which is correct. However, a model named `openai/o3-mini` would route to OpenRouter (due to `/` check first), which is also correct. The heuristic seems well-ordered.

2. **Missing `max_tokens` for non-Anthropic providers**: Anthropic gets `max_tokens: 8192`. OpenRouter, OpenAI, and Gemini do NOT set any max_tokens. This means:
   - OpenRouter/OpenAI will use provider defaults (often 4096), which may truncate long coaching analyses.
   - Gemini has no equivalent parameter set. Could get truncated output.
   - **Recommendation**: Set explicit `max_tokens` / `maxOutputTokens` for all providers.

3. **Local provider sends `undefined` model**: When `modelId === "local"`, the body includes `model: undefined`. After JSON.stringify, this key is omitted entirely. This works for Ollama (uses default model) but LM Studio may require it. Not a bug per se, but worth noting.

4. **Gemini API version pinned to v1beta**: This is a preview endpoint. Should consider migrating to v1 when stable.

---

## 2. Prompt Quality (`src/pipeline/prompt.ts`)

### SYSTEM_PROMPT Assessment

**Strengths** (this is an exceptionally well-crafted system prompt):
- Clear coaching persona established with specific tone guidance ("like a skilled practice partner... giving honest feedback over a drink at the venue").
- Explicit anti-patterns listed ("WHAT NOT TO DO" section prevents common LLM failures).
- Timestamp citation rules are excellent -- forces verifiable claims.
- Character-specific signature stats section gives the LLM context to interpret Fox waveshines vs Marth ken combos differently.
- Matchup awareness section covers all top-tier and high-tier matchups with correct Melee knowledge.
- Calibration instruction ("calibrate to the player's level") prevents condescending advice to advanced players.
- Structured output format (8 sections) ensures consistent, comprehensive analysis.
- The "Coach's Wisdom" section (section 8) is a clever way to encourage non-obvious pattern recognition.

**Improvement Opportunities**:

1. **Missing matchup coverage**: Yoshi, Pikachu, Samus, Luigi, Doc Mario matchups are absent. The prompt says "apply general principles" for unlisted characters, but these are tournament-viable characters that deserve specific guidance.

2. **No stage-specific analysis guidance**: The prompt mentions "counterpick stages" in the set-level section but doesn't teach the LLM about stage dynamics (FD chain grabs, Dreamland survival, Battlefield platform camping, etc.). Stage choice is a major strategic axis in Melee.

3. **Token budget concern**: The SYSTEM_PROMPT is ~249 lines / ~3000+ words. Combined with the user prompt (which includes full JSON dumps of player stats), total input could easily hit 8K-15K tokens per game. For multi-game sets (3-5 games), input could reach 30K+ tokens. This is:
   - Fine for DeepSeek V3, GPT-4o, Claude (128K+ context).
   - Potentially problematic for local models with smaller context windows.
   - Cost-relevant: at 30K input tokens, even DeepSeek V3 costs ~$0.004/analysis. OpenRouter Claude would be $0.09/analysis.

4. **Prompt lacks explicit output length guidance**: No instruction on target word count. LLMs may produce 500-word or 5000-word responses unpredictably. Adding "target 1500-2500 words" would improve consistency.

5. **JSON data dump in user prompt**: `assembleUserPrompt()` dumps raw JSON objects for player stats and derived insights. While functional, this means the LLM must parse nested JSON. Consider a more human-readable intermediate format for better reasoning, or at minimum, add inline comments/labels to key fields.

### assembleUserPrompt() Assessment

- **Good**: Strips nulls/empty arrays to reduce noise.
- **Good**: Merges and chronologically sorts key moments from both players into a unified timeline.
- **Good**: Includes adaptation signals for multi-game sets.
- **Issue**: Raw JSON dumps of PlayerSummary objects include every field, many of which are redundant or low-signal for coaching. A curated subset would improve signal-to-noise ratio and reduce token usage.
- **Issue**: No explicit matchup label (e.g., "Fox vs Marth on FD") -- the LLM has to infer this from the player data objects.

---

## 3. Queue Management (`src/llmQueue.ts`)

### Implementation Assessment

**Correct and well-designed**. Simple FIFO queue processing one request at a time.

- Minimum 1500ms delay between calls (configurable). Safe for Gemini free tier (30 RPM).
- Error propagation is correct -- `reject()` passes the actual error to the caller's promise.
- `clear()` method properly rejects all pending items.
- `pending` and `isProcessing` getters allow UI status reporting.

### Edge Cases

1. **No concurrency control for the queue itself**: `processNext()` is called from both `enqueue()` and from itself after completing an item. The `if (this.processing)` guard prevents double-processing. This is correct but relies on JS single-threaded execution. Safe in Electron main process.

2. **No priority system**: All requests are FIFO. If a user manually triggers analysis while a batch import is running, their request waits behind all import analyses. Consider a priority queue or separate queues for interactive vs batch.

3. **No cancellation of in-flight requests**: `clear()` only rejects pending items, not the currently executing one. If a user navigates away, the in-flight LLM call continues to completion (and its result is silently discarded by the rejected promise). Wasted API cost.

4. **Fixed delay regardless of provider**: The 1500ms delay is tuned for Gemini free tier. OpenRouter and paid APIs have much higher rate limits. The delay is unnecessarily conservative for most providers, making batch imports slower than needed.

---

## 4. Analysis Flow (`src/replayAnalyzer.ts`)

### Cache Strategy

```
1. Hash .slp file (SHA-256)
2. Check DB for existing game with same hash
3. If game + analysis exist -> return cached (zero cost)
4. If game exists, no analysis -> generate analysis, attach to game
5. If new -> generate analysis, insert game + stats + analysis in transaction
```

**Strengths**:
- SHA-256 hash-based dedup is robust.
- Transaction wrapping (step 5) ensures atomicity -- no orphaned game rows without analysis.
- Signature stats are stored alongside game data.

**Issues**:

1. **No model-aware cache invalidation**: Cache is keyed by file hash only, not by model. If the user switches from DeepSeek to Claude, they still get the old DeepSeek analysis. The `model_used` column is stored but never used for cache lookup. Consider either:
   - Adding model to the cache key (so switching models triggers re-analysis).
   - Storing multiple analyses per game and letting the user pick.
   - At minimum, showing which model generated the cached analysis.

2. **Stale analysis generator pattern**: The `setAnalysisGenerator()` plugin pattern means the analysis function is set once at startup. If the user changes their LLM model in Settings mid-session, the generator uses the new config (because `resolveLLMConfig()` reads fresh config each call). This is actually correct -- but only because the generator closure calls `resolveLLMConfig()` at call time, not at registration time.

3. **Synchronous file hashing**: `hashFile()` uses `fs.readFileSync()`. For large .slp files or batch imports, this blocks the main process event loop. Should use async `fs.promises.readFile()` or stream-based hashing.

4. **`insertCoachingAnalysis` called directly in step 3** (line 256-264) instead of using the `insertCoachingAnalysis` from db.ts for consistency. Actually it does use a raw `db.prepare()` -- this duplicates the insert logic.

5. **Batch processing is sequential**: `processReplays()` processes files one-by-one with `await`. The queue already serializes LLM calls, but the parsing/hashing could be parallelized.

---

## 5. IPC Integration

### `src/main/handlers/analysis.ts`

- **`analyze:run`**: Handles both single replay (dedup via `processReplay`) and multi-replay set analysis. Single replays get full caching. Multi-replay sets do NOT get cached -- every set analysis triggers a fresh LLM call.
- **`analyze:recent`**: Pulls N most recent games from DB, re-parses their .slp files, and runs set analysis. No caching.
- **`analyze:trends`**: Uses a completely different system prompt (inline, hardcoded) for trend commentary. This prompt is much shorter and more casual than the main SYSTEM_PROMPT.

**Issues**:
1. **Multi-game set analysis has no caching**: Re-analyzing the same 3 games as a set always costs an LLM call. Could hash the set of replay hashes to create a set-level cache key.
2. **`analyze:run` for single replay ignores `targetPlayer` parameter**: Line 59 calls `processReplay()` without passing the target player. The generator uses `config.connectCode ?? config.targetPlayer` instead. If the UI passes a different target player for a specific analysis, it's ignored.
3. **Trend prompt is hardcoded inline**: Should be in `prompt.ts` alongside `SYSTEM_PROMPT` for consistency and maintainability.

### `src/main/handlers/llm.ts`

- Simple handlers for model listing and queue status.
- **`openrouter:models`**: Fetches live model list from OpenRouter API. No caching, no error handling beyond status check. Could cache this for the session.

---

## 6. API Key Security

### Storage

- **Primary**: `~/.magi-melee/config.json` as plaintext JSON. This is standard for desktop apps but keys are in cleartext on disk.
- **Fallback**: `key.env` file at project root (dev) or app resources (prod). Loaded into `process.env` at startup.
- **Priority**: Config values take precedence over env vars (config checked first in each `call*` function).

### Exposure Risks

1. **Error messages include full API response bodies**: Lines like `throw new Error(\`OpenRouter API error (${response.status}): ${errorBody}\`)` could include key-related error details from the provider. These errors propagate to the renderer via IPC. Low risk but worth sanitizing.

2. **Keys are NOT logged**: The `setup.ts` CLI properly shows `"(set)"` / `"(not set)"` instead of actual key values. No `console.log` statements expose keys.

3. **Config file has no file permissions management**: `config.json` is created with default permissions (typically 644 on Linux). Should be 600 to prevent other users from reading keys.

4. **No encryption at rest**: Keys are stored in plaintext. For a desktop app this is typical (Electron doesn't have a built-in secure keychain), but could use `safeStorage` API from Electron for encrypted key storage.

5. **key.env is in .gitignore**: Confirmed by the CLAUDE.md instruction "never commit this file". Appropriate.

---

## Summary of Priority Findings

### Critical
- **No `max_tokens` on most providers**: Could cause truncated analyses with no error indication.
- **No retry on 5xx errors**: Transient server errors kill the analysis instead of retrying.

### High
- **No streaming support**: User waits 10-30 seconds with no feedback. Streaming would dramatically improve UX.
- **Cache ignores model**: Switching models serves stale analysis from previous model.
- **Single-replay analysis ignores `targetPlayer` IPC parameter**: Could analyze from wrong player's perspective.

### Medium
- **Queue has no priority**: Interactive requests blocked behind batch imports.
- **Synchronous file hashing blocks main process**: Bad for large batches.
- **Multi-game set analysis not cached**: Repeated set analysis wastes API calls.
- **AbortError not caught for non-local providers**: Timeout produces unhelpful error.
- **Missing matchup/stage guidance in prompt**: Yoshi, Pikachu, Samus, Luigi, and stage-specific dynamics not covered.

### Low
- **Config file permissions not restricted**: Keys readable by other OS users.
- **Trend prompt hardcoded in handler**: Should be in prompt.ts.
- **No output length guidance in system prompt**: Response length varies unpredictably.
- **Gemini API uses v1beta endpoint**: Should migrate when stable.
- **Fixed 1500ms queue delay**: Too conservative for paid API tiers.

---

## Recommended Improvements (Ordered by Impact)

1. Add `max_tokens` / `maxOutputTokens` to all provider calls (8192 for all).
2. Add retry logic for 500/502/503 status codes across all providers.
3. Implement streaming support via SSE for OpenRouter/OpenAI/Anthropic (Gemini has different streaming API).
4. Make cache model-aware: include `model_used` in cache lookup query.
5. Fix `analyze:run` to pass `targetPlayer` through to `processReplay`.
6. Add `AbortError` handling to all provider functions (not just local).
7. Add priority to queue (interactive > batch).
8. Move trend prompt to `prompt.ts`.
9. Add stage-specific analysis guidance to SYSTEM_PROMPT.
10. Add output length target to SYSTEM_PROMPT (~2000 words for single game, ~3500 for sets).
