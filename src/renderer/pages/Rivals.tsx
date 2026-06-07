import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOpponents, useOpponentDetail } from "../hooks/queries";
import { EmptyState } from "../components/ui/EmptyState";
import { Card } from "../components/ui/Card";
import { WinrateBar } from "../components/ui/WinrateBar";
import { DataTable } from "../components/ui/DataTable";
import { ResultDot } from "../components/ui/ResultDot";
import { DossierPanel } from "../components/DossierPanel";
import "../styles/rivals.css";

export function Rivals({ refreshKey: _ }: { refreshKey: number }) {
  const navigate = useNavigate();
  const { data: opponents = [], isLoading, isError } = useOpponents();
  const [selected, setSelected] = useState<string | null>(null);

  // Surface the most-played opponents first — those are the real rivals.
  const sorted = useMemo(
    () => [...opponents].sort((a, b) => (b.totalGames ?? 0) - (a.totalGames ?? 0)),
    [opponents],
  );

  if (selected) return <RivalDetail opponentKey={selected} onBack={() => setSelected(null)} />;

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner loading-spinner" />
        Loading rivals…
      </div>
    );
  }
  if (isError) {
    return <div className="sessions-error">Failed to load rivals. Please try again.</div>;
  }
  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No rivals yet"
        sub="Rivals appear once you've played opponents. Import replays to start scouting."
        cta={{ label: "Open Settings", onClick: () => navigate("/settings") }}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Rivals</h1>
        <p>Scout an opponent you keep running into.</p>
      </div>
      <div className="rivals-grid">
        {sorted.map((o) => {
          const key: string = o.opponentConnectCode ?? o.opponentTag;
          return (
            <button key={key} className="rival-card" onClick={() => setSelected(key)}>
              <div className="rival-card-tag">{o.opponentTag}</div>
              <div className="rival-card-record">
                {o.wins}W-{o.losses}L · {Math.round((o.winRate ?? 0) * 100)}% · {o.totalGames} games
              </div>
              <WinrateBar value={o.winRate ?? 0} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RivalDetail({ opponentKey, onBack }: { opponentKey: string; onBack: () => void }) {
  const navigate = useNavigate();
  const { data: detail, isLoading, isError } = useOpponentDetail(opponentKey);

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner loading-spinner" />
        Loading dossier…
      </div>
    );
  }
  if (isError || !detail) {
    return (
      <div>
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
          ← All Rivals
        </button>
        <div className="sessions-error">Failed to load this rival.</div>
      </div>
    );
  }

  const games: any[] = detail.games ?? [];

  return (
    <div>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
        ← All Rivals
      </button>
      <div className="page-header">
        <h1>{detail.opponentTag}</h1>
        <p>
          {detail.wins}W-{detail.losses}L · {Math.round((detail.winRate ?? 0) * 100)}% over {detail.totalGames} games
        </p>
      </div>
      <div className="rival-detail-grid">
        <Card title="Recent games vs this rival">
          <DataTable colWidths={["32px", undefined, undefined, "76px"]}>
            <thead>
              <tr>
                <th>Res</th>
                <th>Matchup</th>
                <th>Stage</th>
                <th>Neutral</th>
              </tr>
            </thead>
            <tbody>
              {games.slice(0, 20).map((g) => {
                const result: "win" | "loss" | "draw" =
                  g.result === "win" ? "win" : g.result === "loss" ? "loss" : "draw";
                return (
                  <tr
                    key={g.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => navigate(`/game/${g.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/game/${g.id}`);
                      }
                    }}
                    aria-label={`Open ${result} vs ${detail.opponentTag} on ${g.stage}`}
                  >
                    <td>
                      <ResultDot result={result} aria-hidden />
                    </td>
                    <td>
                      {g.playerCharacter} vs {g.opponentCharacter}
                    </td>
                    <td>{g.stage}</td>
                    <td>{Math.round((g.neutralWinRate ?? 0) * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </Card>
        <DossierPanel opponentKey={opponentKey} opponentTag={detail.opponentTag} />
      </div>
    </div>
  );
}
