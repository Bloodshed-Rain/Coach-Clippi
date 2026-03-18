export interface Theme {
  id: string;
  name: string;
  bg: string;
  bgCard: string;
  bgHover: string;
  border: string;
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
}

// Coach-Clippi brand colors from coachclippi.com
// Accent green: #73f0a0 / #44d080 / #21BA45

export const THEMES: Record<string, Theme> = {
  dark: {
    id: "dark", name: "Dark",
    bg: "#0a0a0c", bgCard: "#111116", bgHover: "#18181f", border: "#2a2a35",
    text: "#e8e6e3", textDim: "#8a8a96", textTitle: "#73f0a0", textLabel: "#44d080",
    accent: "#44d080", accentDim: "#38b86c", accentGlow: "rgba(68,208,128,0.08)",
    secondary: "#73f0a0", secondaryDim: "#44d080",
    green: "#44d080", red: "#ff4060", yellow: "#ffb040",
    sidebarBg: "#08080a", sidebarAccent: "#44d080",
    gradientStart: "rgba(68,208,128,0.03)", gradientEnd: "rgba(68,208,128,0.0)",
    defaultMode: "dark",
  },

  light: {
    id: "light", name: "Light",
    bg: "#f4f5f7", bgCard: "#ffffff", bgHover: "#eeeef2", border: "#d8d8e0",
    text: "#1a1a2e", textDim: "#6e6e82", textTitle: "#1a8a48", textLabel: "#2a9d58",
    accent: "#2a9d58", accentDim: "#1a8a48", accentGlow: "rgba(42,157,88,0.08)",
    secondary: "#1a8a48", secondaryDim: "#147038",
    green: "#16a34a", red: "#dc2626", yellow: "#ca8a04",
    sidebarBg: "#eeeef2", sidebarAccent: "#2a9d58",
    gradientStart: "rgba(42,157,88,0.04)", gradientEnd: "rgba(42,157,88,0.0)",
    defaultMode: "light",
  },
};

export const THEME_ORDER = ["dark", "light"];

export type ColorMode = "dark" | "light";

export function getResolvedTheme(themeId: string, mode: ColorMode): Theme {
  // With only two themes, just return the matching mode
  return THEMES[mode] ?? THEMES["dark"]!;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--bg-card", theme.bgCard);
  root.style.setProperty("--bg-hover", theme.bgHover);
  root.style.setProperty("--border", theme.border);
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
}
