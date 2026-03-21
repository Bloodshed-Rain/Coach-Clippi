import type { BrowserWindow } from "electron";

let mainWindow: BrowserWindow | null = null;
let fileWatcher: { close: () => void } | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win;
}

export function getFileWatcher(): { close: () => void } | null {
  return fileWatcher;
}

export function setFileWatcher(watcher: { close: () => void } | null): void {
  fileWatcher = watcher;
}
