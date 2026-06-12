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
 *  Clamped so tiny work areas never push the window off the top-left. */
export function computeOverlayBounds(workArea: Rect): Rect {
  return {
    x: Math.max(workArea.x, workArea.x + workArea.width - OVERLAY_WIDTH - OVERLAY_MARGIN),
    y: Math.max(workArea.y, workArea.y + workArea.height - OVERLAY_HEIGHT - OVERLAY_MARGIN),
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
  };
}
