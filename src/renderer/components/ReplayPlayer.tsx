import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Play, Pause, RotateCcw, HelpCircle } from "lucide-react";
import { useReplayPlayerStore } from "../stores/useReplayPlayerStore";

type Bounds = { x: number; y: number; width: number; height: number };

const VK_SPACE = 0x20;

/**
 * Compute the screen-space bounds (in physical pixels, relative to MAGI's
 * top-level HWND client area) that Dolphin should be repositioned into.
 */
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

export function ReplayPlayer() {
  const open = useReplayPlayerStore((s) => s.open);
  const replayPath = useReplayPlayerStore((s) => s.replayPath);
  const playerCharacter = useReplayPlayerStore((s) => s.playerCharacter);
  const opponentCharacter = useReplayPlayerStore((s) => s.opponentCharacter);
  const startFrame = useReplayPlayerStore((s) => s.startFrame);
  const closePlayer = useReplayPlayerStore((s) => s.closePlayer);
  const openPlayer = useReplayPlayerStore((s) => s.openPlayer);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<"opening" | "ready" | "error" | "fallback">("opening");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Keep a ref synced to sessionId for cleanup paths that don't depend on it.
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Listen for main-process embed events.
  useEffect(() => {
    if (!open) return;
    const offReady = window.clippi.onEmbedReplayReady((sid) => {
      if (sid === sessionIdRef.current) {
        setStatus("ready");
      }
    });
    const offErr = window.clippi.onEmbedReplayError((sid, message) => {
      if (sid === sessionIdRef.current) {
        setStatus("error");
        setErrMsg(message);
      }
    });
    const offExited = window.clippi.onEmbedReplayExited((sid) => {
      if (sid === sessionIdRef.current) {
        closePlayer();
      }
    });
    return () => {
      offReady();
      offErr();
      offExited();
    };
  }, [open, closePlayer]);

  // Open / re-open the embedded session ONLY when the replay path or open flag changes.
  useEffect(() => {
    if (!open || !replayPath || !stageRef.current) return;

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
  }, [open, replayPath, startFrame]);

  // Tear down on close.
  useEffect(() => {
    if (open) return;
    const sid = sessionIdRef.current;
    if (sid != null) {
      window.clippi.embedReplayClose(sid).catch(() => {});
      sessionIdRef.current = null;
      setSessionId(null);
      setStatus("opening");
      setErrMsg(null);
    }
  }, [open]);

  // Reposition logic.
  useEffect(() => {
    if (!open || status !== "ready" || !sessionId || !stageRef.current) return;
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
  }, [open, status, sessionId]);

  // Esc closes / keyboard shortcuts.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key === "Escape") closePlayer();
      if (e.key === " ") {
        // Don't hijack Space when a button/link is focused — let it activate that control.
        if (target?.closest("button, a, [role='button']")) return;
        e.preventDefault();
        onTogglePause();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closePlayer, sessionId, isPaused]);

  const onTogglePause = () => {
    if (!sessionId) return;
    window.clippi.embedReplaySendKey(sessionId, VK_SPACE);
    setIsPaused(!isPaused);
  };

  const onRestart = () => {
    if (!replayPath) return;
    openPlayer(
      replayPath,
      0,
      playerCharacter ?? undefined,
      opponentCharacter ?? undefined,
    );
  };

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
    <AnimatePresence>
      {open && (
        <div className="replay-player-backdrop">
          <motion.div
            className="replay-player-modal"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <button className="replay-player-close" onClick={closePlayer} aria-label="Close player">
              <X size={18} />
            </button>

            <div className="replay-player-titlebar">
              <span className="replay-player-titlebar-label">
                {playerCharacter && opponentCharacter
                  ? `${playerCharacter} vs ${opponentCharacter}`
                  : "Replay Playback"}
              </span>
            </div>

            <div className="replay-player-stage" ref={stageRef}>
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
                    <div><kbd>Space</kbd> Pause / Play</div>
                    <div><kbd>Esc</kbd> Close</div>
                  </div>
                </div>
              </div>

              <div className="replay-player-footer-right">
                <button className="replay-player-dolphin" onClick={onOpenInDolphin} disabled={!replayPath}>
                  <ExternalLink size={13} />
                  Open Externally
                </button>
                <span className="replay-player-hint">esc to close</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
