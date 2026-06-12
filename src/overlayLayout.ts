/** Overlay toast dimensions and placement — pure math, no Electron imports. */

export const OVERLAY_WIDTH = 400;
export const OVERLAY_HEIGHT = 480;
export const OVERLAY_MARGIN = 16;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Bottom-right corner of the given display work area, inset by OVERLAY_MARGIN.
 *  Clamped so the result never falls left of or above the work-area origin. */
export function computeOverlayBounds(workArea: Rect): Rect {
  return {
    x: workArea.x + Math.max(0, workArea.width - OVERLAY_WIDTH - OVERLAY_MARGIN),
    y: workArea.y + Math.max(0, workArea.height - OVERLAY_HEIGHT - OVERLAY_MARGIN),
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
  };
}
