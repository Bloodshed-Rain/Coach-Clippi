export interface LiquidAppearanceSettings {
  liquidCharacterVisibility: number;
  liquidCardOpacity: number;
  liquidCardBlur: number;
}

export const DEFAULT_LIQUID_APPEARANCE: LiquidAppearanceSettings = {
  liquidCharacterVisibility: 100,
  liquidCardOpacity: 32,
  liquidCardBlur: 9,
};

export const LIQUID_APPEARANCE_RANGES = {
  liquidCharacterVisibility: { min: 0, max: 160, step: 5 },
  liquidCardOpacity: { min: 15, max: 75, step: 1 },
  liquidCardBlur: { min: 0, max: 24, step: 1 },
} as const;

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

export function resolveLiquidAppearanceSettings(config: Partial<LiquidAppearanceSettings>): LiquidAppearanceSettings {
  return {
    liquidCharacterVisibility: clampNumber(
      config.liquidCharacterVisibility,
      LIQUID_APPEARANCE_RANGES.liquidCharacterVisibility.min,
      LIQUID_APPEARANCE_RANGES.liquidCharacterVisibility.max,
      DEFAULT_LIQUID_APPEARANCE.liquidCharacterVisibility,
    ),
    liquidCardOpacity: clampNumber(
      config.liquidCardOpacity,
      LIQUID_APPEARANCE_RANGES.liquidCardOpacity.min,
      LIQUID_APPEARANCE_RANGES.liquidCardOpacity.max,
      DEFAULT_LIQUID_APPEARANCE.liquidCardOpacity,
    ),
    liquidCardBlur: clampNumber(
      config.liquidCardBlur,
      LIQUID_APPEARANCE_RANGES.liquidCardBlur.min,
      LIQUID_APPEARANCE_RANGES.liquidCardBlur.max,
      DEFAULT_LIQUID_APPEARANCE.liquidCardBlur,
    ),
  };
}
