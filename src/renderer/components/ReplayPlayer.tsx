import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Play, Pause, RotateCcw, StepForward, StepBack, HelpCircle } from "lucide-react";
import { useReplayPlayerStore } from "../stores/useReplayPlayerStore";

import { useGlobalStore } from "../stores/useGlobalStore";
import { ReplayScrubber } from "./ReplayScrubber";
import { estimateFrame } from "../utils/scrubber";

type Bounds = { x: number; y: number; width: number; height: number };

const VK_SPACE = 0x20;
const VK_LEFT = 0x25;
const VK_RIGHT = 0x27;

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
  const seekToken = useReplayPlayerStore((s) => s.seekToken);
  const closePlayer = useReplayPlayerStore((s) => s.closePlayer);
  const openPlayer = useReplayPlayerStore((s) => s.openPlayer);
  const totalFrames = useReplayPlayerStore((s) => s.totalFrames);
  const seekState = useReplayPlayerStore((s) => s.seekState);
  const setSeekState = useReplayPlayerStore((s) => s.setSeekState);
  const seekToFrame = useReplayPlayerStore((s) => s.seekToFrame);

  const drawerGameId = useGlobalStore((s) => s.drawerGameId);
  const isCoachingOpen = useGlobalStore((s) => s.isCoachingOpen);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<"opening" | "ready" | "error" | "fallback">("opening");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [displayFrame, setDisplayFrame] = useState(0);
  const playAnchorRef = useRef<{ frame: number; wallTimeMs: number; pausedAtMs: number | null }>({
    frame: 0,
    wallTimeMs: Date.now(),
    pausedAtMs: null,
  });

  const stageRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionPathRef = useRef<string | null>(null);
  const lastSeekTokenRef = useRef<number>(-1);

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
        setSeekState("idle"); // clears seek overlay after respawn-mode seek completes
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
    const offSeeked = window.clippi.onEmbedReplaySeeked((sid) => {
      if (sid === sessionIdRef.current) setSeekState("idle");
    });
    return () => {
      offReady();
      offErr();
      offExited();
      offSeeked();
    };
  }, [open, closePlayer, setSeekState]);

  // Open / re-open the embedded session ONLY when the replay path or open
  // flag changes. Seeks within an open session route through the seek
  // effect below — they don't kill+reopen unconditionally.
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
          sessionPathRef.current = null;
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
          sessionPathRef.current = replayPath;
          // Anchor playback estimate at the requested frame.
          playAnchorRef.current = {
            frame: startFrame ?? 0,
            wallTimeMs: Date.now(),
            pausedAtMs: null,
          };
          setDisplayFrame(startFrame ?? 0);
          lastSeekTokenRef.current = seekToken;
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
    // Intentionally NOT depending on startFrame/seekToken — those are
    // handled by the seek effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, replayPath]);

  // Seek within an open session: triggered by seekToken changes after the
  // initial open completed.
  useEffect(() => {
    if (!open || !sessionId || seekToken === lastSeekTokenRef.current) return;
    if (startFrame == null) return;

    const targetFrame = startFrame;
    lastSeekTokenRef.current = seekToken;

    let cancelled = false;
    void (async () => {
      try {
        const res = (await window.clippi.embedReplaySeek(sessionId, targetFrame)) as
          | { ok: boolean; mode?: "live" | "respawn"; reason?: string }
          | boolean;
        if (cancelled) return;
        // If the main process rejected the seek (no active session, etc.),
        // clear the seeking overlay immediately so it doesn't stick forever.
        if (typeof res === "object" && !res.ok) {
          setSeekState("idle");
          return;
        }
        // Re-anchor playback estimate at the new frame.
        playAnchorRef.current = {
          frame: targetFrame,
          wallTimeMs: Date.now(),
          pausedAtMs: isPaused ? Date.now() : null,
        };
        setDisplayFrame(targetFrame);
        // For live-seek mode there's no ready event; clear seek state now.
        // For respawn mode the ready / seeked listener will clear it.
        if (typeof res === "object" && res?.mode === "live") {
          setSeekState("idle");
        }
      } catch {
        if (!cancelled) setSeekState("idle");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekToken, sessionId, open]);

  // Tear down on close.
  useEffect(() => {
    if (open) return;
    const sid = sessionIdRef.current;
    if (sid != null) {
      window.clippi.embedReplayClose(sid).catch(() => {});
      sessionIdRef.current = null;
      sessionPathRef.current = null;
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

  // Drive displayFrame from a rAF loop while playing. Re-anchored on every
  // pause/play/seek, so drift is bounded.
  useEffect(() => {
    if (!open || status !== "ready") return;
    let raf: number | null = null;
    const tick = () => {
      const a = playAnchorRef.current;
      const f = estimateFrame(a.frame, a.wallTimeMs, Date.now(), isPaused, a.pausedAtMs);
      setDisplayFrame(f);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [open, status, isPaused]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      // Don't hijack typing in coaching panels, settings inputs, etc.
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
        onTogglePause();
      }
      if (e.key === "ArrowLeft") {
        onStepBack();
      }
      if (e.key === "ArrowRight") {
        onStepForward();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closePlayer, sessionId]);

  const onTogglePause = () => {
    if (!sessionId) return;
    window.clippi.embedReplaySendKey(sessionId, VK_SPACE);
    // Read pause state from the anchor (always current) rather than from
    // closure-captured `isPaused`, so the keyboard-Space path doesn't see
    // stale state from an old render.
    const a = playAnchorRef.current;
    const wasPaused = a.pausedAtMs != null;
    const nowPaused = !wasPaused;
    setIsPaused(nowPaused);
    if (nowPaused) {
      // Freeze the estimate at "now".
      playAnchorRef.current = {
        ...a,
        pausedAtMs: Date.now(),
      };
    } else {
      // Resume: anchor at the frame the puck was frozen on (recomputed from
      // the existing anchor, not from React state — keydown closure may be
      // stale).
      const frozenFrame = estimateFrame(a.frame, a.wallTimeMs, Date.now(), true, a.pausedAtMs);
      playAnchorRef.current = {
        frame: frozenFrame,
        wallTimeMs: Date.now(),
        pausedAtMs: null,
      };
    }
  };

  const onStepForward = () => {
    if (!sessionId) return;
    window.clippi.embedReplaySendKey(sessionId, VK_RIGHT);
  };

  const onStepBack = () => {
    if (!sessionId) return;
    window.clippi.embedReplaySendKey(sessionId, VK_LEFT);
  };

  const onRestart = () => {
    if (!replayPath) return;
    openPlayer(
      replayPath,
      0,
      playerCharacter ?? undefined,
      opponentCharacter ?? undefined,
      totalFrames ?? undefined,
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
        <div
          className="replay-player-backdrop"
          style={{
            right: drawerGameId != null ? "min(720px, 90vw)" : 0,
            left: drawerGameId != null && isCoachingOpen ? "min(440px, 30vw)" : 0,
            width: "auto"
          }}
        >
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
              {seekState === "seeking" && (
                <div className="replay-player-seeking-overlay">Seeking…</div>
              )}
            </div>

            {totalFrames != null && totalFrames > 0 && (
              <ReplayScrubber
                currentFrame={displayFrame}
                totalFrames={totalFrames}
                onSeek={(frame) => seekToFrame(frame)}
              />
            )}

            <div className="replay-player-footer">
              <div className="replay-player-controls">
                <button
                  className="replay-control-btn"
                  onClick={onStepBack}
                  disabled={status !== "ready"}
                  title="Frame Rewind (Left Arrow)"
                >
                  <StepBack size={14} />
                </button>
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
                  onClick={onStepForward}
                  disabled={status !== "ready"}
                  title="Frame Advance (Right Arrow)"
                >
                  <StepForward size={14} />
                </button>
                <div style={{ width: "4px" }} />
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
                    <div><kbd>←</kbd> <kbd>→</kbd> Frame step</div>
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
