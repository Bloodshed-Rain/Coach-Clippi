import { contextBridge, ipcRenderer } from "electron";

const api = {
  // Config
  loadConfig: () => ipcRenderer.invoke("config:load"),
  saveConfig: (config: unknown) => ipcRenderer.invoke("config:save", config),

  // Dialogs
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),

  // Import
  importFolder: (folderPath: string, targetPlayer: string) =>
    ipcRenderer.invoke("import:folder", folderPath, targetPlayer),
  importAndAnalyze: (filePaths: string[], targetPlayer: string) =>
    ipcRenderer.invoke("import:analyze", filePaths, targetPlayer),

  // Analysis
  analyzeReplays: (replayPaths: string[], targetPlayer: string, streamId?: string) =>
    ipcRenderer.invoke("analyze:run", replayPaths, targetPlayer, streamId),
  analyzeRecent: (count: number, targetPlayer: string, streamId?: string) =>
    ipcRenderer.invoke("analyze:recent", count, targetPlayer, streamId),
  analyzeTrends: (trendSummary: string) => ipcRenderer.invoke("analyze:trends", trendSummary),
  analyzeScoped: (scope: string, id: string | number, targetPlayer?: string, streamId?: string) =>
    ipcRenderer.invoke("analyze:scoped", scope, id, targetPlayer, streamId),
  generateDossier: (opponentKey: string, targetPlayer?: string, streamId?: string) =>
    ipcRenderer.invoke("analyze:dossier", opponentKey, targetPlayer, streamId),
  analyzeDiscovery: (streamId?: string) => ipcRenderer.invoke("analyze:discovery", streamId),
  analyzeSession: (date: string) => ipcRenderer.invoke("llm:analyzeSession", date),
  generatePracticePlan: (weaknessSummary: string) => ipcRenderer.invoke("llm:generatePracticePlan", weaknessSummary),
  listPracticePlans: () => ipcRenderer.invoke("llm:listPracticePlans"),
  setDrillCompletion: (drillId: number, completed: boolean) =>
    ipcRenderer.invoke("llm:setDrillCompletion", drillId, completed),
  deletePracticePlan: (planId: number) => ipcRenderer.invoke("llm:deletePracticePlan", planId),
  oracleListMessages: () => ipcRenderer.invoke("llm:oracleListMessages"),
  oracleAsk: (text: string) => ipcRenderer.invoke("llm:oracleAsk", text),
  oracleClear: () => ipcRenderer.invoke("llm:oracleClear"),

  // LLM
  getLLMModels: () => ipcRenderer.invoke("llm:models"),
  getCurrentModel: () => ipcRenderer.invoke("llm:currentModel"),
  fetchOpenRouterModels: () => ipcRenderer.invoke("openrouter:models"),
  fetchAllModels: () => ipcRenderer.invoke("llm:fetch-all-models"),

  // Stats
  getOverallRecord: () => ipcRenderer.invoke("stats:overall"),
  getMatchupRecords: () => ipcRenderer.invoke("stats:matchups"),
  getStageRecords: () => ipcRenderer.invoke("stats:stages"),
  getRecentGames: (limit: number) => ipcRenderer.invoke("stats:recentGames", limit),
  getLatestAnalysis: () => ipcRenderer.invoke("stats:latestAnalysis"),
  getOpponents: (search?: string) => ipcRenderer.invoke("stats:opponents", search),
  getSets: () => ipcRenderer.invoke("stats:sets"),
  clearAllGames: () => ipcRenderer.invoke("data:clearAll"),
  getCharacterList: () => ipcRenderer.invoke("stats:characterList"),
  getCharacterMatchups: (character: string) => ipcRenderer.invoke("stats:characterMatchups", character),
  getCharacterStageStats: (character: string) => ipcRenderer.invoke("stats:characterStages", character),
  getCharacterSignatureStats: (character: string) => ipcRenderer.invoke("stats:characterSignature", character),
  getCharacterGameStats: (character: string) => ipcRenderer.invoke("stats:characterGameStats", character),
  getOpponentDetail: (opponentKey: string) => ipcRenderer.invoke("stats:opponentDetail", opponentKey),
  getDashboardHighlights: () => ipcRenderer.invoke("stats:dashboardHighlights"),
  getGameHighlights: (gameId: number) => ipcRenderer.invoke("stats:gameHighlights", gameId),
  getRecentHighlights: (limit: number) => ipcRenderer.invoke("stats:recentHighlights", limit),
  getAnalysisHistory: (limit: number, offset: number, scopeFilter?: string) =>
    ipcRenderer.invoke("stats:analysisHistory", limit, offset, scopeFilter),
  getGameDetail: (gameId: number) => ipcRenderer.invoke("stats:gameDetail", gameId),
  getSessionsByDay: (daysBack?: number) => ipcRenderer.invoke("stats:sessionsByDay", daysBack),
  getTrendSeries: (metric: string, range: string, filterChar: string | null) =>
    ipcRenderer.invoke("stats:trendSeries", metric, range, filterChar),

  // Stock timeline
  getStockTimeline: (replayPath: string) => ipcRenderer.invoke("stats:stockTimeline", replayPath),

  // Dolphin playback
  openInDolphin: (replayPath: string) => ipcRenderer.invoke("replay:openInDolphin", replayPath),
  openInDolphinAtFrame: (replayPath: string, frame: number) =>
    ipcRenderer.invoke("replay:openInDolphinAtFrame", replayPath, frame),

  // Embedded Dolphin playback (Windows only)
  embedReplayOpen: (
    replayPath: string,
    bounds: { x: number; y: number; width: number; height: number },
    startFrame?: number,
  ) => ipcRenderer.invoke("replay:embed:open", { replayPath, bounds, startFrame }),
  embedReplaySetBounds: (sessionId: string, bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke("replay:embed:setBounds", sessionId, bounds),
  embedReplayClose: (sessionId: string) => ipcRenderer.invoke("replay:embed:close", sessionId),
  embedReplaySendKey: (sessionId: string, vk: number) => ipcRenderer.invoke("replay:embed:sendKey", sessionId, vk),
  onEmbedReplayReady: (callback: (sessionId: string) => void) => {
    const listener = (_e: unknown, p: { sessionId: string }) => callback(p.sessionId);
    ipcRenderer.on("replay:embed:ready", listener);
    return () => ipcRenderer.removeListener("replay:embed:ready", listener);
  },
  onEmbedReplayError: (callback: (sessionId: string, message: string) => void) => {
    const listener = (_e: unknown, p: { sessionId: string; message: string }) => callback(p.sessionId, p.message);
    ipcRenderer.on("replay:embed:error", listener);
    return () => ipcRenderer.removeListener("replay:embed:error", listener);
  },
  onEmbedReplayExited: (callback: (sessionId: string) => void) => {
    const listener = (_e: unknown, p: { sessionId: string }) => callback(p.sessionId);
    ipcRenderer.on("replay:embed:exited", listener);
    return () => ipcRenderer.removeListener("replay:embed:exited", listener);
  },
  openFileDialog: (title: string, filters: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke("dialog:openFile", title, filters),

  // File watcher
  startWatcher: (replayFolder: string, targetPlayer: string) =>
    ipcRenderer.invoke("watcher:start", replayFolder, targetPlayer),
  stopWatcher: () => ipcRenderer.invoke("watcher:stop"),

  // Cornerman — live between-games coaching
  cornermanStart: (replayFolder: string, targetPlayer: string) =>
    ipcRenderer.invoke("cornerman:start", replayFolder, targetPlayer),
  cornermanStop: () => ipcRenderer.invoke("cornerman:stop"),
  cornermanStatus: () => ipcRenderer.invoke("cornerman:status"),
  cornermanOverlayDismiss: () => ipcRenderer.invoke("cornerman:overlay-dismiss"),

  // Queue status
  getQueueStatus: () => ipcRenderer.invoke("queue:status"),

  // Events from main process
  onImported: (callback: (result: unknown) => void) => {
    const listener = (_event: unknown, result: unknown) => callback(result);
    ipcRenderer.on("watcher:imported", listener);
    return () => ipcRenderer.removeListener("watcher:imported", listener);
  },
  onWatcherError: (callback: (message: string) => void) => {
    const listener = (_event: unknown, message: string) => callback(message);
    ipcRenderer.on("watcher:error", listener);
    return () => ipcRenderer.removeListener("watcher:error", listener);
  },
  onUpdateReady: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("update:ready", listener);
    return () => ipcRenderer.removeListener("update:ready", listener);
  },
  onImportProgress: (
    callback: (progress: {
      current: number;
      total: number;
      lastFile: string;
      importedSoFar: number;
      skippedSoFar: number;
      errorsSoFar: number;
      lastError?: string;
      lastFileStatus: "imported" | "skipped" | "error";
    }) => void,
  ) => {
    const listener = (
      _event: unknown,
      progress: {
        current: number;
        total: number;
        lastFile: string;
        importedSoFar: number;
        skippedSoFar: number;
        errorsSoFar: number;
        lastError?: string;
        lastFileStatus: "imported" | "skipped" | "error";
      },
    ) => callback(progress);
    ipcRenderer.on("import:progress", listener);
    return () => ipcRenderer.removeListener("import:progress", listener);
  },
  onAnalysisStream: (callback: (chunk: string, streamId?: string) => void) => {
    const listener = (_event: unknown, chunk: string, streamId?: string) => callback(chunk, streamId);
    ipcRenderer.on("analyze:stream", listener);
    return () => ipcRenderer.removeListener("analyze:stream", listener);
  },
  onAnalysisStreamEnd: (callback: (streamId?: string) => void) => {
    const listener = (_event: unknown, streamId?: string) => callback(streamId);
    ipcRenderer.on("analyze:stream-end", listener);
    return () => ipcRenderer.removeListener("analyze:stream-end", listener);
  },
  onCornermanStream: (callback: (chunk: string) => void) => {
    const listener = (_event: unknown, chunk: string) => callback(chunk);
    ipcRenderer.on("cornerman:stream", listener);
    return () => ipcRenderer.removeListener("cornerman:stream", listener);
  },
  onCornermanCard: (
    callback: (card: { text: string; gameNumber: number; opponentTag: string; wins: number; losses: number }) => void,
  ) => {
    const listener = (
      _event: unknown,
      card: { text: string; gameNumber: number; opponentTag: string; wins: number; losses: number },
    ) => callback(card);
    ipcRenderer.on("cornerman:card", listener);
    return () => ipcRenderer.removeListener("cornerman:card", listener);
  },
  onCornermanSetUpdate: (
    callback: (status: {
      active: boolean;
      opponentTag: string | null;
      opponentKey: string | null;
      wins: number;
      losses: number;
      gamesCount: number;
    }) => void,
  ) => {
    const listener = (
      _event: unknown,
      status: {
        active: boolean;
        opponentTag: string | null;
        opponentKey: string | null;
        wins: number;
        losses: number;
        gamesCount: number;
      },
    ) => callback(status);
    ipcRenderer.on("cornerman:set-update", listener);
    return () => ipcRenderer.removeListener("cornerman:set-update", listener);
  },
  onCornermanError: (callback: (message: string) => void) => {
    const listener = (_event: unknown, message: string) => callback(message);
    ipcRenderer.on("cornerman:error", listener);
    return () => ipcRenderer.removeListener("cornerman:error", listener);
  },
};

contextBridge.exposeInMainWorld("clippi", api);

export type ClippiAPI = typeof api;
