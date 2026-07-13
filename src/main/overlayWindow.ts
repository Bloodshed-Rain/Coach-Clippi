import { BrowserWindow, screen } from "electron";
import * as path from "path";
import {
  computeOverlayBounds,
  normalizeOverlayCorner,
  normalizeOverlaySize,
  OVERLAY_MIN_HEIGHT,
  OVERLAY_MIN_WIDTH,
  isOverlayResizeHandle,
  resizeOverlayBounds,
  snapOverlayBoundsToCorner,
  type OverlayResizeHandle,
} from "../overlayLayout.js";
import { loadConfig, saveConfig } from "../config.js";

let overlayWindow: BrowserWindow | null = null;
let snapTimer: NodeJS.Timeout | null = null;
let topmostTimer: NodeJS.Timeout | null = null;
let listeningForDisplayChanges = false;
let snapping = false;
let manualResizing = false;

// webContents.send is fire-and-forget: anything sent before the overlay
// renderer has mounted its IPC listeners is silently dropped. Queue sends
// until the renderer signals readiness (cornerman:overlay-ready), then flush.
let overlayRendererReady = false;
let pendingOverlaySends: { channel: string; args: unknown[] }[] = [];

const TOPMOST_REFRESH_MS = 1500;
const MAX_PENDING_OVERLAY_SENDS = 200;

function reinforceOverlayTopmost(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  try {
    win.setAlwaysOnTop(true, "screen-saver", 1);
  } catch {
    try {
      win.setAlwaysOnTop(true, "screen-saver");
    } catch {
      // Best-effort; some platforms/window managers reject specific levels.
    }
  }

  try {
    win.moveTop();
  } catch {
    // Best-effort; the window may be hidden or the platform may ignore it.
  }
}

function startTopmostRefresh(win: BrowserWindow): void {
  stopTopmostRefresh();
  reinforceOverlayTopmost(win);
  topmostTimer = setInterval(() => reinforceOverlayTopmost(win), TOPMOST_REFRESH_MS);
  topmostTimer.unref?.();
}

function stopTopmostRefresh(): void {
  if (!topmostTimer) return;
  clearInterval(topmostTimer);
  topmostTimer = null;
}

function handleDisplayChanged(): void {
  const win = getOverlayWindow();
  if (!win || snapping || manualResizing) return;
  // Never resize the window while it's hidden (see showOverlayWindow) — the
  // next show snaps it anyway.
  if (!win.isVisible()) return;
  snapAndSave(win);
  reinforceOverlayTopmost(win);
}

function addDisplayChangeListeners(): void {
  if (listeningForDisplayChanges) return;
  screen.on("display-added", handleDisplayChanged);
  screen.on("display-removed", handleDisplayChanged);
  screen.on("display-metrics-changed", handleDisplayChanged);
  listeningForDisplayChanges = true;
}

function removeDisplayChangeListeners(): void {
  if (!listeningForDisplayChanges) return;
  screen.off("display-added", handleDisplayChanged);
  screen.off("display-removed", handleDisplayChanged);
  screen.off("display-metrics-changed", handleDisplayChanged);
  listeningForDisplayChanges = false;
}

/** DIP↔physical rounding at fractional scale factors (e.g. 150%) makes
 *  setBounds/getBounds round-trips drift by ~1px, so an "unchanged" snap is
 *  never exactly equal. Deltas at or below this are noise, not real moves. */
const SNAP_TOLERANCE_PX = 2;

function boundsWithinTolerance(a: Electron.Rectangle, b: Electron.Rectangle): boolean {
  return (
    Math.abs(a.x - b.x) <= SNAP_TOLERANCE_PX &&
    Math.abs(a.y - b.y) <= SNAP_TOLERANCE_PX &&
    Math.abs(a.width - b.width) <= SNAP_TOLERANCE_PX &&
    Math.abs(a.height - b.height) <= SNAP_TOLERANCE_PX
  );
}

function snapAndSave(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  const current = win.getBounds();
  const display = screen.getDisplayMatching(current);
  const snapped = snapOverlayBoundsToCorner(current, display.workArea);

  // Rounding-noise snaps must be skipped, not just to avoid config churn:
  // resizing this window while it's hidden helps put it in the
  // invisible-but-click-blocking state described above showOverlayWindow().
  if (boundsWithinTolerance(current, snapped.bounds)) return;

  snapping = true;
  win.setBounds(snapped.bounds);
  setTimeout(() => {
    snapping = false;
  }, 0);

  try {
    saveConfig({
      cornermanOverlayCorner: snapped.corner,
      cornermanOverlaySize: { width: snapped.bounds.width, height: snapped.bounds.height },
    });
  } catch {
    // Position persistence is best-effort.
  }
}

