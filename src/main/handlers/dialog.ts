import { BrowserWindow, dialog } from "electron";
import { getMainWindow } from "../state.js";
import type { SafeHandleFn } from "../ipc.js";

export function registerDialogHandlers(safeHandle: SafeHandleFn): void {
  safeHandle("dialog:openFolder", async () => {
    const win = BrowserWindow.getFocusedWindow() ?? getMainWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "Select Slippi Replay Folder",
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  safeHandle("dialog:openFile", async (_e, title: string, filters: { name: string; extensions: string[] }[]) => {
    const win = BrowserWindow.getFocusedWindow() ?? getMainWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      title,
      filters,
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
}
