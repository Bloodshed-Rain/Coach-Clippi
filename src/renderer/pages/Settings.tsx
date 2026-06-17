import { useEffect, useState, useCallback } from "react";
import { Card } from "../components/ui/Card";
import { PROVIDERS, PROVIDER_BY_ID, type ProviderId } from "../../llmProviders";
import { useGlobalStore, type Density } from "../stores/useGlobalStore";
import { THEMES, THEME_ORDER, applyTheme, getResolvedTheme, type ColorMode } from "../themes";
import {
  clampCornermanOverlayTransparency,
  DEFAULT_CORNERMAN_OVERLAY_TRANSPARENCY,
} from "../../cornermanOverlayTransparency";
import {
  normalizeCornermanPopupAutoHideSeconds,
  resolveCornermanPopupSettings,
  type CornermanPopupLiveAlertMode,
} from "../../cornermanPopupSettings";

/** Config as returned by the main process — apiKeys are redacted to booleans */
interface Config {
  targetPlayer: string | null;
  connectCode: string | null;
  replayFolder: string | null;
  dolphinPath: string | null;
  meleeIsoPath: string | null;
  activeProvider: ProviderId | null;
  modelByProvider: Partial<Record<ProviderId, string>>;
  apiKeys: Partial<Record<ProviderId, true>>;
  localEndpoint: string | null;
  theme: string | null;
  colorMode: string | null;
  cornermanOverlayTransparency: number | null;
  cornermanOverlayCorner: "top-left" | "top-right" | "bottom-left" | "bottom-right" | null;
  cornermanOverlaySize: { width: number; height: number } | null;
  cornermanPopupCoachingCards: boolean | null;
  cornermanPopupLiveAlerts: CornermanPopupLiveAlertMode | null;
  cornermanPopupErrors: boolean | null;
  cornermanDesktopNotifications: boolean | null;
  cornermanPopupAutoHideSeconds: number | null;
}

interface FetchedModel {
  id: string;
  label: string;
  provider: ProviderId;
}

/** Per-provider fallback when the dynamic fetch hasn't run yet (or no key set). */
const FALLBACK_MODELS: Record<ProviderId, FetchedModel[]> = {
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
    { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
  ],
  openrouter: [
    { id: "deepseek/deepseek-chat", label: "DeepSeek V3", provider: "openrouter" },
    { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4 (via OpenRouter)", provider: "openrouter" },
  ],
  anthropic: [{ id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "anthropic" }],
  gemini: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini" },
  ],
  local: [{ id: "local", label: "Local Model", provider: "local" }],
  pollinations: [{ id: "pollinations", label: "Pollinations Free AI", provider: "pollinations" }],
};

// ── Component ────────────────────────────────────────────────────────

interface SettingsProps {
  onImport: () => void;
}

