import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dashboard } from "./pages/Dashboard";
import { Sessions } from "./pages/Sessions";
import { Trends } from "./pages/Trends";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { Characters } from "./pages/Characters";
import { applyTheme, getResolvedTheme, type ColorMode } from "./themes";
import magiLogo from "./assets/magi-logo.png";
import {
  CoachingIcon, SessionsIcon, TrendsIcon, ProfileIcon, CharactersIcon, SettingsIcon,
} from "./components/NavIcons";
import { CommandPalette } from "./components/CommandPalette";

type Page = "dashboard" | "sessions" | "trends" | "profile" | "characters" | "settings";

const NAV_ITEMS: { id: Page; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: "dashboard", label: "Coaching", Icon: CoachingIcon },
  { id: "sessions", label: "Sessions", Icon: SessionsIcon },
  { id: "trends", label: "Trends", Icon: TrendsIcon },
  { id: "profile", label: "Profile", Icon: ProfileIcon },
  { id: "characters", label: "Characters", Icon: CharactersIcon },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
];

const pageTransition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1] as number[],
};

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

// ── Icon components for theme toggle ──

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 8.5a5.5 5.5 0 1 1-7-7 4.5 4.5 0 0 0 7 7z" />
    </svg>
  );
}

// ── App ──

export function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [colorMode, setColorMode] = useState<ColorMode>("dark");

  useEffect(() => {
    async function loadTheme() {
      try {
        const config = await window.clippi.loadConfig();
        const savedMode: ColorMode = config?.colorMode || "dark";
        setColorMode(savedMode);
        applyTheme(getResolvedTheme(savedMode, savedMode));
      } catch {
        applyTheme(getResolvedTheme("dark", "dark"));
      }
    }
    loadTheme();
  }, []);

  const handleModeChange = useCallback((mode: ColorMode) => {
    setColorMode(mode);
    applyTheme(getResolvedTheme(mode, mode));
    window.clippi.loadConfig().then((config: any) => {
      window.clippi.saveConfig({ ...config, colorMode: mode });
    });
  }, []);

  const handleImport = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleToggleTheme = useCallback(() => {
    const next: ColorMode = colorMode === "dark" ? "light" : "dark";
    handleModeChange(next);
  }, [colorMode, handleModeChange]);

  const navigateTo = useCallback((target: Page) => {
    setPage(target);
  }, []);

  const handleCommandImport = useCallback(() => {
    navigateTo("settings");
  }, [navigateTo]);

  return (
    <div className="app-layout">
      <CommandPalette
        navigateTo={navigateTo}
        onToggleTheme={handleToggleTheme}
        onImport={handleCommandImport}
      />

      <nav className="sidebar" role="tablist" aria-label="Main navigation">
        {/* Brand */}
        <div className="sidebar-brand">
          <img src={magiLogo} alt="MAGI" className="sidebar-logo-img" width={32} height={32} />
          <div className="sidebar-brand-text">
            <span className="sidebar-wordmark">MAGI</span>
            <span className="sidebar-subtitle">Melee Analysis</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item${page === item.id ? " active" : ""}`}
              onClick={() => navigateTo(item.id)}
              role="tab"
              aria-selected={page === item.id}
              aria-label={item.label}
            >
              <span className="nav-icon"><item.Icon size={18} /></span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            className="theme-toggle"
            onClick={handleToggleTheme}
            aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </nav>

      <main className="main-content" role="tabpanel">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            {page === "dashboard" && <Dashboard refreshKey={refreshKey} />}
            {page === "sessions" && <Sessions refreshKey={refreshKey} />}
            {page === "trends" && <Trends refreshKey={refreshKey} />}
            {page === "profile" && <Profile refreshKey={refreshKey} />}
            {page === "characters" && <Characters refreshKey={refreshKey} />}
            {page === "settings" && <Settings onImport={handleImport} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
