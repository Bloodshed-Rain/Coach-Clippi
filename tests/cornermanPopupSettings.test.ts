import { describe, expect, it } from "vitest";
import {
  DEFAULT_CORNERMAN_POPUP_SETTINGS,
  normalizeCornermanPopupAutoHideSeconds,
  normalizeCornermanPopupLiveAlerts,
  resolveCornermanPopupSettings,
  shouldShowCornermanLiveAlert,
} from "../src/cornermanPopupSettings";

describe("cornerman popup settings", () => {
  it("uses defaults for missing values", () => {
    expect(resolveCornermanPopupSettings({})).toEqual(DEFAULT_CORNERMAN_POPUP_SETTINGS);
  });

  it("normalizes live alert modes", () => {
    expect(normalizeCornermanPopupLiveAlerts("all")).toBe("all");
    expect(normalizeCornermanPopupLiveAlerts("high")).toBe("high");
    expect(normalizeCornermanPopupLiveAlerts("off")).toBe("off");
    expect(normalizeCornermanPopupLiveAlerts("rare-only")).toBe(DEFAULT_CORNERMAN_POPUP_SETTINGS.liveAlerts);
  });

  it("clamps auto-hide seconds", () => {
    expect(normalizeCornermanPopupAutoHideSeconds(-1)).toBe(0);
    expect(normalizeCornermanPopupAutoHideSeconds(7.4)).toBe(7);
    expect(normalizeCornermanPopupAutoHideSeconds(999)).toBe(120);
    expect(normalizeCornermanPopupAutoHideSeconds(null)).toBe(DEFAULT_CORNERMAN_POPUP_SETTINGS.autoHideSeconds);
  });

  it("filters live alerts by mode and importance", () => {
    expect(shouldShowCornermanLiveAlert("all", "info")).toBe(true);
    expect(shouldShowCornermanLiveAlert("all", "high")).toBe(true);
    expect(shouldShowCornermanLiveAlert("high", "info")).toBe(false);
    expect(shouldShowCornermanLiveAlert("high", "high")).toBe(true);
    expect(shouldShowCornermanLiveAlert("off", "high")).toBe(false);
  });
});
