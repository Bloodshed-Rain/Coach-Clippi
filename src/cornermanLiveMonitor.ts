import chokidar, { type FSWatcher } from "chokidar";
import fs from "fs";
import path from "path";
import { Frames, SlippiGame, type GameStartType } from "@slippi/slippi-js/node";

import { getCharacterName, getPlayerTag } from "./pipeline/helpers";
import {
  detectLiveConversionEvents,
  detectLiveFrameEvents,
  detectLiveItemEvents,
  type CornermanLiveEvent,
  type CornermanLivePlayer,
} from "./cornermanLiveEvents";

const POLL_INTERVAL_MS = 500;
const INITIAL_FILE_WINDOW_MS = 10 * 60 * 1000;

interface CornermanLiveMonitorOptions {
  replayFolder: string;
  targetPlayer: string;
  onEvents: (events: CornermanLiveEvent[]) => void;
  onError?: (error: Error, filePath: string) => void;
}

export interface CornermanLiveMonitor {
  close: () => void;
}

function normalizeCode(code: string): string {
  const trimmed = code.trim().toUpperCase();
  const hashIdx = trimmed.indexOf("#");
  if (hashIdx < 0) return trimmed;
  const prefix = trimmed.slice(0, hashIdx);
  const num = trimmed.slice(hashIdx + 1).replace(/^0+/, "") || "0";
  return `${prefix}#${num}`;
}

function isEmptyTag(tag: string): boolean {
  const t = tag.trim().toLowerCase();
  return t === "" || t === "unknown" || t === "player" || t === "no tag";
}

function matchScore(player: { tag: string; connectCode: string }, id: string): number {
  const idLower = id.toLowerCase();
  const tagLower = player.tag.toLowerCase();
  const codeLower = player.connectCode.toLowerCase();
  const tagEmpty = isEmptyTag(player.tag);
  const isConnectCode = id.includes("#");

  if (isConnectCode) {
    const idNorm = normalizeCode(id);
    if (player.connectCode && normalizeCode(player.connectCode) === idNorm) return 100;

    const codePrefix = idLower.split("#")[0]!;
    if (codePrefix && !tagEmpty && tagLower === codePrefix) return 80;
    if (codePrefix && codePrefix.length >= 3 && !tagEmpty && tagLower.includes(codePrefix)) return 40;
  }

  if (!tagEmpty && player.tag === id) return 100;
  if (!tagEmpty && tagLower === idLower) return 95;
  if (!isConnectCode && player.connectCode && codeLower === idLower) return 90;
  if (idLower.length >= 3 && !tagEmpty && tagLower.includes(idLower)) return 50;
  if (!tagEmpty && player.tag.length >= 3 && idLower.includes(tagLower)) return 45;
  if (!isConnectCode && idLower.length >= 3 && player.connectCode && codeLower.startsWith(idLower)) return 30;

  return 0;
}

function resolveTargetIndex(players: CornermanLivePlayer[], targetPlayer: string): number {
  const scores = players.map((player) => ({ player, score: matchScore(player, targetPlayer.trim()) }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score ? scores[0].player.playerIndex : players[0]?.playerIndex ?? 0;
}

function buildPlayers(settings: GameStartType, targetPlayer: string): CornermanLivePlayer[] {
  const activePlayers = settings.players.filter((p) => p.type !== 3);
  const players = activePlayers.map((player) => ({
    playerIndex: player.playerIndex,
    tag: getPlayerTag(player),
    connectCode: player.connectCode || "",
    character: getCharacterName(player.characterId),
    isTarget: false,
  }));
  const targetIndex = resolveTargetIndex(players, targetPlayer);
  return players.map((player) => ({ ...player, isTarget: player.playerIndex === targetIndex }));
}

function findRecentSlpFiles(replayFolder: string): string[] {
  const now = Date.now();
  const files: { filePath: string; mtimeMs: number }[] = [];

  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".slp")) continue;

      try {
        const stat = fs.statSync(full);
        if (now - stat.mtimeMs <= INITIAL_FILE_WINDOW_MS) {
          files.push({ filePath: full, mtimeMs: stat.mtimeMs });
        }
      } catch {
        // The live file can disappear between readdir and stat; skip it.
      }
    }
  };

  walk(replayFolder);
  return files.sort((a, b) => b.mtimeMs - a.mtimeMs).map((f) => f.filePath);
}

