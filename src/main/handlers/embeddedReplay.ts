// IPC handlers for in-app embedded Slippi Dolphin replay playback (Windows).
// On non-Windows platforms the handler returns { embedded: false } and the
// renderer falls back to launching Dolphin externally.

import * as path from "path";
import * as fs from "fs";
import { spawn, type ChildProcess } from "child_process";
import { screen, type BrowserWindow } from "electron";
import { loadConfig } from "../../config.js";
import { validatePath, type SafeHandleFn } from "../ipc.js";
import { getMainWindow } from "../state.js";

interface EmbedSession {
  id: string;
  replayPath: string;
  child: ChildProcess;
  commFile: string;
  /** The Dolphin shell window — what we float and resize over MAGI. */
  mainHwnd: bigint | null;
  /** The inner render panel — resized to fill main's client area so the
   *  toolbar/statusbar/listview underneath are obscured. */
  renderHwnd: bigint | null;
  parentHwnd: bigint | null;
  closed: boolean;
}

let activeSession: EmbedSession | null = null;

// Resolve Dolphin path + Melee ISO from config or auto-detect (mirrors logic
// in dolphin.ts so embedded mode shares the same discovery rules).
function resolveDolphinAndIso(): { dolphinPath: string; isoPath: string } {
  const config = loadConfig();
  const home = require("os").homedir();
  let dolphinPath = config.dolphinPath;

  if (!dolphinPath) {
    const candidates = [
      path.join(home, "AppData", "Roaming", "Slippi Launcher", "playback", "Slippi Dolphin.exe"),
      "C:\\Program Files\\Slippi Dolphin\\Slippi Dolphin.exe",
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        dolphinPath = c;
        break;
      }
    }
  }
  if (!dolphinPath || !fs.existsSync(dolphinPath)) {
    throw new Error("Slippi Dolphin not found. Set the Dolphin path in Settings.");
  }

  let isoPath: string | null = null;
  if (config.meleeIsoPath && fs.existsSync(config.meleeIsoPath)) {
    isoPath = config.meleeIsoPath;
  }
  if (!isoPath) {
    try {
      const slippiSettings = path.join(home, "AppData/Roaming/Slippi Launcher/Settings");
      if (fs.existsSync(slippiSettings)) {
        const parsed = JSON.parse(fs.readFileSync(slippiSettings, "utf-8"));
        if (parsed?.settings?.isoPath && fs.existsSync(parsed.settings.isoPath)) {
          isoPath = parsed.settings.isoPath;
        }
      }
    } catch (err) {
      console.warn(`[embed] Could not parse Slippi Launcher settings: ${err instanceof Error ? err.message : err}`);
    }
  }
  if (!isoPath) {
    throw new Error("Melee ISO not found. Set your Melee ISO path in Settings.");
  }

  return { dolphinPath, isoPath };
}

function writeCommFile(commFile: string, replayPath: string, startFrame: number | null): void {
  const seek = startFrame != null ? Math.max(0, Math.floor(startFrame)) : null;
  const data: Record<string, unknown> =
    seek != null
      ? {
          mode: "queue",
          queue: [{ path: replayPath, startFrame: seek }],
          isRealTimeMode: false,
          commandId: Math.random().toString(36).slice(2) + Date.now().toString(36),
        }
      : {
          mode: "normal",
          replay: replayPath,
          isRealTimeMode: false,
          commandId: Math.random().toString(36).slice(2) + Date.now().toString(36),
        };
  fs.writeFileSync(commFile, JSON.stringify(data));
}

function killSession(session: EmbedSession): void {
  if (session.closed) return;
  session.closed = true;

  // Detach the stderr listener so it stops appending after teardown.
  try {
    session.child.stderr?.removeAllListeners("data");
  } catch {
    /* stream already gone */
  }

  // Try graceful close first via WM_CLOSE on the shell. Killing the shell
  // tears down all child HWNDs (including any render panel we reparented
  // into MAGI), so this is sufficient.
  if (process.platform === "win32" && session.mainHwnd != null) {
    try {
      const { requestClose } = require("../native/win32Embed.js") as typeof import("../native/win32Embed.js");
      requestClose(session.mainHwnd);
    } catch {
      /* fall through to kill */
    }
  }

  // Hard kill if still alive after a moment.
  setTimeout(() => {
    try {
      if (!session.child.killed) session.child.kill();
    } catch {
      /* already gone */
    }
  }, 500);

  try {
    fs.unlinkSync(session.commFile);
  } catch {
    /* best-effort */
  }
}

interface OpenArgs {
  replayPath: string;
  /**
   * Stage rect bounds in physical pixels, expressed in MAGI renderer's
   * client coords (origin at top-left of MAGI's content area). Main
   * process converts to screen coords using MAGI's content-bounds origin
   * before pinning Dolphin.
   */
  bounds: { x: number; y: number; width: number; height: number };
  startFrame?: number;
}

/**
 * Convert client-area physical pixels (as the renderer sends them — already
 * `getBoundingClientRect() * devicePixelRatio`) into screen-space physical
 * pixels relative to the primary display origin.
 *
 * Electron's `getContentBounds()` is in DIPs, so we multiply by the display
 * scale factor to add a physical-pixel origin to the renderer's already-
 * physical client offset.
 */
