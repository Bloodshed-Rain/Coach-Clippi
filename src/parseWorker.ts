/**
 * Worker thread for CPU-intensive slippi-js parsing.
 *
 * Runs processGame() off the main thread so the Electron UI stays responsive
 * during bulk imports. Listens for messages so the worker can be reused
 * across multiple parse jobs without respawning.
 */

import { parentPort } from "worker_threads";
import { processGame } from "./pipeline";

interface WorkerInput {
  filePath: string;
  gameNumber: number;
}

interface WorkerOutput {
  success: boolean;
  filePath: string;
  result?: ReturnType<typeof processGame>;
  error?: string;
}

if (parentPort) {
  parentPort.on("message", (input: WorkerInput) => {
    try {
      const result = processGame(input.filePath, input.gameNumber);
      const output: WorkerOutput = {
        success: true,
        filePath: input.filePath,
        result,
      };
      parentPort!.postMessage(output);
    } catch (err) {
      const output: WorkerOutput = {
        success: false,
        filePath: input.filePath,
        error: err instanceof Error ? err.message : String(err),
      };
      parentPort!.postMessage(output);
    }
  });
}