class LiveReplayTracker {
  private game: SlippiGame;
  private players: CornermanLivePlayer[] | null = null;
  private seenConversionKeys = new Set<string>();
  private seenFrameKeys = new Set<string>();
  private seenItemKeys = new Set<string>();
  private lastItemFrame = Frames.FIRST_PLAYABLE - 1;
  private lastFrameEventFrame = Frames.FIRST_PLAYABLE - 1;
  private baselineFrame: number | null = null;
  private ended = false;
  private completedPolls = 0;

  constructor(
    private filePath: string,
    private targetPlayer: string,
    private suppressExistingEvents: boolean,
  ) {
    this.game = new SlippiGame(filePath, { processOnTheFly: true });
  }

  isDone(): boolean {
    return this.ended && this.completedPolls >= 2;
  }

  poll(): CornermanLiveEvent[] {
    const settings = this.game.getSettings();
    if (!settings) return [];

    if (!this.players) {
      this.players = buildPlayers(settings, this.targetPlayer);
    }

    const stats = this.game.getStats();
    const frames = this.game.getFrames();
    const latestFrame = stats?.lastFrame ?? this.game.getLatestFrame()?.frame ?? Frames.FIRST_PLAYABLE - 1;

    if (this.baselineFrame === null && this.suppressExistingEvents) {
      this.baselineFrame = latestFrame;
      this.lastItemFrame = latestFrame;
      this.lastFrameEventFrame = latestFrame;
      return [];
    }

    const minEventFrame = (this.baselineFrame ?? Frames.FIRST_PLAYABLE - 1) + 1;
    const events: CornermanLiveEvent[] = [];

    if (stats) {
      events.push(
        ...detectLiveConversionEvents({
          conversions: stats.conversions,
          players: this.players,
          seenKeys: this.seenConversionKeys,
          frames,
          stageId: settings.stageId,
          minEventFrame,
        }),
      );
    }

    const frameFrom = Math.max(this.lastFrameEventFrame + 1, minEventFrame);
    if (latestFrame >= frameFrom) {
      events.push(
        ...detectLiveFrameEvents({
          frames,
          conversions: stats?.conversions ?? [],
          players: this.players,
          seenKeys: this.seenFrameKeys,
          fromFrame: frameFrom,
          toFrame: latestFrame,
        }),
      );
      this.lastFrameEventFrame = latestFrame;
    }

    const fromFrame = Math.max(this.lastItemFrame + 1, minEventFrame);
    if (latestFrame >= fromFrame) {
      events.push(
        ...detectLiveItemEvents({
          frames,
          players: this.players,
          seenKeys: this.seenItemKeys,
          fromFrame,
          toFrame: latestFrame,
        }),
      );
      this.lastItemFrame = latestFrame;
    }

    if (this.game.getGameEnd()) {
      this.ended = true;
    }
    if (this.ended) {
      this.completedPolls++;
    }

    return events.sort((a, b) => a.frame - b.frame);
  }
}

export function startCornermanLiveMonitor(options: CornermanLiveMonitorOptions): CornermanLiveMonitor {
  const trackers = new Map<string, LiveReplayTracker>();

  const addTracker = (filePath: string, suppressExistingEvents: boolean): void => {
    if (!filePath.endsWith(".slp") || trackers.has(filePath)) return;
    trackers.set(filePath, new LiveReplayTracker(filePath, options.targetPlayer, suppressExistingEvents));
  };

  for (const filePath of findRecentSlpFiles(options.replayFolder).slice(0, 1)) {
    addTracker(filePath, true);
  }

  const watcher: FSWatcher = chokidar.watch(options.replayFolder, {
    ignoreInitial: true,
    awaitWriteFinish: false,
    ignored: (filePath: string, stats?: fs.Stats) => {
      if (!stats) return false;
      return stats.isFile() && !filePath.endsWith(".slp");
    },
  });

  watcher.on("add", (filePath) => addTracker(filePath, false));

  const pollTimer = setInterval(() => {
    for (const [filePath, tracker] of trackers) {
      try {
        const events = tracker.poll();
        if (events.length > 0) {
          options.onEvents(events);
        }
        if (tracker.isDone()) {
          trackers.delete(filePath);
        }
      } catch (err) {
        options.onError?.(err instanceof Error ? err : new Error(String(err)), filePath);
      }
    }
  }, POLL_INTERVAL_MS);

  return {
    close: () => {
      clearInterval(pollTimer);
      void watcher.close();
      trackers.clear();
    },
  };
}
