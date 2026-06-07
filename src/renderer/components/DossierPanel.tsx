import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { CoachingCards } from "./CoachingCards";

/**
 * Streamed opponent scouting report. Mirrors CoachingPanel's streaming flow
 * (subscribe → accumulate → render via CoachingCards) but calls generateDossier
 * and reuses the shared analyze:stream channels.
 */
export function DossierPanel({ opponentKey, opponentTag }: { opponentKey: string; opponentTag: string }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const run = useCallback(async () => {
    setLoading(true);
    setText("");
    setError(null);
    const streamId = crypto.randomUUID();
    const off = window.clippi.onAnalysisStream((chunk, sid) => {
      if (sid !== undefined && sid !== streamId) return;
      setText((prev) => prev + chunk);
    });
    const offEnd = window.clippi.onAnalysisStreamEnd((sid) => {
      if (sid !== undefined && sid !== streamId) return;
      setLoading(false);
    });
    try {
      const result = await window.clippi.generateDossier(opponentKey, undefined, streamId);
      if (result) setText(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      off();
      offEnd();
    }
  }, [opponentKey]);

  // Regenerate whenever the selected opponent changes.
  useEffect(() => {
    run();
  }, [run]);

  // Autoscroll as chunks arrive (honors reduced motion).
  useEffect(() => {
    if (!loading) return;
    const el = bodyRef.current;
    if (!el) return;
    if (reduceMotion) el.scrollTop = el.scrollHeight;
    else el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [text, loading, reduceMotion]);

  return (
    <div className="dossier-panel">
      <div className="dossier-panel-head">
        <h3>Scouting Report — {opponentTag}</h3>
        <button className="btn btn-ghost" onClick={run} disabled={loading}>
          {loading ? "Scouting…" : "Regenerate"}
        </button>
      </div>
      <div className="dossier-panel-body" ref={bodyRef}>
        {error ? (
          <div className="sessions-error" role="alert">
            {error}{" "}
            <button className="btn btn-ghost" onClick={run}>
              Retry
            </button>
          </div>
        ) : (
          <CoachingCards text={text} isStreaming={loading} />
        )}
      </div>
    </div>
  );
}
