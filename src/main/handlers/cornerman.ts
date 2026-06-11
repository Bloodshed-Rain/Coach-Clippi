import { Notification } from "electron";
import { getDb, insertCoachingAnalysis } from "../../db.js";
import { advanceLiveSet, type LiveSetState } from "../../cornerman.js";
import { SYSTEM_PROMPT_CORNERMAN, assembleCornermanPrompt } from "../../pipeline/index.js";
import { callLLMStream } from "../../llm.js";
import { llmQueue } from "../../llmQueue.js";
import { type SafeHandleFn } from "../ipc.js";
import { getMainWindow, setImportListener, type WatcherImportEvent } from "../state.js";
import { resolveLLMConfig } from "./analysis.js";
import { startReplayWatcher } from "./watcher.js";

/** Cap on games rendered into the prompt — long friendlies runs vs the same
 *  opponent are one "set"; the card should focus on recent games anyway. */
const MAX_PROMPT_GAMES = 6;

interface CornermanSession {
  targetTag: string;
  setState: LiveSetState | null;
}

let session: CornermanSession | null = null;

export interface CornermanStatus {
  active: boolean;
  opponentTag: string | null;
  opponentKey: string | null;
  wins: number;
  losses: number;
  gamesCount: number;
}

function currentStatus(): CornermanStatus {
  return {
    active: session !== null,
    opponentTag: session?.setState?.opponentTag ?? null,
    opponentKey: session?.setState?.opponentKey ?? null,
    wins: session?.setState?.wins ?? 0,
    losses: session?.setState?.losses ?? 0,
    gamesCount: session?.setState?.games.length ?? 0,
  };
}

function broadcast(channel: string, ...args: unknown[]): void {
  try {
    getMainWindow()?.webContents.send(channel, ...args);
  } catch {
    // window may have closed
  }
}

/** Latest cached dossier text for an opponent, if the user ever generated one */
function getCachedDossier(opponentKey: string): string | null {
  const row = getDb()
    .prepare(
      "SELECT analysis_text FROM coaching_analyses WHERE scope = 'dossier' AND scope_identifier = ? ORDER BY created_at DESC LIMIT 1",
    )
    .get(opponentKey) as { analysis_text: string } | undefined;
  return row?.analysis_text ?? null;
}

async function handleCornermanImport(event: WatcherImportEvent): Promise<void> {
  if (!session || event.skipped || !event.gameResult) return;

  // Capture the session reference now so we can detect stop/restart after the
  // async LLM call resolves (Issue 2: stale broadcast guard).
  const mySession = session;

  const outcome = advanceLiveSet(session.setState, event.gameResult, session.targetTag, Date.now());
  if (!outcome) return; // handwarmer / false start
  session.setState = outcome.state;

  broadcast("cornerman:set-update", currentStatus());

  const { games, wins, losses, opponentKey, opponentTag } = outcome.state;
  const totalGames = games.length; // full count before slicing for prompt cap
  const userPrompt = assembleCornermanPrompt(
    games.slice(-MAX_PROMPT_GAMES).map((g) => g.gameResult),
    session.targetTag,
    { wins, losses },
    getCachedDossier(opponentKey),
    totalGames,
  );
  const llmConfig = resolveLLMConfig();

  let card: string;
  try {
    card = await llmQueue.enqueue(() =>
      callLLMStream({ systemPrompt: SYSTEM_PROMPT_CORNERMAN, userPrompt, config: llmConfig }, (chunk) => {
        broadcast("cornerman:stream", chunk);
      }),
    );
  } catch (err) {
    if (session === mySession) {
      broadcast("cornerman:error", err instanceof Error ? err.message : String(err));
    }
    return;
  }

  // If the user stopped or restarted cornerman while the LLM was in flight,
  // skip the card broadcast and notification — they belong to a dead session.
  // The DB insert still runs because we already paid for the tokens.
  if (session === mySession) {
    broadcast("cornerman:card", {
      text: card,
      gameNumber: totalGames,
      opponentTag,
      wins,
      losses,
    });
  }

  try {
    insertCoachingAnalysis(
      event.gameId ?? null,
      null,
      llmConfig.modelId || "pollinations",
      card,
      "cornerman",
      opponentKey,
      `Cornerman G${totalGames} vs ${opponentTag}`,
    );
  } catch (err) {
    console.error("[cornerman] failed to persist card:", err);
  }

  if (session === mySession) {
    try {
      new Notification({
        title: `MAGI Cornerman — ${wins}-${losses} vs ${opponentTag}`,
        body: "Your between-games adjustment is ready.",
      }).show();
    } catch {
      // notifications are best-effort
    }
  }
}

export function registerCornermanHandlers(safeHandle: SafeHandleFn): void {
  safeHandle("cornerman:start", (_e, replayFolder: string, targetPlayer: string) => {
    startReplayWatcher(replayFolder, targetPlayer);
    session = { targetTag: targetPlayer, setState: null };
    setImportListener((event) => {
      // Fire-and-forget; failures are logged so they're not silently invisible
      void handleCornermanImport(event).catch((err) => {
        console.error("[cornerman] card generation failed:", err);
      });
    });
    broadcast("cornerman:set-update", currentStatus());
    return currentStatus();
  });

  safeHandle("cornerman:stop", () => {
    session = null;
    setImportListener(null);
    // The folder watcher stays up — it's the app-wide live import; stop it via watcher:stop.
    broadcast("cornerman:set-update", currentStatus());
    return currentStatus();
  });

  safeHandle("cornerman:status", () => currentStatus());
}
