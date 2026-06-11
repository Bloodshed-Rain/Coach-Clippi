import { useCallback, useEffect, useState } from "react";
import { CoachingCards } from "../components/CoachingCards";

interface HistoryCard {
  text: string;
  gameNumber: number;
  opponentTag: string;
  wins: number;
  losses: number;
}

export function Cornerman({ refreshKey: _refreshKey }: { refreshKey: number }) {
  const [status, setStatus] = useState<CornermanStatus | null>(null);
  const [streaming, setStreaming] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [history, setHistory] = useState<HistoryCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.clippi.cornermanStatus().then(setStatus).catch(() => {});
    const offStream = window.clippi.onCornermanStream((chunk) => {
      setIsStreaming(true);
      setError(null);
      setStreaming((prev) => prev + chunk);
    });
    const offCard = window.clippi.onCornermanCard((card) => {
      setIsStreaming(false);
      setStreaming("");
      setHistory((prev) => [card, ...prev]);
    });
    const offUpdate = window.clippi.onCornermanSetUpdate((s) => setStatus(s));
    const offError = window.clippi.onCornermanError((message) => {
      setIsStreaming(false);
      setStreaming(""); // no stream-end event on the error path — drop the orphaned partial text
      setError(message);
    });
    return () => {
      offStream();
      offCard();
      offUpdate();
      offError();
    };
  }, []);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const config = await window.clippi.loadConfig();
      const folder: string | undefined = config?.replayFolder ?? undefined;
      const tag: string | undefined = config?.targetPlayer ?? undefined;
      if (!folder || !tag) {
        setError("Set your replay folder and player tag in Settings first.");
        return;
      }
      setStatus(await window.clippi.cornermanStart(folder, tag));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      setStatus(await window.clippi.cornermanStop());
    } finally {
      setBusy(false);
    }
  }, []);

  const active = status?.active ?? false;
  const inSet = active && (status?.gamesCount ?? 0) > 0;

  return (
    <div>
      <div className="page-header">
        <h1>Cornerman</h1>
        <p>Live between-games coaching. Start a corner session, play — MAGI reads each game as it lands.</p>
      </div>

      <div className="card" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {active ? (
          <button className="btn" onClick={stop} disabled={busy}>
            End Corner Session
          </button>
        ) : (
          <button className="btn btn-primary" onClick={start} disabled={busy}>
            Start Corner Session
          </button>
        )}
        {inSet ? (
          <span>
            <strong>
              {status!.wins}-{status!.losses}
            </strong>{" "}
            vs <strong>{status!.opponentTag}</strong> · {status!.gamesCount} game{status!.gamesCount === 1 ? "" : "s"}
          </span>
        ) : active ? (
          <span>In your corner — waiting for the first game to finish…</span>
        ) : (
          <span>Inactive</span>
        )}
      </div>

      {error && (
        <div className="card sessions-error" role="alert">
          {error}
        </div>
      )}

      {isStreaming && (
        <div className="card dossier-panel">
          <div className="dossier-panel-head">
            <h3>Incoming adjustment…</h3>
          </div>
          <div className="dossier-panel-body">
            <CoachingCards text={streaming} isStreaming />
          </div>
        </div>
      )}

      {history.map((card, i) => (
        <div className="card dossier-panel" key={`${card.opponentTag}-${card.gameNumber}-${i}`}>
          <div className="dossier-panel-head">
            <h3>
              After Game {card.gameNumber} — {card.wins}-{card.losses} vs {card.opponentTag}
            </h3>
          </div>
          <div className="dossier-panel-body">
            <CoachingCards text={card.text} isStreaming={false} />
          </div>
        </div>
      ))}
    </div>
  );
}
