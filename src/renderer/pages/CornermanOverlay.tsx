import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { CoachingCards } from "../components/CoachingCards";
import { CornermanLiveAlerts } from "../components/CornermanLiveAlerts";
import { CornermanLiveStatsStrip } from "../components/CornermanLiveStats";
import { useCornermanLiveStats } from "../hooks/useCornermanLiveStats";
import {
  clampCornermanOverlayTransparency,
  DEFAULT_CORNERMAN_OVERLAY_TRANSPARENCY,
  getCornermanOverlayAlphas,
} from "../../cornermanOverlayTransparency";
import {
  DEFAULT_CORNERMAN_POPUP_SETTINGS,
  resolveCornermanPopupSettings,
  shouldShowCornermanLiveAlert,
} from "../../cornermanPopupSettings";
import {
  DEFAULT_CORNERMAN_LIVE_STATS_SETTINGS,
  resolveCornermanLiveStatsSettings,
} from "../../cornermanLiveStatsSettings";
import { DEFAULT_CORNERMAN_VOICE_SETTINGS, resolveCornermanVoiceSettings } from "../../cornermanVoiceSettings";
import { CornermanSpeechCoach, createHybridCornermanSpeechCoach } from "../utils/cornermanSpeech";
import "../styles/overlay.css";

type OverlayResizeHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const RESIZE_HANDLES: OverlayResizeHandle[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

/** Toast UI for the transparent always-on-top overlay window (#/overlay).
 *  The main process shows the window when a card starts streaming; this
 *  component just renders whatever arrives and offers ✕ to hide. */
export function CornermanOverlay() {
  const [status, setStatus] = useState<CornermanStatus | null>(null);
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<CornermanLiveEvent[]>([]);
  const [transparency, setTransparency] = useState(DEFAULT_CORNERMAN_OVERLAY_TRANSPARENCY);
  const [hasLoadedTransparency, setHasLoadedTransparency] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(DEFAULT_CORNERMAN_VOICE_SETTINGS.enabled);
  const resizeDrag = useRef<{ handle: OverlayResizeHandle; x: number; y: number } | null>(null);
  const liveEventTimers = useRef<number[]>([]);
  const autoHideTimer = useRef<number | null>(null);
  const popupSettings = useRef(DEFAULT_CORNERMAN_POPUP_SETTINGS);
  const liveStatsSettings = useRef(DEFAULT_CORNERMAN_LIVE_STATS_SETTINGS);
  const voiceSettings = useRef(DEFAULT_CORNERMAN_VOICE_SETTINGS);
  const voiceCoach = useRef<CornermanSpeechCoach | null>(null);
  // Called before the main useEffect below so its onCornermanLiveStats listener
  // is registered before cornermanOverlayReady() flushes the main-process queue.
  // This is AMBIENT content only — it must never touch the auto-hide timer or
  // window visibility (see the Win11 overlay note in overlayWindow.ts).
  const liveStats = useCornermanLiveStats();

  const clearAutoHideTimer = useCallback(() => {
    if (autoHideTimer.current === null) return;
    window.clearTimeout(autoHideTimer.current);
    autoHideTimer.current = null;
  }, []);

  const scheduleAutoHide = useCallback(() => {
    clearAutoHideTimer();
    const seconds = popupSettings.current.autoHideSeconds;
    if (seconds <= 0) return;
    autoHideTimer.current = window.setTimeout(() => {
      autoHideTimer.current = null;
      window.clippi.cornermanOverlayDismiss().catch(() => {});
    }, seconds * 1000);
  }, [clearAutoHideTimer]);

  useEffect(() => {
    let disposed = false;
    document.documentElement.classList.add("overlay-mode");
    document.body.classList.add("overlay-mode");
    voiceCoach.current = createHybridCornermanSpeechCoach((message) => {
      console.error("Cornerman voice error:", message);
    });
    window.clippi
      .cornermanStatus()
      .then(setStatus)
      .catch(() => {});
    const configLoad = window.clippi
      .loadConfig()
      .then((config) => {
        setTransparency(clampCornermanOverlayTransparency(config?.cornermanOverlayTransparency));
        popupSettings.current = resolveCornermanPopupSettings(config ?? {});
        liveStatsSettings.current = resolveCornermanLiveStatsSettings(config ?? {});
        voiceSettings.current = resolveCornermanVoiceSettings(config ?? {});
        setVoiceEnabled(voiceSettings.current.enabled);
        voiceCoach.current?.configure(voiceSettings.current);
      })
      .catch(() => {})
      .finally(() => {
        if (disposed) return;
        setHasLoadedTransparency(true);
        // Configuration is loaded and all listeners are mounted. The main
        // process can now flush events it queued while this window opened.
        window.clippi.cornermanOverlayReady?.().catch(() => {});
      });
    const offStream = window.clippi.onCornermanStream((chunk) => {
      if (!popupSettings.current.coachingCards) return;
      clearAutoHideTimer();
      setError(null);
      setIsStreaming(true);
      setText((prev) => prev + chunk);
    });
    const offCard = window.clippi.onCornermanCard((card) => {
      voiceCoach.current?.speakBetweenGameAdjustment(card.text);
      if (!popupSettings.current.coachingCards) return;
      setIsStreaming(false);
      setText(card.text);
      scheduleAutoHide();
    });
    const offUpdate = window.clippi.onCornermanSetUpdate((s) => {
      setStatus(s);
      // New game registered — clear the previous card so the next stream starts clean.
      clearAutoHideTimer();
      setText("");
    });
    const offLiveEvent = window.clippi.onCornermanLiveEvent((event) => {
      voiceCoach.current?.enqueueLiveEvent(event);
      if (!shouldShowCornermanLiveAlert(popupSettings.current.liveAlerts, event.importance)) return;
      setLiveEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)].slice(0, 4));
      const timer = window.setTimeout(() => {
        setLiveEvents((prev) => prev.filter((e) => e.id !== event.id));
      }, 20_000);
      liveEventTimers.current.push(timer);
      scheduleAutoHide();
    });
    const offError = window.clippi.onCornermanError((message) => {
      if (!popupSettings.current.errors) return;
      setIsStreaming(false);
      setText("");
      setError(message);
      scheduleAutoHide();
    });
    return () => {
      disposed = true;
      void configLoad;
      document.documentElement.classList.remove("overlay-mode");
      document.body.classList.remove("overlay-mode");
      offStream();
      offCard();
      offUpdate();
      offLiveEvent();
      offError();
      clearAutoHideTimer();
      for (const timer of liveEventTimers.current) window.clearTimeout(timer);
      liveEventTimers.current = [];
      voiceCoach.current?.dispose();
      voiceCoach.current = null;
    };
  }, [clearAutoHideTimer, scheduleAutoHide]);

  useEffect(() => {
    if (!hasLoadedTransparency) return;
    const save = window.setTimeout(() => {
      window.clippi.saveConfig({ cornermanOverlayTransparency: transparency }).catch(() => {});
    }, 250);
    return () => window.clearTimeout(save);
  }, [hasLoadedTransparency, transparency]);

  useEffect(() => {
    const moveResize = (event: MouseEvent) => {
      const drag = resizeDrag.current;
      if (!drag) return;
      event.preventDefault();
      const deltaX = event.screenX - drag.x;
      const deltaY = event.screenY - drag.y;
      if (deltaX === 0 && deltaY === 0) return;
      resizeDrag.current = { ...drag, x: event.screenX, y: event.screenY };
      window.clippi.cornermanOverlayResize(drag.handle, deltaX, deltaY).catch(() => {});
    };

    const endResize = () => {
      if (!resizeDrag.current) return;
      resizeDrag.current = null;
      window.clippi.cornermanOverlayResizeEnd().catch(() => {});
    };

    window.addEventListener("mousemove", moveResize);
    window.addEventListener("mouseup", endResize);
    window.addEventListener("blur", endResize);
    return () => {
      window.removeEventListener("mousemove", moveResize);
      window.removeEventListener("mouseup", endResize);
      window.removeEventListener("blur", endResize);
    };
  }, []);

  const dismiss = () => {
    window.clippi.cornermanOverlayDismiss().catch(() => {});
  };

  const toggleVoice = () => {
    const enabled = !voiceEnabled;
    const next = { ...voiceSettings.current, enabled };
    voiceSettings.current = next;
    setVoiceEnabled(enabled);
    voiceCoach.current?.configure(next);
    window.clippi.saveConfig({ cornermanVoiceEnabled: enabled }).catch(() => {});
  };

  const startResize = (handle: OverlayResizeHandle) => (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resizeDrag.current = { handle, x: event.screenX, y: event.screenY };
  };

  const overlayAlphas = getCornermanOverlayAlphas(transparency);

  return (
    <div
      className="overlay-toast"
      style={
        {
          "--cornerman-toast-alpha": overlayAlphas.toast,
          "--cornerman-head-alpha": overlayAlphas.header,
          "--cornerman-card-alpha": overlayAlphas.card,
        } as React.CSSProperties
      }
    >
      <div className="overlay-toast-head">
        <span className="overlay-toast-title">Cornerman</span>
        {status && status.gamesCount > 0 && (
          <span className="overlay-toast-score">
            {status.wins}-{status.losses} vs {status.opponentTag} · G{status.gamesCount}
          </span>
        )}
        <button className="overlay-toast-close" onClick={dismiss} aria-label="Dismiss">
          ✕
        </button>
      </div>
      <div className="overlay-toast-controls">
        <label className="overlay-transparency">
          <span>Transparency</span>
          <input
            type="range"
            min="15"
            max="85"
            value={transparency}
            onChange={(event) => setTransparency(clampCornermanOverlayTransparency(Number(event.target.value)))}
            aria-label="Popup transparency"
          />
          <span className="overlay-transparency-value">{transparency}%</span>
        </label>
        <button
          type="button"
          className={`overlay-voice-toggle${voiceEnabled ? " overlay-voice-toggle-on" : ""}`}
          aria-pressed={voiceEnabled}
          onClick={toggleVoice}
          title={voiceEnabled ? "Mute Cornerman voice" : "Enable Cornerman voice"}
        >
          Voice {voiceEnabled ? "on" : "off"}
        </button>
      </div>
      <div className="overlay-toast-body">
        {liveStats.snapshot && status?.active !== false && liveStatsSettings.current.enabled && (
          <CornermanLiveStatsStrip
            snapshot={liveStats.snapshot}
            receivedAt={liveStats.receivedAt}
            statIds={liveStatsSettings.current.overlayStatIds}
          />
        )}
        <CornermanLiveAlerts events={liveEvents} compact />
        {error ? (
          <div className="overlay-toast-waiting" role="alert">
            {error}
          </div>
        ) : text ? (
          <CoachingCards text={text} isStreaming={isStreaming} expandShorthand />
        ) : (
          <div className="overlay-toast-waiting">Waiting for the next game…</div>
        )}
      </div>
      {RESIZE_HANDLES.map((handle) => (
        <div
          key={handle}
          className={`overlay-resize-grip overlay-resize-grip-${handle}`}
          role="separator"
          aria-label={`Resize popup from ${handle} corner`}
          onMouseDown={startResize(handle)}
        />
      ))}
    </div>
  );
}
