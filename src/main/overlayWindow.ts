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
let snapping = false;
let manualResizing = false;

function snapAndSave(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  const display = screen.getDisplayMatching(win.getBounds());
  const snapped = snapOverlayBoundsToCorner(win.getBounds(), display.workArea);

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
    resizable: true,
    minWidth: OVERLAY_MIN_WIDTH,
    minHeight: OVERLAY_MIN_HEIGHT,
    skipTaskbar: true,
    focusable: true,
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

  // Float above borderless-windowed games. (Exclusive-fullscreen apps cannot be
  // overlaid by any OS window — known limitation.)
  overlayWindow.setAlwaysOnTop(true, "screen-saver");

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
  win.on("closed", () => {
    if (snapTimer) {
      clearTimeout(snapTimer);
      snapTimer = null;
    }
    if (overlayWindow === win) overlayWindow = null;
  });
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow && !overlayWindow.isDestroyed() ? overlayWindow : null;
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

/** Show without stealing focus from the game. */
export function showOverlayWindow(): void {
  const win = getOverlayWindow();
  if (win && !win.isVisible()) win.showInactive();
}

export function hideOverlayWindow(): void {
  getOverlayWindow()?.hide();
}

export function destroyOverlayWindow(): void {
  const win = getOverlayWindow();
  overlayWindow = null;
  win?.destroy();
}
