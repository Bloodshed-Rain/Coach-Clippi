import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { CoachingCards } from "../components/CoachingCards";
import { CornermanLiveAlerts } from "../components/CornermanLiveAlerts";
import {
  clampCornermanOverlayTransparency,
  DEFAULT_CORNERMAN_OVERLAY_TRANSPARENCY,
  getCornermanOverlayAlphas,
} from "../../cornermanOverlayTransparency";
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
  const resizeDrag = useRef<{ handle: OverlayResizeHandle; x: number; y: number } | null>(null);
  const liveEventTimers = useRef<number[]>([]);

  useEffect(() => {
    document.body.classList.add("overlay-mode");
    window.clippi
      .cornermanStatus()
      .then(setStatus)
      .catch(() => {});
    window.clippi
      .loadConfig()
      .then((config) => {
        setTransparency(clampCornermanOverlayTransparency(config?.cornermanOverlayTransparency));
      })
      .catch(() => {})
      .finally(() => setHasLoadedTransparency(true));
    const offStream = window.clippi.onCornermanStream((chunk) => {
      setError(null);
      setIsStreaming(true);
      setText((prev) => prev + chunk);
    });
    const offCard = window.clippi.onCornermanCard((card) => {
      setIsStreaming(false);
      setText(card.text);
    });
    const offUpdate = window.clippi.onCornermanSetUpdate((s) => {
      setStatus(s);
      // New game registered — clear the previous card so the next stream starts clean.
      setText("");
    });
    const offLiveEvent = window.clippi.onCornermanLiveEvent((event) => {
      setLiveEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)].slice(0, 4));
      const timer = window.setTimeout(() => {
        setLiveEvents((prev) => prev.filter((e) => e.id !== event.id));
      }, 20_000);
      liveEventTimers.current.push(timer);
    });
    const offError = window.clippi.onCornermanError((message) => {
      setIsStreaming(false);
      setText("");
      setError(message);
    });
    return () => {
      document.body.classList.remove("overlay-mode");
      offStream();
      offCard();
      offUpdate();
      offLiveEvent();
      offError();
      for (const timer of liveEventTimers.current) window.clearTimeout(timer);
      liveEventTimers.current = [];
    };
  }, []);

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
      </div>
      <div className="overlay-toast-body">
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
