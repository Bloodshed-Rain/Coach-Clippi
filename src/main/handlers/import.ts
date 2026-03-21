import * as path from "path";
import { importReplays, importAndAnalyze } from "../../importer.js";
import type { SafeHandleFn } from "../ipc.js";

export function registerImportHandlers(safeHandle: SafeHandleFn): void {
  safeHandle("import:folder", async (_e, folderPath: string, targetPlayer: string) => {
    const fs = require("fs") as typeof import("fs");
    const files: string[] = [];
    const walk = (dir: string) => {
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.name.endsWith(".slp")) files.push(full);
        }
      } catch (err) {
        console.error(`[import] Cannot read directory ${dir}: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    walk(folderPath);

    if (files.length === 0) {
      throw new Error(`No .slp replay files found in: ${folderPath}`);
    }

    files.sort();

    const result = importReplays(files, targetPlayer);
    return {
      imported: result.imported.filter((r) => !r.skipped).length,
      skipped: result.skipped,
      total: files.length,
    };
  });

  safeHandle("import:analyze", async (_e, filePaths: string[], targetPlayer: string) => {
    return importAndAnalyze(filePaths, targetPlayer);
  });
}
