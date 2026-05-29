// Shared primitives for the embedded-Dolphin surfaces (ReplayPlayer floating
// modal + ReplayEmbed inline panel). Both compute stage bounds identically and
// drive Dolphin's pause/play via the same virtual-key code.

export type Bounds = { x: number; y: number; width: number; height: number };

/**
 * Compute the screen-space bounds (physical pixels, relative to MAGI's
 * top-level HWND client area) that Dolphin should be repositioned into.
 */
export function getStageBounds(el: HTMLElement): Bounds {
  const r = el.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return {
    x: Math.round(r.left * dpr),
    y: Math.round(r.top * dpr),
    width: Math.round(r.width * dpr),
    height: Math.round(r.height * dpr),
  };
}

/** Win32 virtual-key code for Space — Dolphin's pause/play hotkey. */
export const VK_SPACE = 0x20;
