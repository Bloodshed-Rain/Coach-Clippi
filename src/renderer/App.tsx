import { useCallback, useEffect, lazy, Suspense, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";

const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Sessions = lazy(() => import("./pages/Sessions").then((m) => ({ default: m.Sessions })));
const Library = lazy(() => import("./pages/Library").then((m) => ({ default: m.Library })));
const Trends = lazy(() => import("./pages/Trends").then((m) => ({ default: m.Trends })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const Characters = lazy(() => import("./pages/Characters").then((m) => ({ default: m.Characters })));
const Rivals = lazy(() => import("./pages/Rivals").then((m) => ({ default: m.Rivals })));
const Practice = lazy(() => import("./pages/Practice").then((m) => ({ default: m.Practice })));
const Oracle = lazy(() => import("./pages/Oracle").then((m) => ({ default: m.Oracle })));
const GameTheater = lazy(() => import("./pages/GameTheater").then((m) => ({ default: m.GameTheater })));
const Cornerman = lazy(() => import("./pages/Cornerman").then((m) => ({ default: m.Cornerman })));
const CornermanOverlay = lazy(() =>
  import("./pages/CornermanOverlay").then((m) => ({ default: m.CornermanOverlay })),
);

import { applyTheme, getResolvedTheme, THEMES, type ColorMode } from "./themes";
import {
  DashboardIcon,
  SessionsIcon,
  TrendsIcon,
  CharactersIcon,
  SettingsIcon,
  LibraryIcon,
  PracticeIcon,
  OracleIcon,
  RivalsIcon,
  CornermanIcon,
} from "./components/NavIcons";
import { CommandPalette } from "./components/CommandPalette";
import { LiquidShell, type NavItem as LiquidNavItem } from "./components/LiquidShell";
import { TweaksPanel } from "./components/TweaksPanel";
import { ReplayPlayer } from "./components/ReplayPlayer";
import { useGlobalStore, type Density } from "./stores/useGlobalStore";
import { useOverallRecord } from "./hooks/queries";

type Page = "dashboard" | "sessions" | "library" | "trends" | "characters" | "rivals" | "cornerman" | "practice" | "oracle" | "settings";

interface NavItem extends LiquidNavItem {
  id: Page;
}

const ANALYZE_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", Icon: DashboardIcon },
  { id: "sessions", label: "Sessions", path: "/sessions", Icon: SessionsIcon },
  { id: "library", label: "Library", path: "/library", Icon: LibraryIcon },
  { id: "trends", label: "Trends", path: "/trends", Icon: TrendsIcon },
  { id: "characters", label: "Characters", path: "/characters", Icon: CharactersIcon },
  { id: "rivals", label: "Rivals", path: "/rivals", Icon: RivalsIcon },
  { id: "cornerman", label: "Cornerman", path: "/cornerman", Icon: CornermanIcon },
  { id: "practice", label: "Practice", path: "/practice", Icon: PracticeIcon },
  { id: "oracle", label: "MAGI Oracle", path: "/oracle", Icon: OracleIcon },
];

const SYSTEM_ITEMS: NavItem[] = [{ id: "settings", label: "Settings", path: "/settings", Icon: SettingsIcon }];

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const setColorMode = useGlobalStore((state) => state.setColorMode);
  const density = useGlobalStore((state) => state.density);
  const setDensity = useGlobalStore((state) => state.setDensity);
  const watcherActive = useGlobalStore((state) => state.watcherActive);
  const gamesCount = useGlobalStore((state) => state.gamesCount);
  const setGamesCount = useGlobalStore((state) => state.setGamesCount);
  const refreshKey = useGlobalStore((state) => state.refreshKey);
  const triggerRefresh = useGlobalStore((state) => state.triggerRefresh);
  const { data: record, refetch: refetchRecord } = useOverallRecord();

  useEffect(() => {
    async function loadTheme() {
      try {
        const config = await window.clippi.loadConfig();
        const raw = config?.colorMode ?? "liquid";

        // Legacy id remap.
        const migrated: ColorMode = ((): ColorMode => {
          if (raw === "dark") return "telemetry";
          if (raw === "win98" || raw === "melee") return "liquid";
          return (raw in THEMES ? raw : "liquid") as ColorMode;
        })();

        setColorMode(migrated);
        applyTheme(getResolvedTheme(migrated, migrated));

        if (migrated !== raw) {
          window.clippi.saveConfig({ colorMode: migrated }).catch(() => {});
        }
        const savedDensity: Density = config?.density === "compact" ? "compact" : "comfortable";
        setDensity(savedDensity);
      } catch {
        applyTheme(getResolvedTheme("liquid", "liquid"));
      }
    }
    loadTheme();
  }, [setColorMode, setDensity]);

  useEffect(() => {
    document.body.setAttribute("data-density", density);
  }, [density]);

  useEffect(() => {
    setGamesCount(record?.totalGames ?? 0);
  }, [record?.totalGames, setGamesCount]);

  useEffect(() => {
    refetchRecord();
  }, [refreshKey, refetchRecord]);

  const handleCommandImport = useCallback(() => {
    navigate("/settings");
  }, [navigate]);

  // Shared nav handler used by both shells.
  // Fires the nav:reactivate event if the user clicks a nav item that's
  // already the active page (Characters.tsx listens for this to reset
  // its character selection back to the grid).
  const handleNavigate = useCallback(
    (item: LiquidNavItem, isActive: boolean) => {
      if (isActive) {
        window.dispatchEvent(new CustomEvent("nav:reactivate", { detail: { page: item.id } }));
      } else {
        navigate(item.path);
      }
    },
    [navigate],
  );

  const routes = useMemo(
    () => (
      <Suspense
        fallback={
          <div className="page-loading">
            <div className="spinner" />
          </div>
        }
      >
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard refreshKey={refreshKey} />} />
          <Route path="/sessions" element={<Sessions refreshKey={refreshKey} />} />
          <Route path="/library" element={<Library refreshKey={refreshKey} />} />
          <Route path="/trends" element={<Trends refreshKey={refreshKey} />} />
          <Route path="/characters" element={<Characters refreshKey={refreshKey} />} />
          <Route path="/rivals" element={<Rivals refreshKey={refreshKey} />} />
          <Route path="/cornerman" element={<Cornerman refreshKey={refreshKey} />} />
          <Route path="/practice" element={<Practice refreshKey={refreshKey} />} />
          <Route path="/oracle" element={<Oracle refreshKey={refreshKey} />} />
          <Route path="/settings" element={<Settings onImport={triggerRefresh} />} />
          <Route path="/game/:id" element={<GameTheater />} />
        </Routes>
      </Suspense>
    ),
    [location, refreshKey, triggerRefresh],
  );

  if (location.pathname === "/overlay") {
    return (
      <Suspense fallback={null}>
        <CornermanOverlay />
      </Suspense>
    );
  }

  return (
    <>
      <CommandPalette navigateTo={(page) => navigate(`/${page}`)} onImport={handleCommandImport} />
      <LiquidShell
        analyzeItems={ANALYZE_ITEMS}
        systemItems={SYSTEM_ITEMS}
        onNavigate={handleNavigate}
        watcherActive={watcherActive}
        gamesCount={gamesCount}
      >
        {routes}
      </LiquidShell>
      <TweaksPanel />
      <ReplayPlayer />
    </>
  );
}