export function Settings({ onImport }: SettingsProps) {
  const [config, setConfig] = useState<Config>({
    targetPlayer: null,
    connectCode: null,
    replayFolder: null,
    dolphinPath: null,
    meleeIsoPath: null,
    activeProvider: null,
    modelByProvider: {},
    apiKeys: {},
    localEndpoint: null,
    theme: null,
    colorMode: null,
    cornermanOverlayTransparency: null,
    cornermanOverlayCorner: null,
    cornermanOverlaySize: null,
    cornermanPopupCoachingCards: null,
    cornermanPopupLiveAlerts: null,
    cornermanPopupErrors: null,
    cornermanDesktopNotifications: null,
    cornermanPopupAutoHideSeconds: null,
  });
  // Write-only key inputs — never populated from main process
  const [keyEdits, setKeyEdits] = useState<Partial<Record<ProviderId, string>>>({});
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<{ filePath: string; error: string }[]>([]);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    lastFile: string;
    importedSoFar: number;
    skippedSoFar: number;
    errorsSoFar: number;
    lastError?: string;
    lastFileStatus: "imported" | "skipped" | "error";
  } | null>(null);
  const [watching, setWatching] = useState(false);
  const [dynamicModels, setDynamicModels] = useState<Record<string, FetchedModel[]> | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [customModelInputs, setCustomModelInputs] = useState<Partial<Record<ProviderId, boolean>>>({});
  const setWatcherActive = useGlobalStore((state) => state.setWatcherActive);
  const colorMode = useGlobalStore((state) => state.colorMode);
  const setColorMode = useGlobalStore((state) => state.setColorMode);
  const density = useGlobalStore((state) => state.density);
  const setDensity = useGlobalStore((state) => state.setDensity);
  const popupSettings = resolveCornermanPopupSettings(config);
  const popupTransparency = clampCornermanOverlayTransparency(config.cornermanOverlayTransparency);

  // Load user config
  useEffect(() => {
    async function load() {
      try {
        const c = await window.clippi.loadConfig();
        if (c) setConfig(c);
      } catch (err) {
        console.error("Failed to load config:", err);
      }
    }
    load();
  }, []);

  // Fetch available models from configured providers
  const fetchModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const result = await window.clippi.fetchAllModels();
      setDynamicModels(result);
    } catch {
      setDynamicModels(null);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Import progress events
  useEffect(() => {
    if (!importing) return;
    const unsub = window.clippi.onImportProgress((progress) => {
      setImportProgress(progress);
      const parts = [`${progress.current}/${progress.total}`];
      if (progress.importedSoFar > 0) parts.push(`${progress.importedSoFar} imported`);
      if (progress.skippedSoFar > 0) parts.push(`${progress.skippedSoFar} skipped`);
      if (progress.errorsSoFar > 0) parts.push(`${progress.errorsSoFar} failed`);
      setImportStatus(parts.join(" \u2014 "));
    });
    return () => {
      unsub();
      setImportProgress(null);
    };
  }, [importing]);

  // Watcher events
  useEffect(() => {
    if (!watching) return;
    const unsubImported = window.clippi.onImported((result: unknown) => {
      const r = result as { skipped: boolean; filePath: string };
      if (!r.skipped) {
        setImportStatus(`Auto-imported: ${r.filePath.split("/").pop()}`);
        onImport();
      }
    });
    const unsubWatcherError = window.clippi.onWatcherError((message) => {
      setWatching(false);
      setWatcherActive(false);
      setImportStatus(`Watcher error: ${message}`);
    });
    return () => {
      unsubImported();
      unsubWatcherError();
    };
  }, [watching, onImport, setWatcherActive]);

  const handleSave = useCallback(async () => {
    try {
      // Build save payload: non-secret fields + only non-empty key edits.
      // Strip the redacted apiKeys map (booleans) so saveConfig never overwrites
      // real keys with `true`.
      const payload: Record<string, unknown> = { ...config };
      delete payload.apiKeys;
      // Don't clobber theme/density chosen via Tweaks/Appearance with the
      // stale values captured at mount — those persist through their own setters.
      delete payload.theme;
      delete payload.colorMode;
      const updatedKeys: Partial<Record<ProviderId, string>> = {};
      for (const [pid, val] of Object.entries(keyEdits)) {
        if (val && val.trim()) updatedKeys[pid as ProviderId] = val.trim();
      }
      if (Object.keys(updatedKeys).length > 0) payload.apiKeys = updatedKeys;
      await window.clippi.saveConfig(payload);
      setKeyEdits({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setImportStatus(`Error saving: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [config, keyEdits]);

  const setActiveProvider = (p: ProviderId) => setConfig({ ...config, activeProvider: p });
  const setProviderModel = (p: ProviderId, modelId: string | null) =>
    setConfig({
      ...config,
      modelByProvider: {
        ...config.modelByProvider,
        ...(modelId ? { [p]: modelId } : { [p]: undefined }),
      },
    });

  const onPickTheme = (id: ColorMode) => {
    setColorMode(id);
    applyTheme(getResolvedTheme(id, id));
    window.clippi.saveConfig({ colorMode: id }).catch(() => {});
  };

  const onPickDensity = (d: Density) => {
    setDensity(d);
    window.clippi.saveConfig({ density: d }).catch(() => {});
  };

  const handleBrowse = async () => {
    const folder = await window.clippi.openFolder();
    if (folder) {
      setConfig({ ...config, replayFolder: folder });
      // Persist immediately so a user who imports without clicking Save keeps it.
      window.clippi.saveConfig({ replayFolder: folder }).catch(() => {});
    }
  };

  const handleImport = async () => {
    if (!config.replayFolder || !config.targetPlayer) {
      setImportStatus("Set replay folder and player tag first.");
      return;
    }
    setImporting(true);
    setImportProgress(null);
    setImportErrors([]);
    setShowErrorDetails(false);
    setImportStatus("Scanning for replays...");
    try {
      const result = (await window.clippi.importFolder(
        config.replayFolder,
        config.connectCode || config.targetPlayer,
      )) as {
        imported: number;
        skipped: number;
        errors: number;
        errorDetails: { filePath: string; error: string }[];
        total: number;
        unreadableDirs: number;
      };
      setImportProgress(null);

      const parts: string[] = [];
      parts.push(`${result.imported} imported`);
      if (result.skipped > 0) parts.push(`${result.skipped} duplicates skipped`);
      if (result.errors > 0) parts.push(`${result.errors} failed`);
      parts.push(`${result.total} total files`);

      let status = parts.join(", ") + ".";
      if (result.unreadableDirs > 0) {
        status += ` (${result.unreadableDirs} subdirectories were unreadable)`;
      }
      setImportStatus(status);

      if (result.errorDetails && result.errorDetails.length > 0) {
        setImportErrors(result.errorDetails);
      }

      onImport();
      // Persist the folder/tag that produced a successful import so they survive
      // even if the user never clicks Save. Fire-and-forget so a save failure
      // doesn't get reported as an import failure.
      window.clippi
        .saveConfig({ replayFolder: config.replayFolder, targetPlayer: config.targetPlayer })
        .catch(() => {});
    } catch (err: unknown) {
      setImportProgress(null);
      setImportStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    setImporting(false);
  };

  const toggleWatcher = async () => {
    try {
      if (watching) {
        await window.clippi.stopWatcher();
        setWatching(false);
        setWatcherActive(false);
        setImportStatus("Watcher stopped.");
      } else {
        if (!config.replayFolder || !config.targetPlayer) {
          setImportStatus("Set replay folder and player tag first.");
          return;
        }
        await window.clippi.startWatcher(config.replayFolder, config.connectCode ?? config.targetPlayer);
        setWatching(true);
        setWatcherActive(true);
        setImportStatus("Watching for new replays...");
      }
    } catch (err: unknown) {
      setWatcherActive(false);
      setImportStatus(`Watcher error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure? This will delete all imported games, stats, and analyses.")) {
      return;
    }
    try {
      await window.clippi.clearAllGames();
      setImportStatus("All games cleared.");
      onImport();
    } catch (err: unknown) {
      setImportStatus(`Error clearing data: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <Card title="Player">
        <div className="settings-field">
          <label htmlFor="setting-target-player">Display Name / Tag</label>
          <input
            id="setting-target-player"
            value={config.targetPlayer ?? ""}
            onChange={(e) => setConfig({ ...config, targetPlayer: e.target.value || null })}
            placeholder="YourTag"
          />
        </div>
        <div className="settings-field">
          <label htmlFor="setting-connect-code">Connect Code</label>
          <input
            id="setting-connect-code"
            value={config.connectCode ?? ""}
            onChange={(e) => setConfig({ ...config, connectCode: e.target.value || null })}
            placeholder="TAG#123"
          />
        </div>
      </Card>

      <Card title="Appearance">
        <div className="settings-field">
          <label id="appearance-theme-label">Theme</label>
          <div
            className="settings-row"
            role="group"
            aria-labelledby="appearance-theme-label"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            {THEME_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                className={`btn ${colorMode === id ? "btn-primary" : ""}`}
                aria-pressed={colorMode === id}
                onClick={() => onPickTheme(id as ColorMode)}
              >
                {THEMES[id]!.name}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-field" style={{ marginBottom: 0 }}>
          <label id="appearance-density-label">Density</label>
          <div className="settings-row" role="group" aria-labelledby="appearance-density-label" style={{ gap: 8 }}>
            {(["comfortable", "compact"] as Density[]).map((d) => (
              <button
                key={d}
                type="button"
                className={`btn ${density === d ? "btn-primary" : ""}`}
                aria-pressed={density === d}
                onClick={() => onPickDensity(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Cornerman Popup">
        <p style={{ color: "var(--text-dim)", fontSize: 11, margin: "0 0 12px" }}>
          Choose which Cornerman moments are allowed to interrupt play.
        </p>
        <div className="settings-field">
          <label htmlFor="setting-cornerman-transparency">Transparency</label>
          <div className="settings-row settings-row-center">
            <input
              id="setting-cornerman-transparency"
              type="range"
              min="15"
              max="85"
              value={popupTransparency}
              onChange={(e) =>
                setConfig({
                  ...config,
                  cornermanOverlayTransparency: clampCornermanOverlayTransparency(Number(e.target.value)),
                })
              }
            />
            <span className="settings-mono-value">{popupTransparency}%</span>
          </div>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-cornerman-live-alerts">Live Alerts</label>
          <select
            id="setting-cornerman-live-alerts"
            className="model-select"
            value={popupSettings.liveAlerts}
            onChange={(e) =>
              setConfig({ ...config, cornermanPopupLiveAlerts: e.target.value as CornermanPopupLiveAlertMode })
            }
          >
            <option value="all">Show all live alerts</option>
            <option value="high">Only high-impact alerts</option>
            <option value="off">Do not show live alerts</option>
          </select>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-cornerman-autohide">Auto-hide after notification</label>
          <div className="settings-row settings-row-center">
            <input
              id="setting-cornerman-autohide"
              type="number"
              min="0"
              max="120"
              value={popupSettings.autoHideSeconds}
              onChange={(e) =>
                setConfig({
                  ...config,
                  cornermanPopupAutoHideSeconds: normalizeCornermanPopupAutoHideSeconds(Number(e.target.value)),
                })
              }
            />
            <span className="settings-mono-value">seconds</span>
          </div>
          <p className="settings-help">Use 0 to keep the popup open until dismissed.</p>
        </div>
        <div className="settings-toggle-list">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={popupSettings.coachingCards}
              onChange={(e) => setConfig({ ...config, cornermanPopupCoachingCards: e.target.checked })}
            />
            <span>
              <strong>Between-game coaching cards</strong>
              <small>Show the generated adjustment in the popup.</small>
            </span>
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={popupSettings.errors}
              onChange={(e) => setConfig({ ...config, cornermanPopupErrors: e.target.checked })}
            />
            <span>
              <strong>Popup errors</strong>
              <small>Show provider or analysis failures in the popup.</small>
            </span>
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={popupSettings.desktopNotifications}
              onChange={(e) => setConfig({ ...config, cornermanDesktopNotifications: e.target.checked })}
            />
            <span>
              <strong>Desktop notification</strong>
              <small>Send an OS notification when a coaching card is ready.</small>
            </span>
          </label>
        </div>
        {config.cornermanOverlayTransparency === null && (
          <p className="settings-help" style={{ marginTop: 10 }}>
            Default transparency is {DEFAULT_CORNERMAN_OVERLAY_TRANSPARENCY}%.
          </p>
        )}
      </Card>

      <Card title="Replay Folder">
        <div className="settings-field">
          <div className="settings-row">
            <input
              value={config.replayFolder ?? ""}
              onChange={(e) => setConfig({ ...config, replayFolder: e.target.value || null })}
              placeholder="/path/to/slippi/replays"
            />
            <button className="btn" onClick={handleBrowse}>
              Browse
            </button>
          </div>
        </div>
        <div className="settings-row" style={{ gap: 8 }}>
          <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
            {importing ? "Importing..." : "Import All"}
          </button>
          <button className={`btn ${watching ? "btn-danger" : ""}`} onClick={toggleWatcher}>
            {watching ? "Stop Watching" : "Watch for New Games"}
          </button>
        </div>
        {importing && (
          <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "6px 0 0" }}>
            Large replay folders may take a few minutes to process.
          </p>
        )}
        {importProgress && importing && (
          <div style={{ marginTop: 8 }}>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--text-dim)",
                marginTop: 4,
              }}
            >
              <span>{importProgress.lastFile}</span>
              <span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
            </div>
          </div>
        )}
        {importStatus && (
          <p className={`import-status${importErrors.length > 0 ? " import-status--warn" : ""}`}>{importStatus}</p>
        )}
        {importErrors.length > 0 && !importing && (
          <div style={{ marginTop: 4 }}>
            <button
              className="btn"
              style={{ fontSize: 11, padding: "2px 8px" }}
              onClick={() => setShowErrorDetails((v) => !v)}
            >
              {showErrorDetails
                ? "Hide errors"
                : `Show ${importErrors.length} error${importErrors.length === 1 ? "" : "s"}`}
            </button>
            {showErrorDetails && (
              <div
                style={{
                  marginTop: 6,
                  maxHeight: 200,
                  overflowY: "auto",
                  fontSize: 11,
                  fontFamily: "var(--font-mono, monospace)",
                  background: "var(--bg-inset, rgba(0,0,0,0.2))",
                  borderRadius: 4,
                  padding: 8,
                }}
              >
                {importErrors.map((e, i) => (
                  <div key={i} style={{ marginBottom: 4, color: "var(--text-dim)" }}>
                    <span style={{ color: "var(--red, #C60707)" }}>{e.filePath.split("/").pop()}</span>
                    {" \u2014 "}
                    {e.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Dolphin Path */}
      <Card title="Slippi Dolphin">
        <div className="settings-field">
          <label htmlFor="setting-dolphin-path">
            Dolphin Executable Path (optional \u2014 auto-detected if left blank)
          </label>
          <div className="settings-row">
            <input
              id="setting-dolphin-path"
              value={config.dolphinPath ?? ""}
              onChange={(e) => setConfig({ ...config, dolphinPath: e.target.value || null })}
              placeholder="Auto-detect"
            />
            <button
              className="btn"
              onClick={async () => {
                const filePath = await window.clippi.openFileDialog("Select Slippi Dolphin", [
                  { name: "All Files", extensions: ["*"] },
                ]);
                if (filePath) setConfig({ ...config, dolphinPath: filePath });
              }}
            >
              Browse
            </button>
          </div>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-melee-iso">
            Melee ISO Path (vanilla NTSC 1.02 \u2014 needed for replay playback)
          </label>
          <div className="settings-row">
            <input
              id="setting-melee-iso"
              value={config.meleeIsoPath ?? ""}
              onChange={(e) => setConfig({ ...config, meleeIsoPath: e.target.value || null })}
              placeholder="Falls back to Slippi Launcher ISO if blank"
            />
            <button
              className="btn"
              onClick={async () => {
                const filePath = await window.clippi.openFileDialog("Select Melee ISO", [
                  { name: "ISO Files", extensions: ["iso", "gcm"] },
                ]);
                if (filePath) setConfig({ ...config, meleeIsoPath: filePath });
              }}
            >
              Browse
            </button>
          </div>
        </div>
      </Card>

      {/* AI Provider — one section per provider with active selector, key, model */}
      <Card>
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>AI Provider</span>
          <button
            className="btn"
            style={{ padding: "3px 8px", fontSize: 10 }}
            onClick={fetchModels}
            disabled={modelsLoading}
          >
            {modelsLoading ? "Fetching..." : "Refresh models"}
          </button>
        </div>
        <p style={{ color: "var(--text-dim)", fontSize: 11, margin: "0 0 12px" }}>
          Bring your own key for any provider. Pick one as the active provider — that's the one MAGI will use for
          coaching, sessions, oracle, and practice plans.
        </p>

        {PROVIDERS.map((p) => {
          const isActive = config.activeProvider === p.id;
          const isSet = !!config.apiKeys[p.id];
          const keyEdit = keyEdits[p.id] ?? "";
          const fetched = dynamicModels?.[p.id] ?? [];
          const models = fetched.length > 0 ? fetched : FALLBACK_MODELS[p.id];
          const selectedModel = config.modelByProvider[p.id] ?? "";
          const customMode = customModelInputs[p.id] ?? false;
          const ready = !p.needsKey || isSet || !!keyEdit.trim();

          return (
            <div
              key={p.id}
              style={{
                border: `1px solid ${isActive ? "var(--accent, #4ade80)" : "var(--border, rgba(255,255,255,0.08))"}`,
                borderRadius: 6,
                padding: "12px 14px",
                marginBottom: 12,
                background: isActive ? "rgba(var(--green-rgb), 0.06)" : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="active-provider"
                    checked={isActive}
                    onChange={() => setActiveProvider(p.id)}
                  />
                  {p.label}
                  {isActive && (
                    <span style={{ color: "var(--accent, #4ade80)", fontSize: 10, fontWeight: 400 }}>ACTIVE</span>
                  )}
                </label>
                {p.signupUrl && (
                  <a
                    href={p.signupUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 10, color: "var(--text-muted)" }}
                  >
                    get a key →
                  </a>
                )}
              </div>

              {p.needsKey && (
                <div className="settings-field" style={{ marginBottom: 8 }}>
                  <label htmlFor={`apikey-${p.id}`} style={{ fontSize: 11 }}>
                    API Key {isSet && <span style={{ color: "var(--green)", fontSize: 10 }}>✓ (configured)</span>}
                  </label>
                  <input
                    id={`apikey-${p.id}`}
                    type="password"
                    value={keyEdit}
                    onChange={(e) => setKeyEdits({ ...keyEdits, [p.id]: e.target.value })}
                    placeholder={isSet ? "Enter new key to replace" : p.keyPlaceholder}
                  />
                </div>
              )}

              {p.id === "local" && (
                <div className="settings-field" style={{ marginBottom: 8 }}>
                  <label htmlFor={`local-endpoint-${p.id}`} style={{ fontSize: 11 }}>
                    Local Endpoint URL
                  </label>
                  <input
                    id={`local-endpoint-${p.id}`}
                    type="text"
                    value={config.localEndpoint ?? ""}
                    onChange={(e) => setConfig({ ...config, localEndpoint: e.target.value || null })}
                    placeholder="http://localhost:1234/v1"
                  />
                </div>
              )}

              <div className="settings-field" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor={`model-${p.id}`} style={{ fontSize: 11 }}>
                    Model
                    {p.needsKey && !ready && (
                      <span style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 400, marginLeft: 8 }}>
                        (add a key to load live models)
                      </span>
                    )}
                  </label>
                  <button
                    className="btn"
                    style={{ padding: "2px 6px", fontSize: 10 }}
                    onClick={() => setCustomModelInputs({ ...customModelInputs, [p.id]: !customMode })}
                  >
                    {customMode ? "Dropdown" : "Custom ID"}
                  </button>
                </div>
                {customMode ? (
                  <input
                    id={`model-${p.id}`}
                    value={selectedModel}
                    onChange={(e) => setProviderModel(p.id, e.target.value || null)}
                    placeholder={models[0]?.id ?? "model-id"}
                  />
                ) : (
                  <select
                    id={`model-${p.id}`}
                    className="model-select"
                    value={selectedModel}
                    onChange={(e) => setProviderModel(p.id, e.target.value || null)}
                  >
                    <option value="">— select a model —</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          );
        })}

        <p style={{ fontSize: 11, margin: "0", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          Active:{" "}
          {config.activeProvider
            ? `${PROVIDER_BY_ID[config.activeProvider].label} → ${
                config.modelByProvider[config.activeProvider] ?? "(no model selected)"
              }`
            : "(none — pick a provider above)"}
        </p>
      </Card>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "16px 0",
          marginTop: 8,
          borderTop: "1px solid var(--border)",
        }}
      >
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      <Card title="Danger Zone" style={{ marginTop: 32 }}>
        <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 12 }}>
          This will delete all imported games, stats, and coaching analyses from the local database. Your replay files
          will not be touched.
        </p>
        <button className="btn btn-danger" onClick={handleClearAll}>
          Clear All Games
        </button>
      </Card>
    </div>
  );
}
