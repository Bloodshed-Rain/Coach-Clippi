import { watchReplays } from "../../watcher.js";
import { getMainWindow, getFileWatcher, setFileWatcher } from "../state.js";
import { type SafeHandleFn, validatePath } from "../ipc.js";

export function registerWatcherHandlers(safeHandle: SafeHandleFn): void {
  safeHandle("watcher:start", (_e, replayFolder: string, targetPlayer: string) => {
    const safeFolder = validatePath(replayFolder);
    const existing = getFileWatcher();
    if (existing) {
      existing.close();
    }
    setFileWatcher(watchReplays({
      replayFolder: safeFolder,
      targetPlayer,
      importExisting: false,
      onImport: (result) => {
        getMainWindow()?.webContents.send("watcher:imported", result);
      },
      onError: (err) => {
        getMainWindow()?.webContents.send("watcher:error", err.message);
      },
    }));
    return true;
  });

  safeHandle("watcher:stop", () => {
    const watcher = getFileWatcher();
    if (watcher) {
      watcher.close();
      setFileWatcher(null);
    }
    return true;
  });
}