function clientToScreen(
  win: BrowserWindow,
  bounds: { x: number; y: number; width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const cb = win.getContentBounds();
  const display = screen.getDisplayMatching(cb);
  const sf = display.scaleFactor;
  return {
    x: Math.round(cb.x * sf + bounds.x),
    y: Math.round(cb.y * sf + bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  };
}

interface OpenResult {
  embedded: boolean;
  sessionId?: string;
  reason?: string;
}

async function spawnEmbedSession(
  replayPath: string,
  bounds: { x: number; y: number; width: number; height: number },
  startFrame: number,
): Promise<OpenResult> {
  const mainWindow = getMainWindow();
  if (!mainWindow) throw new Error("Main window unavailable");

  const { dolphinPath, isoPath } = resolveDolphinAndIso();

  const commFile = path.join(require("os").tmpdir(), `magi-embed-${Date.now()}.json`);
  writeCommFile(commFile, replayPath, startFrame);

  const child = spawn(dolphinPath, ["-b", "-e", isoPath, "-i", commFile], {
    detached: false,
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: false,
  });

  if (child.pid == null) {
    throw new Error("Failed to spawn Dolphin");
  }

  // Dolphin can log heavily over a long playback; keep only the tail so the
  // buffer can't grow without bound for the lifetime of the session.
  const STDERR_CAP = 16_384;
  let stderrBuf = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderrBuf += chunk.toString();
    if (stderrBuf.length > STDERR_CAP) stderrBuf = stderrBuf.slice(-STDERR_CAP);
  });

  const sessionId = `s_${child.pid}_${Date.now()}`;
  const session: EmbedSession = {
    id: sessionId,
    replayPath,
    child,
    commFile,
    renderHwnd: null,
    mainHwnd: null,
    parentHwnd: null,
    closed: false,
  };
  activeSession = session;

  child.on("exit", () => {
    if (activeSession?.id === sessionId && !activeSession.closed) {
      const win = getMainWindow();
      win?.webContents.send("replay:embed:exited", { sessionId, stderr: stderrBuf });
      activeSession = null;
    }
  });

  const { findDolphinWindows, bufferToHwnd, floatOver, coverShellWithRender } =
    require("../native/win32Embed.js") as typeof import("../native/win32Embed.js");

  findDolphinWindows(child.pid, 20000)
    .then((dolphinWindows) => {
      // Bail if this session was torn down or superseded while we waited for
      // Dolphin's windows to appear (rapid open/close or re-open).
      if (session.closed || activeSession?.id !== sessionId) return;
      const parentHandleBuf = mainWindow.getNativeWindowHandle();
      const parentHwnd = bufferToHwnd(parentHandleBuf);
      session.mainHwnd = dolphinWindows.mainHwnd;
      session.renderHwnd = dolphinWindows.renderIsChild ? dolphinWindows.renderHwnd : dolphinWindows.mainHwnd;
      session.parentHwnd = parentHwnd;
      const screenBounds = clientToScreen(mainWindow, bounds);
      floatOver(
        parentHwnd,
        dolphinWindows.mainHwnd,
        screenBounds.x,
        screenBounds.y,
        screenBounds.width,
        screenBounds.height,
      );
      if (dolphinWindows.renderIsChild) {
        coverShellWithRender(dolphinWindows.mainHwnd, dolphinWindows.renderHwnd);
      }
      const win = getMainWindow();
      win?.webContents.send("replay:embed:ready", { sessionId });
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      const win = getMainWindow();
      win?.webContents.send("replay:embed:error", { sessionId, message: msg });
      killSession(session);
      if (activeSession?.id === sessionId) {
        activeSession = null;
      }
    });

  return { embedded: true, sessionId };
}

export function registerEmbeddedReplayHandlers(safeHandle: SafeHandleFn): void {
  safeHandle("replay:embed:open", async (_e, args: OpenArgs): Promise<OpenResult> => {
    if (process.platform !== "win32") {
      return { embedded: false, reason: "Embedded playback is only supported on Windows" };
    }

    const safeReplayPath = validatePath(args.replayPath);

    if (activeSession) {
      killSession(activeSession);
      activeSession = null;
    }

    return spawnEmbedSession(safeReplayPath, args.bounds, args.startFrame ?? 0);
  });

  safeHandle(
    "replay:embed:setBounds",
    async (_e, sessionId: string, bounds: { x: number; y: number; width: number; height: number }) => {
      if (process.platform !== "win32") return false;
      if (!activeSession || activeSession.id !== sessionId || !activeSession.mainHwnd) return false;
      const win = getMainWindow();
      if (!win) return false;
      const { setFloatBounds, refitRender } =
        require("../native/win32Embed.js") as typeof import("../native/win32Embed.js");
      const screenBounds = clientToScreen(win, bounds);
      setFloatBounds(activeSession.mainHwnd, screenBounds.x, screenBounds.y, screenBounds.width, screenBounds.height);
      // Re-stretch the inner render panel to fill the resized main client.
      if (activeSession.renderHwnd && activeSession.renderHwnd !== activeSession.mainHwnd) {
        refitRender(activeSession.mainHwnd, activeSession.renderHwnd);
      }
      return true;
    },
  );

  safeHandle("replay:embed:close", async (_e, sessionId: string) => {
    if (!activeSession || activeSession.id !== sessionId) return false;
    killSession(activeSession);
    activeSession = null;
    return true;
  });

  safeHandle("replay:embed:sendKey", async (_e, sessionId: string, vk: number) => {
    if (!activeSession || activeSession.id !== sessionId || !activeSession.mainHwnd) return false;
    const { sendKey } = require("../native/win32Embed.js") as typeof import("../native/win32Embed.js");
    // Dolphin hotkeys (like arrow keys for frame advance) are registered on the main window.
    sendKey(activeSession.mainHwnd, vk);
    return true;
  });
}

/** Tear down on app quit so we don't leak a Dolphin child process. */
export function shutdownEmbeddedReplay(): void {
  if (activeSession) {
    killSession(activeSession);
    activeSession = null;
  }
}
