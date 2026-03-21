export interface Theme {
  id: string;
  name: string;
  bg: string;
  bgCard: string;
  bgElevated: string;
  bgHover: string;
  border: string;
  borderSubtle: string;
  text: string;
  textDim: string;
  textTitle: string;
  textLabel: string;
  accent: string;
  accentDim: string;
  accentGlow: string;
  secondary: string;
  secondaryDim: string;
  green: string;
  red: string;
  yellow: string;
  sidebarBg: string;
  sidebarAccent: string;
  gradientStart: string;
  gradientEnd: string;
  defaultMode: "dark" | "light";
  // Glass / plasma tokens
  bgGlass: string;
  bgGlassStrong: string;
  borderGlow: string;
  accentRgb: string;
  redRgb: string;
  greenRgb: string;
  yellowRgb: string;
  shimmer: string;
  plasmaA: string;
  plasmaB: string;
  plasmaC: string;
  surfaceNoise: string;
}

// MAGI brand colors — phosphor green palette
// Accent green: #73f0a0 / #44d080 / #21BA45

export const THEMES: Record<string, Theme> = {
  dark: {
    id: "dark", name: "Dark",
    bg: "#030408", bgCard: "#080a10", bgElevated: "#0c0e16", bgHover: "#12141e",
    border: "#141828", borderSubtle: "#0e1020",
    text: "#e0ddd6", textDim: "#484a5e", textTitle: "#73f0a0", textLabel: "#44d080",
    accent: "#44d080", accentDim: "#38b86c", accentGlow: "rgba(68,208,128,0.08)",
    secondary: "#73f0a0", secondaryDim: "#44d080",
    green: "#44d080", red: "#ff2050", yellow: "#ffb040",
    sidebarBg: "#020305", sidebarAccent: "#44d080",
    gradientStart: "rgba(68,208,128,0.02)", gradientEnd: "rgba(68,208,128,0.0)",
    defaultMode: "dark",
    bgGlass: "rgba(8,10,16,0.75)",
    bgGlassStrong: "rgba(8,10,16,0.92)",
    borderGlow: "rgba(68,208,128,0.12)",
    accentRgb: "68,208,128",
    redRgb: "255,32,80",
    greenRgb: "68,208,128",
    yellowRgb: "255,176,64",
    shimmer: "rgba(115,240,160,0.03)",
    plasmaA: "#44d080",
    plasmaB: "#22a0ff",
    plasmaC: "#a855f7",
    surfaceNoise: "rgba(255,255,255,0.01)",
  },

  light: {
    id: "light", name: "Light",
    bg: "#eef0f4", bgCard: "#ffffff", bgElevated: "#f4f5f8", bgHover: "#e4e6ee",
    border: "#c8ccd8", borderSubtle: "#dde0e8",
    text: "#1a1a2e", textDim: "#4a4a60", textTitle: "#1a8a48", textLabel: "#2a9d58",
    accent: "#2a9d58", accentDim: "#1a8a48", accentGlow: "rgba(42,157,88,0.08)",
    secondary: "#1a8a48", secondaryDim: "#147038",
    green: "#16a34a", red: "#dc2626", yellow: "#ca8a04",
    sidebarBg: "#e0e2ea", sidebarAccent: "#2a9d58",
    gradientStart: "rgba(42,157,88,0.03)", gradientEnd: "rgba(42,157,88,0.0)",
    defaultMode: "light",
    bgGlass: "rgba(255,255,255,0.75)",
    bgGlassStrong: "rgba(255,255,255,0.92)",
    borderGlow: "rgba(42,157,88,0.2)",
    accentRgb: "42,157,88",
    redRgb: "220,38,38",
    greenRgb: "22,163,74",
    yellowRgb: "202,138,4",
    shimmer: "rgba(42,157,88,0.04)",
    plasmaA: "#2a9d58",
    plasmaB: "#3b82f6",
    plasmaC: "#8b5cf6",
    surfaceNoise: "rgba(0,0,0,0.02)",
  },
};

export const THEME_ORDER = ["dark", "light"];

export type ColorMode = "dark" | "light";

export function getResolvedTheme(themeId: string, mode: ColorMode): Theme {
  return THEMES[mode] ?? THEMES["dark"]!;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--bg-card", theme.bgCard);
  root.style.setProperty("--bg-elevated", theme.bgElevated);
  root.style.setProperty("--bg-hover", theme.bgHover);
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--border-subtle", theme.borderSubtle);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--text-dim", theme.textDim);
  root.style.setProperty("--text-title", theme.textTitle);
  root.style.setProperty("--text-label", theme.textLabel);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-dim", theme.accentDim);
  root.style.setProperty("--accent-glow", theme.accentGlow);
  root.style.setProperty("--secondary", theme.secondary);
  root.style.setProperty("--secondary-dim", theme.secondaryDim);
  root.style.setProperty("--green", theme.green);
  root.style.setProperty("--red", theme.red);
  root.style.setProperty("--yellow", theme.yellow);
  root.style.setProperty("--sidebar-bg", theme.sidebarBg);
  root.style.setProperty("--sidebar-accent", theme.sidebarAccent);
  root.style.setProperty("--gradient-start", theme.gradientStart);
  root.style.setProperty("--gradient-end", theme.gradientEnd);
  // Glass / plasma tokens
  root.style.setProperty("--bg-glass", theme.bgGlass);
  root.style.setProperty("--bg-glass-strong", theme.bgGlassStrong);
  root.style.setProperty("--border-glow", theme.borderGlow);
  root.style.setProperty("--accent-rgb", theme.accentRgb);
  root.style.setProperty("--red-rgb", theme.redRgb);
  root.style.setProperty("--green-rgb", theme.greenRgb);
  root.style.setProperty("--yellow-rgb", theme.yellowRgb);
  root.style.setProperty("--shimmer", theme.shimmer);
  root.style.setProperty("--plasma-a", theme.plasmaA);
  root.style.setProperty("--plasma-b", theme.plasmaB);
  root.style.setProperty("--plasma-c", theme.plasmaC);
  root.style.setProperty("--surface-noise", theme.surfaceNoise);
}
