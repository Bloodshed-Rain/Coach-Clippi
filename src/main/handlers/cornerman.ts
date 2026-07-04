import { Notification } from "electron";
import { loadConfig } from "../../config.js";
import { getDb, insertCoachingAnalysis } from "../../db.js";
import { advanceLiveSet, type LiveSetState } from "../../cornerman.js";
import { startCornermanLiveMonitor, type CornermanLiveMonitor } from "../../cornermanLiveMonitor.js";
import { resolveCornermanPopupSettings, shouldShowCornermanLiveAlert } from "../../cornermanPopupSettings.js";
import { importReplay } from "../../importer.js";
import { SYSTEM_PROMPT_CORNERMAN, assembleCornermanPrompt } from "../../pipeline/index.js";
import { callLLMStream } from "../../llm.js";
import { llmQueue } from "../../llmQueue.js";
import { type SafeHandleFn, validatePath } from "../ipc.js";
import { getMainWindow, setImportListener, type WatcherImportEvent } from "../state.js";
import { resolveLLMConfig } from "./analysis.js";
import { notifyGameHighlights, startReplayWatcher } from "./watcher.js";
import {
  ensureOverlayWindow,
  showOverlayWindow,
  hideOverlayWindow,
  destroyOverlayWindow,
  resizeOverlayWindow,
  finishOverlayResize,
  sendToOverlay,
  markOverlayRendererReady,
} from "../overlayWindow.js";

/** Cap on games rendered into the prompt — long friendlies runs vs the same
 *  opponent are one "set"; the card should focus on recent games anyway. */
const MAX_PROMPT_GAMES = 6;

interface CornermanSession {
  targetTag: string;
  setState: LiveSetState | null;
}

let session: CornermanSession | null = null;
let liveMonitor: CornermanLiveMonitor | null = null;

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
  // Overlay leg is queued until its renderer mounts listeners — a send fired
  // during the window's initial load would otherwise vanish silently.
  sendToOverlay(channel, ...args);
}

function stopLiveMonitor(): void {
  liveMonitor?.close();
  liveMonitor = null;
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
  const popupSettings = resolveCornermanPopupSettings(loadConfig());

  let card: string;
  try {
    let shownThisCard = false;
    card = await llmQueue.enqueue(() =>
      callLLMStream({ systemPrompt: SYSTEM_PROMPT_CORNERMAN, userPrompt, config: llmConfig }, (chunk) => {
        if (session !== mySession) return; // stale session — drop chunks, don't pop the toast
        if (!shownThisCard && popupSettings.coachingCards) {
          shownThisCard = true;
          // Re-ensure: the overlay window may have died since cornerman:start.
          ensureOverlayWindow();
          showOverlayWindow();
        }
        broadcast("cornerman:stream", chunk);
      }),
    );
  } catch (err) {
    if (session === mySession) {
      if (popupSettings.errors) {
        ensureOverlayWindow();
        showOverlayWindow();
      }
      broadcast("cornerman:error", err instanceof Error ? err.message : String(err));
    }
    return;
  }

  // If the user stopped or restarted cornerman while the LLM was in flight,
  // skip the card broadcast and notification — they belong to a dead session.
  // The DB insert still runs because we already paid for the tokens.
  if (session === mySession) {
    if (popupSettings.coachingCards) {
      // Re-show for the finished card: if the user dismissed the toast
      // mid-stream, the completed card would otherwise land in a hidden
      // window and never be seen for the between-games window it serves.
      ensureOverlayWindow();
      showOverlayWindow();
    }
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

  if (session === mySession && popupSettings.desktopNotifications) {
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

/** Import a replay the live monitor saw finish and run the card flow on it.
 *  Covers the game already in progress when the session starts: its .slp file
 *  predates the folder watcher, whose ignoreInitial suppresses the "add" event,
 *  so without this the first game would never produce a card. SHA-256 dedup in
 *  importReplay makes this a cheap no-op when the watcher also imported it. */
async function importCompletedLiveGame(filePath: string, targetPlayer: string): Promise<void> {
  const mySession = session;
  const result = await importReplay(filePath, targetPlayer);
  if (session !== mySession) return;

  if (!result.skipped) {
    try {
      getMainWindow()?.webContents.send("watcher:imported", {
        filePath,
        skipped: result.skipped,
        gameId: result.gameId,
      });
    } catch {
      // window may have closed
    }
    if (result.gameId) {
      notifyGameHighlights(result.gameId);
    }
  }

  await handleCornermanImport({
    filePath,
    skipped: result.skipped,
    gameId: result.gameId,
    gameResult: result.gameResult,
  });
}

export function registerCornermanHandlers(safeHandle: SafeHandleFn): void {
  safeHandle("cornerman:start", (_e, replayFolder: string, targetPlayer: string) => {
    const safeFolder = validatePath(replayFolder);
    startReplayWatcher(safeFolder, targetPlayer);
    ensureOverlayWindow();
    stopLiveMonitor();
    liveMonitor = startCornermanLiveMonitor({
      replayFolder: safeFolder,
      targetPlayer,
      onEvents: (events) => {
        ensureOverlayWindow();
        const popupSettings = resolveCornermanPopupSettings(loadConfig());
        const hasVisiblePopupEvent = events.some((event) =>
          shouldShowCornermanLiveAlert(popupSettings.liveAlerts, event.importance),
        );
        if (hasVisiblePopupEvent) showOverlayWindow();
        for (const liveEvent of events) {
          broadcast("cornerman:live-event", liveEvent);
        }
      },
      onGameComplete: (filePath) => {
        void importCompletedLiveGame(filePath, targetPlayer).catch((err) => {
          console.error("[cornerman] live-game import failed:", err);
        });
      },
      onError: (err, filePath) => {
        console.warn(`[cornerman] live monitor skipped ${filePath}: ${err.message}`);
      },
    });
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
    stopLiveMonitor();
    setImportListener(null);
    destroyOverlayWindow();
    // The folder watcher stays up — it's the app-wide live import; stop it via watcher:stop.
    broadcast("cornerman:set-update", currentStatus());
    return currentStatus();
  });

  safeHandle("cornerman:status", () => currentStatus());

  safeHandle("cornerman:overlay-show", () => {
    ensureOverlayWindow();
    showOverlayWindow();
    broadcast("cornerman:set-update", currentStatus());
    return true;
  });

  safeHandle("cornerman:overlay-dismiss", () => {
    hideOverlayWindow();
    return true;
  });

  safeHandle("cornerman:overlay-ready", () => {
    markOverlayRendererReady();
    return true;
  });

  safeHandle("cornerman:overlay-resize", (_e, handle: unknown, deltaX: unknown, deltaY: unknown) =>
    resizeOverlayWindow(handle, deltaX, deltaY),
  );

  safeHandle("cornerman:overlay-resize-end", () => finishOverlayResize());
}
