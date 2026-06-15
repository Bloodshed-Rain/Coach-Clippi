export const DEFAULT_CORNERMAN_OVERLAY_TRANSPARENCY = 58;
export const MIN_CORNERMAN_OVERLAY_TRANSPARENCY = 15;
export const MAX_CORNERMAN_OVERLAY_TRANSPARENCY = 85;

export function clampCornermanOverlayTransparency(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_CORNERMAN_OVERLAY_TRANSPARENCY;
  return Math.min(
    MAX_CORNERMAN_OVERLAY_TRANSPARENCY,
    Math.max(MIN_CORNERMAN_OVERLAY_TRANSPARENCY, Math.round(numeric)),
  );
}

export function getCornermanOverlayAlphas(transparency: number): {
  toast: string;
  header: string;
  card: string;
} {
  const normalized = clampCornermanOverlayTransparency(transparency);
  const opacity = 1 - normalized / 100;

  return {
    toast: opacity.toFixed(2),
    header: Math.max(0.08, opacity * 0.34).toFixed(2),
    card: Math.min(0.74, opacity + 0.06).toFixed(2),
  };
}
