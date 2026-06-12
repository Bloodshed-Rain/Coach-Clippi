import { BrowserWindow, screen } from "electron";
import * as path from "path";
import { computeOverlayBounds } from "../overlayLayout.js";

let overlayWindow: BrowserWindow | null = null;

/** Create the hidden overlay toast window (idempotent). Called on cornerman:start
 *  so the renderer is already loaded by the time the first card streams. */
export function ensureOverlayWindow(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) return;

  const bounds = computeOverlayBounds(screen.getPrimaryDisplay().workArea);

  overlayWindow = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    transparent: true,
    resizable: false, // transparent + resizable is broken on Windows
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
  win.on("closed", () => {
    if (overlayWindow === win) overlayWindow = null;
  });
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow && !overlayWindow.isDestroyed() ? overlayWindow : null;
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
