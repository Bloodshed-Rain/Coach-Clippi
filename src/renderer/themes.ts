export interface Theme {
  id: string;
  name: string;
  bg: string;
  surface1: string;
  surface2: string;
  surface3: string;
  border: string;
  borderSubtle: string;
  borderMuted: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentMuted: string;
  win: string;
  loss: string;
  caution: string;
  sidebarBg: string;
  sidebarHover: string;
  sidebarActiveBg: string;
  sidebarAccent: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  fontMono: string;
  fontSans: string;
  fontDisplay: string;
  easeSpring: string;
  easeOut: string;
}

/* ───────────────────────────────────────────────────────────────────────────
 * MAGI Theme Definitions
 *
 * Design rationale:
 *   - Deep Navy-Slate base: cleaner, "higher-tech" surfaces.
 *   - Electric Cyan/Indigo accents for higher energy.
 *   - Pure white/airy light mode for better legibility.
 * ─────────────────────────────────────────────────────────────────────────── */

export const THEMES: Record<string, Theme> = {
  dark: {
    id: "dark",
    name: "Dark",

    // Surfaces — deep navy-slate
    bg: "#0f172a",
    surface1: "#1e293b",
    surface2: "#334155",
    surface3: "#475569",

    // Borders
    border: "rgba(148, 163, 184, 0.1)",
    borderSubtle: "rgba(148, 163, 184, 0.05)",
    borderMuted: "rgba(148, 163, 184, 0.2)",

    // Typography
    text: "#f8fafc",
    textSecondary: "#cbd5e1",
    textMuted: "#64748b",

    // Accent — Electric Cyan
    accent: "#22d3ee",
    accentHover: "#06b6d4",
    accentMuted: "rgba(34, 211, 238, 0.15)",

    // Semantic
    win: "#4ade80",
    loss: "#f87171",
    caution: "#fbbf24",

    // Sidebar
    sidebarBg: "#0f172a",
    sidebarHover: "#1e293b",
    sidebarActiveBg: "rgba(34, 211, 238, 0.12)",
    sidebarAccent: "#22d3ee",

    // Shadows
    shadowSm: "0 1px 3px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25)",
    shadowMd: "0 4px 16px rgba(0,0,0,0.4)",
    shadowLg: "0 12px 40px rgba(0,0,0,0.5)",

    // Type stack
    fontMono: "'JetBrains Mono', 'Fira Code', monospace",
    fontSans: "'DM Sans', 'Inter', -apple-system, sans-serif",
    fontDisplay: "'Chakra Petch', 'DM Sans', -apple-system, sans-serif",

    // Motion
    easeSpring: "cubic-bezier(0.22, 1, 0.36, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  },

  light: {
    id: "light",
    name: "Light",

    // Surfaces — pure white and clean slate grays
    bg: "#ffffff",
    surface1: "#f8fafc",
    surface2: "#f1f5f9",
    surface3: "#e2e8f0",

    // Borders
    border: "rgba(15, 23, 42, 0.08)",
    borderSubtle: "rgba(15, 23, 42, 0.04)",
    borderMuted: "rgba(15, 23, 42, 0.14)",

    // Typography
    text: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#94a3b8",

    // Accent — Sky Blue
    accent: "#0ea5e9",
    accentHover: "#0284c7",
    accentMuted: "rgba(14, 165, 233, 0.1)",

    // Semantic
    win: "#22c55e",
    loss: "#ef4444",
    caution: "#f59e0b",

    // Sidebar (Stays dark for anchor)
    sidebarBg: "#0f172a",
    sidebarHover: "#1e293b",
    sidebarActiveBg: "rgba(34, 211, 238, 0.12)",
    sidebarAccent: "#22d3ee",

    // Shadows
    shadowSm: "0 1px 2px rgba(0,0,0,0.05)",
    shadowMd: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
    shadowLg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",

    // Type stack
    fontMono: "'JetBrains Mono', 'Fira Code', monospace",
    fontSans: "'DM Sans', 'Inter', -apple-system, sans-serif",
    fontDisplay: "'Chakra Petch', 'DM Sans', -apple-system, sans-serif",

    // Motion
    easeSpring: "cubic-bezier(0.22, 1, 0.36, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  },

  crt: {
    id: "crt",
    name: "CRT",

    // Surfaces — near-black with slight green undertone
    bg: "#050a05",
    surface1: "#0a140a",
    surface2: "#111e11",
    surface3: "#1a2e1a",

    // Borders — phosphor green at low opacity
    border: "rgba(51, 255, 51, 0.08)",
    borderSubtle: "rgba(51, 255, 51, 0.04)",
    borderMuted: "rgba(51, 255, 51, 0.15)",

    // Typography — phosphor green cascade
    text: "#33ff33",
    textSecondary: "#29cc29",
    textMuted: "#1a801a",

    // Accent — hot phosphor
    accent: "#33ff33",
    accentHover: "#29cc29",
    accentMuted: "rgba(51, 255, 51, 0.12)",

    // Semantic — readable against green base
    win: "#33ff33",
    loss: "#ff3333",
    caution: "#ffcc00",

    // Sidebar — deepest black
    sidebarBg: "#030803",
    sidebarHover: "#0a140a",
    sidebarActiveBg: "rgba(51, 255, 51, 0.08)",
    sidebarAccent: "#33ff33",

    // Shadows — green-tinted glow (CRTs emit light, not shadows)
    shadowSm: "0 0 4px rgba(51, 255, 51, 0.08)",
    shadowMd: "0 0 12px rgba(51, 255, 51, 0.1)",
    shadowLg: "0 0 24px rgba(51, 255, 51, 0.12)",

    // Type stack
    fontMono: "'JetBrains Mono', 'Fira Code', monospace",
    fontSans: "'DM Sans', 'Inter', -apple-system, sans-serif",
    fontDisplay: "'Chakra Petch', 'DM Sans', -apple-system, sans-serif",

    // Motion
    easeSpring: "cubic-bezier(0.22, 1, 0.36, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  },

  tournament: {
    id: "tournament",
    name: "Tournament",

    // Surfaces — true blacks for maximum contrast
    bg: "#000000",
    surface1: "#0a0a0a",
    surface2: "#141414",
    surface3: "#1f1f1f",

    // Borders — neutral gray
    border: "rgba(255, 255, 255, 0.08)",
    borderSubtle: "rgba(255, 255, 255, 0.04)",
    borderMuted: "rgba(255, 255, 255, 0.14)",

    // Typography — pure white for stream readability
    text: "#ffffff",
    textSecondary: "#d4d4d4",
    textMuted: "#737373",

    // Accent — electric blue
    accent: "#3b82f6",
    accentHover: "#2563eb",
    accentMuted: "rgba(59, 130, 246, 0.15)",

    // Semantic — saturated for instant recognition
    win: "#22c55e",
    loss: "#ef4444",
    caution: "#eab308",

    // Sidebar — seamless edge-to-edge black
    sidebarBg: "#000000",
    sidebarHover: "#0a0a0a",
    sidebarActiveBg: "rgba(59, 130, 246, 0.12)",
    sidebarAccent: "#3b82f6",

    // Shadows — true black base
    shadowSm: "0 1px 2px rgba(0, 0, 0, 0.6)",
    shadowMd: "0 4px 12px rgba(0, 0, 0, 0.7)",
    shadowLg: "0 8px 30px rgba(0, 0, 0, 0.8)",

    // Type stack
    fontMono: "'JetBrains Mono', 'Fira Code', monospace",
    fontSans: "'DM Sans', 'Inter', -apple-system, sans-serif",
    fontDisplay: "'Chakra Petch', 'DM Sans', -apple-system, sans-serif",

    // Motion
    easeSpring: "cubic-bezier(0.22, 1, 0.36, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  },

  amber: {
    id: "amber",
    name: "Amber",

    // Surfaces — dark chocolate with warm undertone
    bg: "#1a1006",
    surface1: "#231709",
    surface2: "#2e200e",
    surface3: "#3d2c15",

    // Borders — warm gold at low opacity
    border: "rgba(217, 175, 106, 0.1)",
    borderSubtle: "rgba(217, 175, 106, 0.05)",
    borderMuted: "rgba(217, 175, 106, 0.18)",

    // Typography — warm cream to soft gold
    text: "#f5e6c8",
    textSecondary: "#c9a96e",
    textMuted: "#8b6d3f",

    // Accent — burnished gold
    accent: "#d9a540",
    accentHover: "#c4922e",
    accentMuted: "rgba(217, 165, 64, 0.14)",

    // Semantic — warmer variants
    win: "#7dba5a",
    loss: "#d95b5b",
    caution: "#d9a540",

    // Sidebar — darkest espresso
    sidebarBg: "#120b04",
    sidebarHover: "#1a1006",
    sidebarActiveBg: "rgba(217, 165, 64, 0.1)",
    sidebarAccent: "#d9a540",

    // Shadows — warm tinted
    shadowSm: "0 1px 3px rgba(10, 5, 0, 0.4), 0 1px 2px rgba(10, 5, 0, 0.3)",
    shadowMd: "0 4px 16px rgba(10, 5, 0, 0.45)",
    shadowLg: "0 12px 40px rgba(10, 5, 0, 0.55)",

    // Type stack
    fontMono: "'JetBrains Mono', 'Fira Code', monospace",
    fontSans: "'DM Sans', 'Inter', -apple-system, sans-serif",
    fontDisplay: "'Chakra Petch', 'DM Sans', -apple-system, sans-serif",

    // Motion
    easeSpring: "cubic-bezier(0.22, 1, 0.36, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  },
};

export const THEME_ORDER = ["dark", "light", "crt", "tournament", "amber"];

export type ColorMode = "dark" | "light" | "crt" | "tournament" | "amber";

export function getResolvedTheme(themeId: string, _mode: ColorMode): Theme {
  return THEMES[themeId] ?? THEMES["dark"]!;
}

/**
 * Applies theme tokens as CSS custom properties on :root.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  const hexToRgb = (hex: string): string => {
    // Handle hex colors, potentially with alpha or shortened
    let r = 0, g = 0, b = 0;
    if (hex.startsWith("rgba")) {
        const parts = hex.match(/\d+/g);
        if (parts) {
            r = parseInt(parts[0]);
            g = parseInt(parts[1]);
            b = parseInt(parts[2]);
        }
    } else {
        const rHex = hex.slice(1, 3);
        const gHex = hex.slice(3, 5);
        const bHex = hex.slice(5, 7);
        r = parseInt(rHex, 16);
        g = parseInt(gHex, 16);
        b = parseInt(bHex, 16);
    }
    return `${r},${g},${b}`;
  };

  // Set data-theme attribute for CSS theme-specific selectors
  root.setAttribute("data-theme", theme.id);

  // Canonical tokens
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--surface-1", theme.surface1);
  root.style.setProperty("--surface-2", theme.surface2);
  root.style.setProperty("--surface-3", theme.surface3);
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--border-subtle", theme.borderSubtle);
  root.style.setProperty("--border-muted", theme.borderMuted);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--text-secondary", theme.textSecondary);
  root.style.setProperty("--text-muted", theme.textMuted);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-hover", theme.accentHover);
  root.style.setProperty("--accent-muted", theme.accentMuted);
  root.style.setProperty("--win", theme.win);
  root.style.setProperty("--loss", theme.loss);
  root.style.setProperty("--caution", theme.caution);
  root.style.setProperty("--sidebar-bg", theme.sidebarBg);
  root.style.setProperty("--sidebar-hover", theme.sidebarHover);
  root.style.setProperty("--sidebar-active-bg", theme.sidebarActiveBg);
  root.style.setProperty("--sidebar-accent", theme.sidebarAccent);
  root.style.setProperty("--shadow-sm", theme.shadowSm);
  root.style.setProperty("--shadow-md", theme.shadowMd);
  root.style.setProperty("--shadow-lg", theme.shadowLg);
  root.style.setProperty("--font-mono", theme.fontMono);
  root.style.setProperty("--font-sans", theme.fontSans);
  root.style.setProperty("--font-display", theme.fontDisplay);
  root.style.setProperty("--ease-spring", theme.easeSpring);
  root.style.setProperty("--ease-out", theme.easeOut);

  // Legacy aliases
  root.style.setProperty("--bg-card", theme.surface1);
  root.style.setProperty("--bg-elevated", theme.surface2);
  root.style.setProperty("--bg-hover", theme.surface3);
  root.style.setProperty("--text-dim", theme.textSecondary);
  root.style.setProperty("--text-title", theme.text);
  root.style.setProperty("--text-label", theme.textSecondary);
  root.style.setProperty("--accent-dim", theme.accentHover);
  root.style.setProperty("--accent-glow", theme.accentMuted);
  root.style.setProperty("--secondary", theme.accent);
  root.style.setProperty("--secondary-dim", theme.accentHover);
  root.style.setProperty("--green", theme.win);
  root.style.setProperty("--red", theme.loss);
  root.style.setProperty("--yellow", theme.caution);
  root.style.setProperty("--gradient-start", "transparent");
  root.style.setProperty("--gradient-end", "transparent");

  root.style.setProperty("--bg-glass", theme.surface1);
  root.style.setProperty("--bg-glass-strong", theme.surface2);
  root.style.setProperty("--border-glow", theme.borderMuted);
  root.style.setProperty("--shimmer", "transparent");
  root.style.setProperty("--plasma-a", theme.accent);
  root.style.setProperty("--plasma-b", theme.accent);
  root.style.setProperty("--plasma-c", theme.accent);
  root.style.setProperty("--surface-noise", "transparent");

  root.style.setProperty("--accent-rgb", hexToRgb(theme.accent));
  root.style.setProperty("--green-rgb", hexToRgb(theme.win));
  root.style.setProperty("--red-rgb", hexToRgb(theme.loss));
  root.style.setProperty("--yellow-rgb", hexToRgb(theme.caution));
}