function scheduleSnapAndSave(win: BrowserWindow): void {
  if (snapping || manualResizing || win.isDestroyed()) return;
  if (snapTimer) clearTimeout(snapTimer);
  snapTimer = setTimeout(() => {
    snapTimer = null;
    snapAndSave(win);
  }, 180);
}

/** Create the hidden overlay toast window (idempotent). Called on cornerman:start
 *  so the renderer is already loaded by the time the first card streams. */
export function ensureOverlayWindow(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) return;

  const config = loadConfig();
  const bounds = computeOverlayBounds(screen.getPrimaryDisplay().workArea, {
    corner: normalizeOverlayCorner(config.cornermanOverlayCorner),
    size: normalizeOverlaySize(config.cornermanOverlaySize),
  });

  overlayWindow = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    roundedCorners: false,
    resizable: true,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    minWidth: OVERLAY_MIN_WIDTH,
    minHeight: OVERLAY_MIN_HEIGHT,
    skipTaskbar: true,
    focusable: false,
    title: "MAGI Cornerman",
    webPreferences: {
      preload: process.env["VITE_DEV_SERVER_URL"]
        ? path.resolve(__dirname, "../../dist/main/preload/index.js")
        : path.resolve(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // matches the main window — preload uses require()
    },
  });

  overlayRendererReady = false;
  pendingOverlaySends = [];

  reinforceOverlayTopmost(overlayWindow);

  // Warm-up cycle — deliberately burn the window's FIRST OS-level show while
  // it is still a blank transparent surface (nothing to see, focusable:false,
  // skipTaskbar). On Win11 the first show of a transparent window is fragile:
  // paired with nearby setBounds/setAlwaysOnTop/moveTop calls it composites as
  // permanently INVISIBLE while still swallowing mouse input. Re-shows after a
  // hide are robust (verified empirically, incl. recovery from the broken
  // state), so this makes every user-visible show a re-show.
  overlayWindow.showInactive();
  overlayWindow.hide();

  overlayWindow.setFullScreenable(false);
  if (process.platform !== "win32") {
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  addDisplayChangeListeners();

  // A full reload (Vite HMR, crash recovery) tears the listeners down; queue
  // again until the remounted renderer re-signals readiness.
  overlayWindow.webContents.on("did-start-loading", () => {
    overlayRendererReady = false;
  });

  // Block navigation, but allow Vite HMR full-reloads in dev (same pattern as
  // createWindow() in index.ts — blanket-prevent would break hot reloads of the
  // overlay route during development).
  overlayWindow.webContents.on("will-navigate", (event, url) => {
    const devServer = process.env["VITE_DEV_SERVER_URL"];
    if (devServer) {
      // Allow Vite HMR full reloads of this window's own URL (hash included) and Vite internals.
      if (url.startsWith(devServer) || url.includes("/@vite")) {
        return;
      }
    }
    // Allow the initial file:// load in production
    if (url.startsWith("file://") && url.includes("/dist/renderer/index.html")) {
      return;
    }
    event.preventDefault();
  });

  // Single-purpose surface: never open child windows.
  overlayWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  if (process.env["VITE_DEV_SERVER_URL"]) {
    overlayWindow.loadURL(`${process.env["VITE_DEV_SERVER_URL"]}#/overlay`);
  } else {
    overlayWindow.loadFile(path.join(__dirname, "../../../dist/renderer/index.html"), { hash: "/overlay" });
  }

  const win = overlayWindow;
  win.on("move", () => scheduleSnapAndSave(win));
  win.on("resize", () => scheduleSnapAndSave(win));
  win.on("hide", () => stopTopmostRefresh());
  win.on("closed", () => {
    if (snapTimer) {
      clearTimeout(snapTimer);
      snapTimer = null;
    }
    stopTopmostRefresh();
    clearPostShowTimer();
    showQueuedForLoad = false;
    removeDisplayChangeListeners();
    if (overlayWindow === win) {
      overlayWindow = null;
      overlayRendererReady = false;
      pendingOverlaySends = [];
    }
  });
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow && !overlayWindow.isDestroyed() ? overlayWindow : null;
}

