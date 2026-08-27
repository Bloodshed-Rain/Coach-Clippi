import * as path from "path";
import { importReplays, importAndAnalyze, type ImportProgressCallback, type ImportProgress } from "../../importer.js";
import { type SafeHandleFn, validatePath } from "../ipc.js";
import { getMainWindow } from "../state.js";

function createProgressSender(): ImportProgressCallback {
  let lastSent = 0;
  return (progress: ImportProgress) => {
    const now = Date.now();
    // Throttle to ~10 updates/sec to prevent IPC flooding on large imports (65K+ files).
    // Always send the final progress event.
    if (now - lastSent < 100 && progress.current < progress.total) return;
    lastSent = now;
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("import:progress", progress);
    }
  };
}

export function registerImportHandlers(safeHandle: SafeHandleFn): void {
  safeHandle("import:folder", async (_e, folderPath: string, targetPlayer: string) => {
    const safePath = validatePath(folderPath);
    const fs = require("fs") as typeof import("fs");
    const files: string[] = [];
    const unreadableDirs: string[] = [];
    const walk = (dir: string) => {
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.name.endsWith(".slp")) files.push(full);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[import] Cannot read directory ${dir}: ${msg}`);
        unreadableDirs.push(dir);
      }
    };
    walk(safePath);

    if (files.length === 0) {
      const extra =
        unreadableDirs.length > 0
          ? ` (${unreadableDirs.length} subdirectories were unreadable — check permissions)`
          : "";
      throw new Error(`No .slp replay files found in: ${safePath}${extra}`);
    }

    files.sort();

    const onProgress = createProgressSender();
    const result = await importReplays(files, targetPlayer, onProgress);
    return {
      imported: result.imported.filter((r) => r.gameId !== undefined).length,
      skipped: result.skipped,
      errors: result.errors,
      errorDetails: result.errorDetails,
      total: files.length,
      unreadableDirs: unreadableDirs.length,
    };
  });

  safeHandle("import:analyze", async (_e, filePaths: string[], targetPlayer: string) => {
    const safePaths = filePaths.map(validatePath);
    const onProgress = createProgressSender();
    return importAndAnalyze(safePaths, targetPlayer, onProgress);
  });
}
