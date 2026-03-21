import { loadConfig } from "../../config.js";
import { getDb, insertCoachingAnalysis } from "../../db.js";
import {
  processGame, computeAdaptationSignals, findPlayerIdx,
  assembleUserPrompt, SYSTEM_PROMPT,
  type GameResult,
} from "../../pipeline/index.js";
import { callLLM, LLM_DEFAULTS, type LLMConfig } from "../../llm.js";
import { processReplay } from "../../replayAnalyzer.js";
import { llmQueue } from "../../llmQueue.js";
import type { SafeHandleFn } from "../ipc.js";

/** Build LLMConfig from user config + env vars */
export function resolveLLMConfig(): LLMConfig {
  const config = loadConfig();
  return {
    modelId: config.llmModelId ?? LLM_DEFAULTS.modelId,
    openrouterApiKey: config.openrouterApiKey ?? null,
    geminiApiKey: config.geminiApiKey ?? null,
    anthropicApiKey: config.anthropicApiKey ?? null,
    openaiApiKey: config.openaiApiKey ?? null,
    localEndpoint: config.localEndpoint ?? null,
  };
}

/** Shared multi-game analysis logic used by both analyze:run and analyze:recent */
function runMultiGameAnalysis(
  gameResults: GameResult[],
  targetPlayer: string,
): { targetTag: string; userPrompt: string } {
  const firstGame = gameResults[0]!.gameSummary;
  const targetTag = targetPlayer ||
    firstGame.players.find((p) => p.tag.toLowerCase() !== "unknown")?.tag ||
    firstGame.players[0].tag;

  if (gameResults.length >= 2) {
    const p0Tag = firstGame.players[0].tag;
    const p1Tag = firstGame.players[1].tag;
    const p0Signals = computeAdaptationSignals(gameResults, p0Tag);
    const p1Signals = computeAdaptationSignals(gameResults, p1Tag);
    const lastResult = gameResults[gameResults.length - 1]!;
    const lastP0Idx = findPlayerIdx(lastResult.gameSummary, p0Tag);
    const lastP1Idx = findPlayerIdx(lastResult.gameSummary, p1Tag);
    lastResult.derivedInsights[lastP0Idx].adaptationSignals = p0Signals;
    lastResult.derivedInsights[lastP1Idx].adaptationSignals = p1Signals;
  }

  const userPrompt = assembleUserPrompt(gameResults, targetTag);
  return { targetTag, userPrompt };
}

export function registerAnalysisHandlers(safeHandle: SafeHandleFn): void {
  // Analyze — deduplicated. Returns cached analysis if already exists.
  safeHandle("analyze:run", async (_e, replayPaths: string[], targetPlayer: string) => {
    const llmConfig = resolveLLMConfig();

    // Single replay — use processReplay for dedup + caching
    if (replayPaths.length === 1) {
      const result = await processReplay(replayPaths[0]!, getDb());
      return result.analysisText;
    }

    // Multi-replay (set analysis) — run full pipeline
    const gameResults: GameResult[] = [];
    for (let i = 0; i < replayPaths.length; i++) {
      gameResults.push(processGame(replayPaths[i]!, i + 1));
    }

    if (gameResults.length === 0) {
      throw new Error("No games to analyze.");
    }

    const { userPrompt } = runMultiGameAnalysis(gameResults, targetPlayer);
    const analysis = await llmQueue.enqueue(() =>
      callLLM({ systemPrompt: SYSTEM_PROMPT, userPrompt, config: llmConfig }),
    );

    insertCoachingAnalysis(null, null, llmConfig.modelId, analysis);

    return analysis;
  });

  // Analyze recent games from the DB (by replay paths)
  safeHandle("analyze:recent", async (_e, count: number, targetPlayer: string) => {
    const games = getDb().prepare(`
      SELECT replay_path FROM games
      WHERE played_at IS NOT NULL
      ORDER BY played_at DESC
      LIMIT ?
    `).all(count) as { replay_path: string }[];

    if (games.length === 0) {
      throw new Error("No games in database to analyze.");
    }

    // Reverse to chronological order
    const paths = games.reverse().map((g) => g.replay_path);

    const llmConfig = resolveLLMConfig();

    const gameResults: GameResult[] = [];
    for (let i = 0; i < paths.length; i++) {
      gameResults.push(processGame(paths[i]!, i + 1));
    }

    const { userPrompt } = runMultiGameAnalysis(gameResults, targetPlayer);
    const analysis = await llmQueue.enqueue(() =>
      callLLM({ systemPrompt: SYSTEM_PROMPT, userPrompt, config: llmConfig }),
    );
    insertCoachingAnalysis(null, null, llmConfig.modelId, analysis);

    return analysis;
  });

  // Trend commentary — MAGI reacts to your trend data
  safeHandle("analyze:trends", async (_e, trendSummary: string) => {
    const llmConfig = resolveLLMConfig();

    const trendPrompt = `You are MAGI (Melee Analysis through Generative Intelligence), a Melee coaching assistant with personality. You're reviewing a player's stat trends over their recent games.

Your voice: You're like a sharp, witty practice partner who genuinely wants to see them improve. Think of the energy of a commentator who actually knows the game — mix real analysis with personality. You can be funny, you can be blunt, you can hype them up when something's genuinely impressive. Use Melee terminology naturally.

Keep it concise — 3-5 short paragraphs max. Don't just recite the numbers back. Tell them what the numbers MEAN, what's exciting, what's concerning, and what to focus on next. If something is genuinely bad, don't sugarcoat it — but make it motivating, not demoralizing.

Open with a quick vibe check on their overall trajectory, then hit the highlights and lowlights.`;

    const analysis = await llmQueue.enqueue(() =>
      callLLM({ systemPrompt: trendPrompt, userPrompt: trendSummary, config: llmConfig }),
    );
    return analysis;
  });
}
