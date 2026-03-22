import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlitchText } from "../hooks";

interface DetectedSet {
  opponentTag: string;
  opponentCharacter: string;
  gameIds: number[];
  startedAt: string;
  wins: number;
  losses: number;
  draws: number;
}

type View = "sets" | "opponents";

interface OpponentRecord {
  opponentTag: string;
  opponentConnectCode: string | null;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  characters: string;
  lastPlayed: string | null;
}

function WinRateIndicator({ rate }: { rate: number }) {
  const pct = rate * 100;
  const color = pct >= 60 ? "var(--green)" : pct >= 45 ? "var(--yellow)" : "var(--red)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color }}>
        {pct.toFixed(0)}%
      </span>
      <div className="winrate-bar">
        <div className="winrate-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Sessions({ refreshKey }: { refreshKey: number }) {
  const [view, setView] = useState<View>("sets");
  const [sets, setSets] = useState<DetectedSet[]>([]);
  const [opponents, setOpponents] = useState<OpponentRecord[]>([]);
  const [opponentSearch, setOpponentSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const title = useGlitchText("SESSIONS", 500);

  useEffect(() => {
    async function load() {
      try {
        const [s, o] = await Promise.all([
          window.clippi.getSets(),
          window.clippi.getOpponents(),
        ]);
        setSets(s);
        setOpponents(o);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      }
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  const handleSearch = async () => {
    try {
      if (!opponentSearch.trim()) {
        const o = await window.clippi.getOpponents();
        setOpponents(o);
      } else {
        const o = await window.clippi.getOpponents(opponentSearch.trim());
        setOpponents(o);
      }
    } catch (err) {
      console.error("Opponent search failed:", err);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" style={{ margin: "0 auto 12px" }} />LOADING SESSION DATA...</div>;

  if (sets.length === 0 && opponents.length === 0) {
    return (
      <div className="empty-state">
        <h2>NO SESSIONS DETECTED</h2>
        <p>Import replays to populate your engagement history.</p>
      </div>
    );
  }

  return (
    <div>
      <motion.div
        className="page-header"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1>{title}</h1>
        <p>
          // <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)" }}>{sets.length}</span> SETS DETECTED |{" "}
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)" }}>{opponents.length}</span> UNIQUE TARGETS
        </p>
      </motion.div>

      <div className="tab-bar" role="tablist">
        {(["sets", "opponents"] as View[]).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            className={`tab ${view === v ? "active" : ""}`}
            onClick={() => setView(v)}
          >
            {v === "sets" ? "SETS" : "OPPONENTS"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === "sets" && (
          <motion.div
            key="sets"
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {sets.length === 0 ? (
              <p style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 12 }}>No sets detected yet.</p>
            ) : (
              <div className="data-table-wrap">
              <table className="data-table">
                <colgroup>
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "14%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>Character</th>
                    <th>Games</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sets].reverse().map((set, i) => {
                    const total = set.gameIds.length;
                    const result = set.wins > set.losses ? "W" : set.losses > set.wins ? "L" : "T";
                    return (
                      <tr key={i}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                          {new Date(set.startedAt).toLocaleDateString()}
                        </td>
                        <td style={{ fontWeight: 700 }}>{set.opponentTag}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{set.opponentCharacter}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{total}</td>
                        <td>
                          <span className="record-win">{set.wins}</span>
                          {" - "}
                          <span className="record-loss">{set.losses}</span>
                          {set.draws > 0 && (
                            <>
                              {" - "}
                              <span style={{ color: "var(--text-dim)" }}>{set.draws}</span>
                            </>
                          )}
                        </td>
                        <td>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 28,
                            height: 28,
                            fontSize: 11,
                            fontWeight: 900,
                            fontFamily: "var(--font-display, var(--font-mono))",
                            letterSpacing: "1px",
                            background: result === "W" ? "rgba(var(--green-rgb), 0.12)" : result === "L" ? "rgba(var(--red-rgb), 0.12)" : "var(--bg-hover)",
                            color: result === "W" ? "var(--green)" : result === "L" ? "var(--red)" : "var(--text-dim)",
                            border: `1px solid ${result === "W" ? "rgba(var(--green-rgb), 0.25)" : result === "L" ? "rgba(var(--red-rgb), 0.25)" : "var(--border)"}`,
                            boxShadow: result === "W" ? "0 0 12px rgba(var(--green-rgb), 0.15)" : result === "L" ? "0 0 12px rgba(var(--red-rgb), 0.15)" : "none",
                            clipPath: "polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))",
                          }}>
                            {result}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </motion.div>
        )}

        {view === "opponents" && (
          <motion.div
            key="opponents"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="settings-row">
                <input
                  value={opponentSearch}
                  onChange={(e) => setOpponentSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="SEARCH BY TAG OR CONNECT CODE..."
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "1px",
                    clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
                  }}
                />
                <button className="btn" onClick={handleSearch}>SEARCH</button>
              </div>
            </div>
            <div className="card">
              {opponents.length === 0 ? (
                <p style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 12 }}>No targets found.</p>
              ) : (
                <div className="data-table-wrap">
                <table className="data-table">
                  <colgroup>
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Opponent</th>
                      <th>Code</th>
                      <th>Characters</th>
                      <th>Games</th>
                      <th>Record</th>
                      <th>Win Rate</th>
                      <th>Last Played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opponents.map((o, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{o.opponentTag}</td>
                        <td style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                          {o.opponentConnectCode ?? ""}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{o.characters}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{o.totalGames}</td>
                        <td>
                          <span className="record-win">{o.wins}</span>
                          {" - "}
                          <span className="record-loss">{o.losses}</span>
                        </td>
                        <td><WinRateIndicator rate={o.winRate} /></td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)" }}>
                          {o.lastPlayed ? new Date(o.lastPlayed).toLocaleDateString() : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
