import { ipcMain } from "electron";

export type SafeHandleFn = (
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any,
) => void;

/** Wrap an IPC handler so errors are always serialized properly to the renderer */
export function safeHandle(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any,
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(message);
    }
  });
}

import { registerAnalysisHandlers } from "./handlers/analysis.js";
import { registerConfigHandlers } from "./handlers/config.js";
import { registerDialogHandlers } from "./handlers/dialog.js";
import { registerDolphinHandlers } from "./handlers/dolphin.js";
import { registerImportHandlers } from "./handlers/import.js";
import { registerLlmHandlers } from "./handlers/llm.js";
import { registerStatsHandlers } from "./handlers/stats.js";
import { registerWatcherHandlers } from "./handlers/watcher.js";

export function setupIPC(): void {
  registerConfigHandlers(safeHandle);
  registerDialogHandlers(safeHandle);
  registerImportHandlers(safeHandle);
  registerAnalysisHandlers(safeHandle);
  registerLlmHandlers(safeHandle);
  registerStatsHandlers(safeHandle);
  registerWatcherHandlers(safeHandle);
  registerDolphinHandlers(safeHandle);
}
