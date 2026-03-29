import { useCallback, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Dashboard } from "./pages/Dashboard";
import { Sessions } from "./pages/Sessions";
import { Trends } from "./pages/Trends";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { Characters } from "./pages/Characters";
import { applyTheme, getResolvedTheme, THEME_ORDER, THEMES, type ColorMode } from "./themes";
import magiLogo from "./assets/magi-logo.png";
import {
  CoachingIcon, SessionsIcon, TrendsIcon, ProfileIcon, CharactersIcon, SettingsIcon,
} from "./components/NavIcons";
import { CommandPalette } from "./components/CommandPalette";
import { useGlobalStore } from "./stores/useGlobalStore";

type Page = "dashboard" | "sessions" | "trends" | "profile" | "characters" | "settings";

const NAV_ITEMS: { id: Page; label: string; path: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: "dashboard", label: "Coaching", path: "/dashboard", Icon: CoachingIcon },
  { id: "sessions", label: "Sessions", path: "/sessions", Icon: SessionsIcon },
  { id: "trends", label: "Trends", path: "/trends", Icon: TrendsIcon },
  { id: "profile", label: "Profile", path: "/profile", Icon: ProfileIcon },
  { id: "characters", label: "Characters", path: "/characters", Icon: CharactersIcon },
  { id: "settings", label: "Settings", path: "/settings", Icon: SettingsIcon },
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

function CrtIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="14" height="10" rx="1" />
      <path d="M5 14h6M8 12v2" />
      <path d="M4 5h8M4 7.5h5" opacity="0.5" />
    </svg>
  );
}

function TournamentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h8l-1 5H5L4 2z" />
      <path d="M6 7v2a2 2 0 0 0 4 0V7" />
      <path d="M6 13h4M8 9v4" />
      <path d="M3 2C2 3 2 5 3 6M13 2c1 1 1 3 0 4" />
    </svg>
  );
}

function AmberIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2C5 2 3 5 3 8c0 2.5 2 5 5 6 3-1 5-3.5 5-6 0-3-2-6-5-6z" />
      <path d="M8 5v4M6.5 7h3" opacity="0.5" />
    </svg>
  );
}

const THEME_ICONS: Record<string, React.FC> = {
  dark: MoonIcon,
  light: SunIcon,
  crt: CrtIcon,
  tournament: TournamentIcon,
  amber: AmberIcon,
};

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const colorMode = useGlobalStore((state) => state.colorMode);
  const setColorMode = useGlobalStore((state) => state.setColorMode);
  const refreshKey = useGlobalStore((state) => state.refreshKey);
  const triggerRefresh = useGlobalStore((state) => state.triggerRefresh);

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
  }, [setColorMode]);

  const handleModeChange = useCallback((mode: ColorMode) => {
    setColorMode(mode);
    applyTheme(getResolvedTheme(mode, mode));
    window.clippi.loadConfig().then((config: any) => {
      window.clippi.saveConfig({ ...config, colorMode: mode });
    });
  }, [setColorMode]);

  const handleToggleTheme = useCallback(() => {
    const currentIdx = THEME_ORDER.indexOf(colorMode);
    const nextIdx = (currentIdx + 1) % THEME_ORDER.length;
    const next = THEME_ORDER[nextIdx] as ColorMode;
    handleModeChange(next);
  }, [colorMode, handleModeChange]);

  const handleCommandImport = useCallback(() => {
    navigate("/settings");
  }, [navigate]);

  return (
    <div className="app-layout">
      <CommandPalette
        navigateTo={(page) => navigate(`/${page}`)}
        onToggleTheme={handleToggleTheme}
        onImport={handleCommandImport}
      />

      <nav className="sidebar" role="tablist" aria-label="Main navigation">
        <div className="sidebar-brand">
          <img src={magiLogo} alt="MAGI" className="sidebar-logo-img" width={32} height={32} />
          <div className="sidebar-brand-text">
            <span className="sidebar-wordmark">MAGI</span>
            <span className="sidebar-subtitle">Melee Analysis</span>
          </div>
        </div>

        <div className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item${location.pathname === item.path || (location.pathname === "/" && item.path === "/dashboard") ? " active" : ""}`}
              onClick={() => navigate(item.path)}
              role="tab"
              aria-selected={location.pathname === item.path || (location.pathname === "/" && item.path === "/dashboard")}
              aria-label={item.label}
            >
              <span className="nav-icon"><item.Icon size={18} /></span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button
            className="theme-toggle"
            onClick={handleToggleTheme}
            aria-label={`Theme: ${THEMES[colorMode]?.name ?? colorMode}. Click to cycle.`}
            title={THEMES[colorMode]?.name ?? colorMode}
          >
            {(() => {
              const Icon = THEME_ICONS[colorMode] ?? MoonIcon;
              return <Icon />;
            })()}
          </button>
        </div>
      </nav>

      <main className="main-content" role="tabpanel">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            style={{ width: "100%", height: "100%" }}
          >
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard refreshKey={refreshKey} />} />
              <Route path="/sessions" element={<Sessions refreshKey={refreshKey} />} />
              <Route path="/trends" element={<Trends refreshKey={refreshKey} />} />
              <Route path="/profile" element={<Profile refreshKey={refreshKey} />} />
              <Route path="/characters" element={<Characters refreshKey={refreshKey} />} />
              <Route path="/settings" element={<Settings onImport={triggerRefresh} />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}