/** Overlay toast dimensions and placement — pure math, no Electron imports. */

export const OVERLAY_WIDTH = 400;
export const OVERLAY_HEIGHT = 480;
export const OVERLAY_MIN_WIDTH = 320;
export const OVERLAY_MIN_HEIGHT = 260;
export const OVERLAY_MARGIN = 16;
export const OVERLAY_RIGHT_MARGIN = 4;

export type OverlayCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type OverlayResizeHandle = OverlayCorner;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlaySize {
  width: number;
  height: number;
}

const DEFAULT_CORNER: OverlayCorner = "bottom-right";

export function normalizeOverlayCorner(value: unknown): OverlayCorner {
  return value === "top-left" || value === "top-right" || value === "bottom-left" || value === "bottom-right"
    ? value
    : DEFAULT_CORNER;
}

export function normalizeOverlaySize(value: unknown): OverlaySize {
  const candidate = value && typeof value === "object" ? (value as Partial<OverlaySize>) : {};
  const width =
    typeof candidate.width === "number" && Number.isFinite(candidate.width)
      ? Math.round(candidate.width)
      : OVERLAY_WIDTH;
  const height =
    typeof candidate.height === "number" && Number.isFinite(candidate.height)
      ? Math.round(candidate.height)
      : OVERLAY_HEIGHT;

  return {
    width: Math.max(OVERLAY_MIN_WIDTH, width),
    height: Math.max(OVERLAY_MIN_HEIGHT, height),
  };
}

export function isOverlayResizeHandle(value: unknown): value is OverlayResizeHandle {
  return value === "top-left" || value === "top-right" || value === "bottom-left" || value === "bottom-right";
}

/** Bottom-right corner of the given display work area, inset by the overlay margins.
 *  Clamped so the result never falls left of or above the work-area origin. */
export function computeOverlayBounds(workArea: Rect, options: { corner?: unknown; size?: unknown } = {}): Rect {
  const corner = normalizeOverlayCorner(options.corner);
  const { width, height } = normalizeOverlaySize(options.size);
  const xOffset = corner.endsWith("right") ? workArea.width - width - OVERLAY_RIGHT_MARGIN : OVERLAY_MARGIN;
  const yOffset = corner.startsWith("bottom") ? workArea.height - height - OVERLAY_MARGIN : OVERLAY_MARGIN;

  return {
    x: workArea.x + Math.max(0, xOffset),
    y: workArea.y + Math.max(0, yOffset),
    width,
    height,
  };
}

function distanceSquared(a: Rect, b: Rect): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function snapOverlayBoundsToCorner(bounds: Rect, workArea: Rect): { bounds: Rect; corner: OverlayCorner } {
  const size = normalizeOverlaySize(bounds);
  const corners: OverlayCorner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
  let bestCorner = corners[0]!;
  let bestBounds = computeOverlayBounds(workArea, { corner: bestCorner, size });
  let bestDistance = distanceSquared(bounds, bestBounds);

  for (const corner of corners.slice(1)) {
    const candidate = computeOverlayBounds(workArea, { corner, size });
    const distance = distanceSquared(bounds, candidate);
    if (distance < bestDistance) {
      bestCorner = corner;
      bestBounds = candidate;
      bestDistance = distance;
    }
  }

  return { bounds: bestBounds, corner: bestCorner };
}

export function resizeOverlayBounds(bounds: Rect, handle: OverlayResizeHandle, deltaX: number, deltaY: number): Rect {
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  let x = bounds.x;
  let y = bounds.y;
  let width = bounds.width;
  let height = bounds.height;

  if (handle.endsWith("left")) {
    const nextX = bounds.x + deltaX;
    width = Math.max(OVERLAY_MIN_WIDTH, right - nextX);
    x = right - width;
  } else {
    width = Math.max(OVERLAY_MIN_WIDTH, bounds.width + deltaX);
  }

  if (handle.startsWith("top")) {
    const nextY = bounds.y + deltaY;
    height = Math.max(OVERLAY_MIN_HEIGHT, bottom - nextY);
    y = bottom - height;
  } else {
    height = Math.max(OVERLAY_MIN_HEIGHT, bounds.height + deltaY);
  }

  return { x, y, width, height };
}
