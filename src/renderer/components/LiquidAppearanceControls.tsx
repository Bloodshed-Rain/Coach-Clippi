import { useCallback, useEffect, useRef } from "react";
import {
  LIQUID_APPEARANCE_RANGES,
  resolveLiquidAppearanceSettings,
  type LiquidAppearanceSettings,
} from "../../liquidAppearance";
import { useGlobalStore } from "../stores/useGlobalStore";

type LiquidAppearanceKey = keyof LiquidAppearanceSettings;

interface LiquidAppearanceControl {
  key: LiquidAppearanceKey;
  label: string;
  unit: string;
}

interface LiquidAppearanceControlsProps {
  variant: "settings" | "tweaks";
}

const CONTROLS: LiquidAppearanceControl[] = [
  { key: "liquidCharacterVisibility", label: "Character visibility", unit: "%" },
  { key: "liquidCardOpacity", label: "Card opacity", unit: "%" },
  { key: "liquidCardBlur", label: "Card blur", unit: "px" },
];

export function LiquidAppearanceControls({ variant }: LiquidAppearanceControlsProps) {
  const liquidAppearance = useGlobalStore((state) => state.liquidAppearance);
  const setLiquidAppearance = useGlobalStore((state) => state.setLiquidAppearance);
  const saveTimerRef = useRef<number | null>(null);
  const pendingSaveRef = useRef<LiquidAppearanceSettings | null>(null);

  const queueSave = useCallback((next: LiquidAppearanceSettings) => {
    pendingSaveRef.current = next;

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      if (pendingSaveRef.current) {
        window.clippi.saveConfig(pendingSaveRef.current).catch(() => {});
        pendingSaveRef.current = null;
      }
      saveTimerRef.current = null;
    }, 250);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      if (pendingSaveRef.current) {
        window.clippi.saveConfig(pendingSaveRef.current).catch(() => {});
        pendingSaveRef.current = null;
      }
    };
  }, []);

  const handleChange = (key: LiquidAppearanceKey, value: number) => {
    const next = resolveLiquidAppearanceSettings({ ...liquidAppearance, [key]: value });
    setLiquidAppearance(next);
    queueSave(next);
  };

  return (
    <div className={variant === "settings" ? "liquid-appearance-controls" : "tweaks-slider-list"}>
      {CONTROLS.map((control) => {
        const range = LIQUID_APPEARANCE_RANGES[control.key];
        const value = liquidAppearance[control.key];
        const inputId = `${variant}-${control.key}`;
        const displayValue = control.unit === "%" ? `${value}%` : `${value}px`;

        if (variant === "tweaks") {
          return (
            <div key={control.key} className="tweaks-slider">
              <div className="tweaks-slider-head">
                <label htmlFor={inputId}>{control.label}</label>
                <span>{displayValue}</span>
              </div>
              <input
                id={inputId}
                className="tweaks-range"
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={value}
                onChange={(event) => handleChange(control.key, Number(event.target.value))}
              />
            </div>
          );
        }

        return (
          <div key={control.key} className="settings-field liquid-appearance-field">
            <label htmlFor={inputId}>{control.label}</label>
            <div className="settings-row settings-row-center">
              <input
                id={inputId}
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={value}
                onChange={(event) => handleChange(control.key, Number(event.target.value))}
              />
              <span className="settings-mono-value">{displayValue}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
