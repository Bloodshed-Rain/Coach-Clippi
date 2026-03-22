import * as path from "path";
import * as fs from "fs";
import { loadConfig } from "../../config.js";
import { type SafeHandleFn, validatePath } from "../ipc.js";

export function registerDolphinHandlers(safeHandle: SafeHandleFn): void {
  safeHandle("replay:openInDolphin", async (_e, replayPath: string) => {
    const safeReplayPath = validatePath(replayPath);
    const config = loadConfig();
    let dolphinPath = config.dolphinPath;

    // Auto-detect common Slippi Dolphin locations if not configured
    if (!dolphinPath) {
      const { execSync } = require("child_process") as typeof import("child_process");
      const home = require("os").homedir();
      const candidates = process.platform === "linux"
        ? [
            // Slippi Launcher standard paths (most common)
            path.join(home, ".config/Slippi Launcher/playback/Slippi_Playback-x86_64.AppImage"),
            path.join(home, ".config/Slippi Launcher/netplay/Slippi_Online-x86_64.AppImage"),
            // Flatpak / system installs
            "/usr/bin/slippi-dolphin",
            "/usr/local/bin/slippi-dolphin",
            path.join(home, "Slippi-Dolphin/squashfs-root/usr/bin/dolphin-emu"),
            path.join(home, ".local/bin/slippi-dolphin"),
          ]
        : process.platform === "darwin"
          ? [
              "/Applications/Slippi Dolphin.app/Contents/MacOS/Slippi Dolphin",
              path.join(home, "Applications/Slippi Dolphin.app/Contents/MacOS/Slippi Dolphin"),
              path.join(home, "Library/Application Support/Slippi Launcher/playback/Slippi Dolphin.app/Contents/MacOS/Slippi Dolphin"),
            ]
          : [
              path.join(home, "AppData", "Roaming", "Slippi Launcher", "playback", "Slippi Dolphin.exe"),
              "C:\\Program Files\\Slippi Dolphin\\Slippi Dolphin.exe",
            ];

      // Also try `which` on unix
      if (process.platform !== "win32") {
        try {
          const found = execSync("which slippi-dolphin 2>/dev/null || which dolphin-emu 2>/dev/null", { encoding: "utf-8" }).trim();
          if (found) candidates.unshift(found);
        } catch { /* not found */ }
      }

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          dolphinPath = candidate;
          break;
        }
      }
    }

    if (!dolphinPath) {
      throw new Error(
        "Slippi Dolphin not found. Set the Dolphin path in Settings."
      );
    }

    if (!fs.existsSync(dolphinPath)) {
      throw new Error(
        `Dolphin not found at: ${dolphinPath}. Update the path in Settings.`
      );
    }

    if (!fs.existsSync(safeReplayPath)) {
      throw new Error(`Replay file not found: ${safeReplayPath}`);
    }

    // Replicate how Slippi Launcher launches playback Dolphin:
    //   1. Write a JSON comm file with the replay command
    //   2. Launch with: -b -e <melee.iso> -i <comm.json>
    //   -b = batch mode (skip menu, boot straight into game)
    //   -e = game ISO path
    //   -i = JSON comm input file for replay commands
    const { spawn } = require("child_process") as typeof import("child_process");
    const home = require("os").homedir();

    // Write JSON comm file (same format as Slippi Launcher)
    const commFile = path.join(require("os").tmpdir(), `magi-comm-${Date.now()}.json`);
    fs.writeFileSync(commFile, JSON.stringify({
      mode: "mirror",
      replay: safeReplayPath,
      isRealTimeMode: false,
      commandId: Math.random().toString(36).slice(2),
    }));

    // Find Melee ISO from Slippi Launcher settings (platform-specific paths)
    let isoPath: string | null = null;
    try {
      const slippiSettingsCandidates = process.platform === "darwin"
        ? [path.join(home, "Library/Application Support/Slippi Launcher/Settings")]
        : process.platform === "win32"
          ? [path.join(home, "AppData/Roaming/Slippi Launcher/Settings")]
          : [path.join(home, ".config/Slippi Launcher/Settings")];

      for (const slippiSettingsPath of slippiSettingsCandidates) {
        if (fs.existsSync(slippiSettingsPath)) {
          const slippiSettings = JSON.parse(fs.readFileSync(slippiSettingsPath, "utf-8"));
          if (slippiSettings?.settings?.isoPath && fs.existsSync(slippiSettings.settings.isoPath)) {
            isoPath = slippiSettings.settings.isoPath;
            break;
          }
        }
      }
    } catch { /* ignore parse errors */ }

    if (!isoPath) {
      throw new Error("Melee ISO not found. Set your ISO path in Slippi Launcher first.");
    }

    // Build args exactly like Slippi Launcher: -b -e <iso> -i <commFile>
    const args = ["-b", "-e", isoPath, "-i", commFile];

    const child = spawn(dolphinPath, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    // Clean up comm file after a delay
    setTimeout(() => { try { fs.unlinkSync(commFile); } catch {} }, 30000);

    return true;
  });
}
