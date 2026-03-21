import { loadConfig, saveConfig, type Config } from "../../config.js";
import type { SafeHandleFn } from "../ipc.js";

export function registerConfigHandlers(safeHandle: SafeHandleFn): void {
  safeHandle("config:load", () => loadConfig());
  safeHandle("config:save", (_e, config: Partial<Config>) => saveConfig(config));
}
