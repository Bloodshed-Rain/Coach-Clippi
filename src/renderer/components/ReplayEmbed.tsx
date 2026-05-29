import { useEffect, useRef, useState } from "react";
import { ExternalLink, Play, Pause, RotateCcw, HelpCircle } from "lucide-react";

type Bounds = { x: number; y: number; width: number; height: number };

const VK_SPACE = 0x20;

export interface ReplayEmbedProps {
  replayPath: string;
  startFrame?: number | undefined;
  /** Bumped by the parent to force a fresh open of the same path. */
  reopenKey?: number | undefined;
  /** Called once when the user explicitly closes (Esc). Optional in inline use. */
  onCloseRequest?: (() => void) | undefined;
}

function getStageBounds(el: HTMLElement): Bounds {
  const r = el.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return {
    x: Math.round(r.left * dpr),
    y: Math.round(r.top * dpr),
    width: Math.round(r.width * dpr),
    height: Math.round(r.height * dpr),
  };
}

/**
 * Inline embedded-Dolphin surface. Owns its own IPC session keyed by
 * `replayPath` (and `reopenKey` when the parent wants to force a fresh open).
 *
 * Lifecycle is independent of any global store — the parent passes props,
 * this component opens/closes/repositions Dolphin to match.
 */
export function ReplayEmbed({ replayPath, startFrame, reopenKey, onCloseRequest }: ReplayEmbedProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<"opening" | "ready" | "error" | "fallback">("opening");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    const offReady = window.clippi.onEmbedReplayReady((sid) => {
      if (sid === sessionIdRef.current) setStatus("ready");
    });
    const offErr = window.clippi.onEmbedReplayError((sid, message) => {
      if (sid === sessionIdRef.current) {
        setStatus("error");
        setErrMsg(message);
      }
    });
    const offExited = window.clippi.onEmbedReplayExited((sid) => {
      if (sid === sessionIdRef.current) {
        sessionIdRef.current = null;
        setSessionId(null);
        setStatus("opening");
      }
    });
    return () => {
      offReady();
      offErr();
      offExited();
    };
  }, []);

  // Open / re-open when path or reopenKey changes.
  useEffect(() => {
    if (!replayPath || !stageRef.current) return;

    let cancelled = false;
    const stage = stageRef.current;

    const timeout = setTimeout(async () => {
      if (cancelled) return;

      const bounds = getStageBounds(stage);

      try {
        if (sessionIdRef.current != null) {
          await window.clippi.embedReplayClose(sessionIdRef.current).catch(() => {});
          sessionIdRef.current = null;
          setSessionId(null);
        }

        setStatus("opening");
        setErrMsg(null);
        setIsPaused(false);

        const result = await window.clippi.embedReplayOpen(replayPath, bounds, startFrame ?? undefined);
        if (cancelled) return;

        if (!result.embedded) {
          setStatus("fallback");
          setErrMsg(result.reason ?? "Embedded playback unavailable on this OS");
          if (startFrame != null) {
            await window.clippi.openInDolphinAtFrame(replayPath, startFrame).catch(() => {});
          } else {
            await window.clippi.openInDolphin(replayPath).catch(() => {});
          }
          return;
        }

        if (result.sessionId) {
          setSessionId(result.sessionId);
          sessionIdRef.current = result.sessionId;
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrMsg(err instanceof Error ? err.message : String(err));
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [replayPath, startFrame, reopenKey]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      const sid = sessionIdRef.current;
      if (sid != null) {
        window.clippi.embedReplayClose(sid).catch(() => {});
        sessionIdRef.current = null;
      }
    };
  }, []);

  // Reposition Dolphin to track the stage rect.
  useEffect(() => {
    if (status !== "ready" || !sessionId || !stageRef.current) return;
    const stage = stageRef.current;
    let raf: number | null = null;

    const sync = () => {
      raf = null;
      if (!sessionIdRef.current) return;
      const bounds = getStageBounds(stage);
      window.clippi.embedReplaySetBounds(sessionIdRef.current, bounds).catch(() => {});
    };
    const schedule = () => {
      if (raf != null) return;
      raf = requestAnimationFrame(sync);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(stage);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    schedule();

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [status, sessionId]);

  // Keyboard shortcuts. Skip when typing in inputs / coaching textarea.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key === "Escape" && onCloseRequest) onCloseRequest();
      if (e.key === " ") onTogglePause();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isPaused, onCloseRequest]);

  const onTogglePause = () => {
    if (!sessionId) return;
    window.clippi.embedReplaySendKey(sessionId, VK_SPACE);
    setIsPaused(!isPaused);
  };

  const [restartTick, setRestartTick] = useState(0);
  const onRestart = () => {
    // Force the open effect to re-fire by bumping a local counter.
    setRestartTick((n) => n + 1);
  };
  useEffect(() => {
    if (restartTick === 0) return;
    let cancelled = false;
    const stage = stageRef.current;
    if (!stage) return;
    (async () => {
      if (sessionIdRef.current != null) {
        await window.clippi.embedReplayClose(sessionIdRef.current).catch(() => {});
        sessionIdRef.current = null;
        setSessionId(null);
      }
      if (cancelled) return;
      setStatus("opening");
      setErrMsg(null);
      setIsPaused(false);
      const bounds = getStageBounds(stage);
      const result = await window.clippi.embedReplayOpen(replayPath, bounds, 0).catch((e) => {
        setStatus("error");
        setErrMsg(e instanceof Error ? e.message : String(e));
        return null;
      });
      if (cancelled || !result) return;
      if (!result.embedded) {
        setStatus("fallback");
        setErrMsg(result.reason ?? "Embedded playback unavailable on this OS");
        return;
      }
      if (result.sessionId) {
        setSessionId(result.sessionId);
        sessionIdRef.current = result.sessionId;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restartTick, replayPath]);

  const onOpenInDolphin = async () => {
    if (!replayPath) return;
    try {
      if (startFrame != null) {
        await window.clippi.openInDolphinAtFrame(replayPath, startFrame);
      } else {
        await window.clippi.openInDolphin(replayPath);
      }
    } catch (e) {
      console.error("Dolphin launch failed:", e);
    }
  };

  return (
    <div className="replay-embed">
      <div className="replay-player-stage replay-embed-stage" ref={stageRef}>
        {status === "opening" && (
          <div className="replay-player-loading">
            <div className="spinner" style={{ marginBottom: 12 }} />
            Launching Dolphin…
          </div>
        )}
        {status === "error" && (
          <div className="replay-player-error">
            <div>{errMsg ?? "Embed failed"}</div>
            <button className="replay-player-dolphin" onClick={onOpenInDolphin}>
              <ExternalLink size={13} />
              Open in Dolphin instead
            </button>
          </div>
        )}
        {status === "fallback" && (
          <div className="replay-player-error">
            <div>{errMsg ?? "Embedded playback unavailable on this OS"}</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Opened externally in Dolphin.</div>
          </div>
        )}
      </div>

      <div className="replay-player-footer">
        <div className="replay-player-controls">
          <button
            className="replay-control-btn"
            onClick={onTogglePause}
            disabled={status !== "ready"}
            title="Pause/Play (Space)"
          >
            {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
          </button>
          <button
            className="replay-control-btn"
            onClick={onRestart}
            disabled={status !== "ready"}
            title="Restart Replay"
          >
            <RotateCcw size={16} />
          </button>
          <div className="replay-hotkey-help" tabIndex={0} aria-label="Keyboard shortcuts">
            <button className="replay-control-btn" type="button" aria-haspopup="true">
              <HelpCircle size={14} />
            </button>
            <div className="replay-hotkey-help-tooltip" role="tooltip">
              <div>
                <kbd>Space</kbd> Pause / Play
              </div>
            </div>
          </div>
        </div>

        <div className="replay-player-footer-right">
          <button className="replay-player-dolphin" onClick={onOpenInDolphin} disabled={!replayPath}>
            <ExternalLink size={13} />
            Open Externally
          </button>
        </div>
      </div>
    </div>
  );
}
