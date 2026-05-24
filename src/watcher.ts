import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import { importReplay } from "./importer";
import { closeDb } from "./db";
import { resolveTarget, resolveReplayFolder } from "./config";

interface WatcherOptions {
  replayFolder: string;
  targetPlayer: string | null;
  importExisting?: boolean;
  onImport?: (result: { filePath: string; skipped: boolean; gameId?: number | undefined }) => void;
  onError?: (error: Error, filePath: string) => void;
}

// ── Find existing .slp files ─────────────────────────────────────────

function findSlpFiles(dir: string): string[] {
  const files: string[] = [];
  const walk = (d: string): void => {
    try {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith(".slp")) {
          files.push(full);
        }
      }
    } catch (err) {
      console.error(`[watcher] Cannot read directory ${d}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  walk(dir);
  return files.sort();
}

// ── Watcher ──────────────────────────────────────────────────────────

export function watchReplays(options: WatcherOptions): { close: () => void } {
  const { replayFolder, targetPlayer, importExisting = true, onImport, onError } = options;

  let gameCount = 0;

  // Import existing replays first
  if (importExisting) {
    const existing = findSlpFiles(replayFolder);
    if (existing.length > 0) {
      console.log(`Found ${existing.length} existing replay(s), importing...`);

      // Use an async IIFE to handle the initial import without blocking the return
      (async () => {
        let imported = 0;
        let skipped = 0;
        for (const filePath of existing) {
          gameCount++;
          try {
            const result = await importReplay(filePath, targetPlayer, gameCount);
            if (result.skipped) {
              skipped++;
            } else {
              imported++;
            }
            onImport?.({
              filePath,
              skipped: result.skipped,
              gameId: result.gameId,
            });
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            console.error(`[error] ${path.basename(filePath)}: ${error.message}`);
            onError?.(error, filePath);
          }
        }
        console.log(`Imported: ${imported}, Skipped (duplicate): ${skipped}`);
      })();
    }
  }

  console.log(`\nWatching for new .slp files in: ${replayFolder}`);

  const watcher = chokidar.watch(replayFolder, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 500,
    },
    ignored: (filePath: string, stats?: fs.Stats) => {
      if (!stats) return false; // allow directories through
      return stats.isFile() && !filePath.endsWith(".slp");
    },
  });

  watcher.on("add", async (absolutePath) => {
    gameCount++;

    try {
      const result = await importReplay(absolutePath, targetPlayer, gameCount);

      const basename = path.basename(absolutePath);
      if (result.skipped) {
        console.log(`[skip] Already imported: ${basename}`);
      } else {
        console.log(`[imported] ${basename} → game #${result.gameId}`);
      }

      onImport?.({
        filePath: absolutePath,
        skipped: result.skipped,
        gameId: result.gameId,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`[error] Failed to import ${path.basename(absolutePath)}: ${error.message}`);
      onError?.(error, absolutePath);
    }
  });

  watcher.on("error", (err: unknown) => {
    console.error(`Watcher error: ${err instanceof Error ? err.message : String(err)}`);
  });

  return {
    close: () => {
      watcher.close();
    },
  };
}

// ── CLI entry point ──────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let cliFolder: string | null = null;
  let cliTarget: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--target" && i + 1 < args.length) {
      cliTarget = args[++i]!;
    } else if (!arg.startsWith("--")) {
      cliFolder = arg;
    }
  }

  const replayFolder = resolveReplayFolder(cliFolder);
  const targetPlayer = resolveTarget(cliTarget);

  if (!replayFolder) {
    console.error("Usage: npx tsx src/watcher.ts [replay-folder] [--target player]");
    console.error("");
    console.error("Tip: Run 'npx tsx src/setup.ts --tag YourTag --folder /path/to/replays' once,");
    console.error("     then just run 'npx tsx src/watcher.ts' with no args.");
    process.exit(1);
  }

  const absoluteFolder = path.resolve(replayFolder);

  const { close } = watchReplays({
    replayFolder: absoluteFolder,
    targetPlayer,
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nShutting down watcher...");
    close();
    closeDb();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    close();
    closeDb();
    process.exit(0);
  });

  console.log("Press Ctrl+C to stop.\n");
}

if (require.main === module) {
  main();
}