/** Send to the overlay renderer, queueing while it hasn't mounted listeners yet. */
export function sendToOverlay(channel: string, ...args: unknown[]): void {
  const win = getOverlayWindow();
  if (!win) return;
  if (!overlayRendererReady) {
    if (pendingOverlaySends.length < MAX_PENDING_OVERLAY_SENDS) {
      pendingOverlaySends.push({ channel, args });
    }
    return;
  }
  try {
    win.webContents.send(channel, ...args);
  } catch {
    // window may be mid-teardown
  }
}

/** Called by the overlay renderer once its IPC listeners are mounted. */
export function markOverlayRendererReady(): void {
  overlayRendererReady = true;
  const win = getOverlayWindow();
  const queued = pendingOverlaySends;
  pendingOverlaySends = [];
  if (!win) return;
  for (const { channel, args } of queued) {
    try {
      win.webContents.send(channel, ...args);
    } catch {
      break;
    }
  }
}

export function resizeOverlayWindow(handle: unknown, deltaX: unknown, deltaY: unknown): boolean {
  const win = getOverlayWindow();
  if (!win || !isOverlayResizeHandle(handle)) return false;
  const dx = typeof deltaX === "number" && Number.isFinite(deltaX) ? deltaX : 0;
  const dy = typeof deltaY === "number" && Number.isFinite(deltaY) ? deltaY : 0;

  manualResizing = true;
  win.setBounds(resizeOverlayBounds(win.getBounds(), handle as OverlayResizeHandle, dx, dy));
  return true;
}

export function finishOverlayResize(): boolean {
  const win = getOverlayWindow();
  manualResizing = false;
  if (!win) return false;
  snapAndSave(win);
  return true;
}

// The first showInactive() of this transparent window is fragile (verified
// empirically on Win11 + 150% scaling, Electron 41): any other window op —
// setBounds, setAlwaysOnTop, moveTop — issued just before or in the same tick
// leaves the window composited as fully INVISIBLE while it still intercepts
// mouse input (an unclickable dead zone). webContents.invalidate() and resize
// jiggles do not recover it; only hide + bare re-show does. So the show must
// be bare: content loaded first, snap/topmost deferred to a later tick.
let showQueuedForLoad = false;
let postShowTimer: NodeJS.Timeout | null = null;

const POST_SHOW_ADJUST_MS = 400;

function clearPostShowTimer(): void {
  if (!postShowTimer) return;
  clearTimeout(postShowTimer);
  postShowTimer = null;
}

function performShow(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  if (win.isVisible()) {
    // Already composited — snapping and reinforcing a visible window is safe.
    snapAndSave(win);
    startTopmostRefresh(win);
    return;
  }

  win.showInactive(); // bare — nothing else this tick (see note above)
  clearPostShowTimer();
  postShowTimer = setTimeout(() => {
    postShowTimer = null;
    const stillShown = getOverlayWindow();
    if (!stillShown || !stillShown.isVisible()) return;
    snapAndSave(stillShown);
    startTopmostRefresh(stillShown);
  }, POST_SHOW_ADJUST_MS);
  postShowTimer.unref?.();
}

/** Show without stealing focus from the game. */
export function showOverlayWindow(): void {
  const win = getOverlayWindow();
  if (!win) return;

  // Never show before the renderer has content: a transparent window with no
  // paint is exactly the invisible click-blocker we're avoiding. Note:
  // isLoading() is still true inside did-finish-load handlers, so the queued
  // show must go straight to performShow rather than re-entering this check.
  if (!win.isVisible() && win.webContents.isLoading()) {
    if (showQueuedForLoad) return;
    showQueuedForLoad = true;
    win.webContents.once("did-finish-load", () => {
      showQueuedForLoad = false;
      if (getOverlayWindow() === win) performShow(win);
    });
    return;
  }

  performShow(win);
}

export function hideOverlayWindow(): void {
  stopTopmostRefresh();
  clearPostShowTimer();
  getOverlayWindow()?.hide();
}

export function destroyOverlayWindow(): void {
  const win = getOverlayWindow();
  overlayWindow = null;
  stopTopmostRefresh();
  clearPostShowTimer();
  showQueuedForLoad = false;
  removeDisplayChangeListeners();
  win?.destroy();
}
