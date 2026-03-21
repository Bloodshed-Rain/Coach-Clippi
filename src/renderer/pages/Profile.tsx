import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PlayerRadar } from "../components/RadarChart";
import { useGlitchText } from "../hooks";
import { computeRadarStats, type RadarStats } from "../radarStats";

interface MatchupRecord {
  opponentCharacter: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
}

interface StageRecord {
  stage: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
}

interface OverallRecord {
  wins: number;
  losses: number;
  totalGames: number;
}

function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{value}</>;
}

function getArchetype(stats: RadarStats): { name: string; description: string } {
  const { neutral, punish, techSkill, defense, edgeguard, consistency } = stats;
  const max = Math.max(neutral, punish, techSkill, defense, edgeguard, consistency);

  if (max === punish && punish > 60) return { name: "PUNISH DEMON", description: "Maximum damage off every opening" };
  if (max === neutral && neutral > 60) return { name: "NEUTRAL ACE", description: "Dominant in the footsies game" };
  if (max === techSkill && techSkill > 85) return { name: "TECH MONSTER", description: "Relentless execution" };
  if (max === defense && defense > 65) return { name: "WALL", description: "Nearly impossible to eliminate" };
  if (max === edgeguard && edgeguard > 60) return { name: "EDGE LORD", description: "Lethal at the ledge" };
  if (max === consistency && consistency > 70) return { name: "ROCK", description: "Steady, reliable, untiltable" };
  return { name: "ALL-ROUNDER", description: "Balanced across all dimensions" };
}

function EntropyBar({ label, value, description }: { label: string; value: number; description: string }) {
  // Entropy 0 = completely predictable, ~1.5+ = highly mixed
  // Normalize to 0-100 where 100 = max mixup
  const pct = Math.min(100, (value / 1.6) * 100);
  const color = pct < 30 ? "var(--red)" : pct < 60 ? "var(--yellow)" : "var(--green)";
  const verdict = pct < 30 ? "PREDICTABLE" : pct < 60 ? "MODERATE" : "MIXED UP";

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 800, fontFamily: "var(--font-mono)", color }}>{verdict}</span>
      </div>
      <div className="winrate-bar" style={{ height: 6 }}>
        <div className="winrate-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 3, fontFamily: "var(--font-mono)" }}>{description}</div>
    </div>
  );
}

function HabitPanel() {
  const [habits, setHabits] = useState<{ ledge: number; knockdown: number; shield: number } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const games = await window.clippi.getRecentGames(100);
        if (games.length === 0) return;
        const avg = (key: string) => games.reduce((s: number, g: any) => s + (g[key] ?? 0), 0) / games.length;
        setHabits({
          ledge: avg("ledgeEntropy"),
          knockdown: avg("knockdownEntropy"),
          shield: avg("shieldPressureEntropy"),
        });
      } catch {}
    }
    load();
  }, []);

  if (!habits) return null;

  return (
    <div className="card">
      <div className="card-title">HABIT PREDICTABILITY</div>
      <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 14, fontFamily: "var(--font-mono)" }}>
        Low entropy = your opponent can read you. Mix up your options.
      </p>
      <EntropyBar label="After Ledge Grab" value={habits.ledge} description="Neutral getup, roll, jump, drop, attack variety" />
      <EntropyBar label="After Knockdown" value={habits.knockdown} description="Tech in place, tech roll, missed tech, getup attack variety" />
      <EntropyBar label="Under Shield Pressure" value={habits.shield} description="OOS options: grab, nair, roll, wavedash, jump variety" />
    </div>
  );
}

export function Profile({ refreshKey }: { refreshKey: number }) {
  const [record, setRecord] = useState<OverallRecord | null>(null);
  const [matchups, setMatchups] = useState<MatchupRecord[]>([]);
  const [stages, setStages] = useState<StageRecord[]>([]);
  const [radarStats, setRadarStats] = useState<RadarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const title = useGlitchText("PROFILE", 500);

  useEffect(() => {
    async function load() {
      try {
        const [r, m, s, games] = await Promise.all([
          window.clippi.getOverallRecord(),
          window.clippi.getMatchupRecords(),
          window.clippi.getStageRecords(),
          window.clippi.getRecentGames(100),
        ]);
        setRecord(r);
        setMatchups(m);
        setStages(s);
        setRadarStats(computeRadarStats(games));
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  if (loading) return <div className="loading"><div className="spinner" style={{ margin: "0 auto 12px" }} />LOADING OPERATOR PROFILE...</div>;

  if (!record || record.totalGames === 0) {
    return (
      <div className="empty-state">
        <h2>NO OPERATOR DATA</h2>
        <p>Import replays to construct your combat profile.</p>
      </div>
    );
  }

  const winRate = ((record.wins / record.totalGames) * 100).toFixed(1);
  const archetype = radarStats ? getArchetype(radarStats) : null;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="page-header">
          <h1>{title}</h1>
          {archetype && (
            <p>
              // ARCHETYPE: <span style={{ fontFamily: "var(--font-display, var(--font-mono))", fontWeight: 800, color: "var(--accent)", letterSpacing: "2px" }}>{archetype.name}</span>
              {" "}&mdash; {archetype.description}
            </p>
          )}
        </div>
      </motion.div>

      {/* Hero stats + radar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="profile-hero">
          <div className="profile-record-card">
            <div className="profile-record-big">
              <span className="record-win"><CountUp target={record.wins} /></span>
              <span className="profile-record-sep">-</span>
              <span className="record-loss"><CountUp target={record.losses} /></span>
            </div>
            <div className="stat-label" style={{ textAlign: "center", marginTop: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{record.totalGames}</span> ENGAGEMENTS
              {" "}&middot;{" "}
              <span style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                color: Number(winRate) >= 50 ? "var(--green)" : "var(--red)",
              }}>
                {winRate}%
              </span>
            </div>
          </div>
          {radarStats && (
            <div className="profile-radar-card">
              <div className="card-title">COMBAT PROFILE</div>
              <PlayerRadar stats={radarStats} />
            </div>
          )}
        </div>
      </motion.div>

      {/* Habit Predictability — entropy-based */}
      {radarStats && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <HabitPanel />
        </motion.div>
      )}

      {matchups.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="card">
            <div className="card-title">MATCHUP RECORDS</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>vs Character</th>
                  <th>Games</th>
                  <th>Record</th>
                  <th>Win Rate</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {matchups.map((m, i) => {
                  const wr = m.winRate * 100;
                  return (
                    <motion.tr
                      key={m.opponentCharacter}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.025, duration: 0.35 }}
                    >
                      <td style={{ fontWeight: 700 }}>{m.opponentCharacter}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{m.totalGames}</td>
                      <td>
                        <span className="record-win">{m.wins}</span>
                        {" - "}
                        <span className="record-loss">{m.losses}</span>
                      </td>
                      <td style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        color: wr >= 60 ? "var(--green)" : wr >= 45 ? "var(--yellow)" : "var(--red)",
                        textShadow: `0 0 8px ${wr >= 60 ? "rgba(var(--green-rgb), 0.2)" : wr >= 45 ? "rgba(var(--yellow-rgb), 0.2)" : "rgba(var(--red-rgb), 0.2)"}`,
                      }}>
                        {wr.toFixed(0)}%
                      </td>
                      <td>
                        <div className="winrate-bar">
                          <div className="winrate-bar-fill" style={{ width: `${wr}%` }} />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {stages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="card">
            <div className="card-title">STAGE RECORDS</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Games</th>
                  <th>Record</th>
                  <th>Win Rate</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s, i) => {
                  const wr = s.winRate * 100;
                  return (
                    <motion.tr
                      key={s.stage}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.025, duration: 0.35 }}
                    >
                      <td style={{ fontWeight: 700 }}>{s.stage}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{s.totalGames}</td>
                      <td>
                        <span className="record-win">{s.wins}</span>
                        {" - "}
                        <span className="record-loss">{s.losses}</span>
                      </td>
                      <td style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        color: wr >= 60 ? "var(--green)" : wr >= 45 ? "var(--yellow)" : "var(--red)",
                        textShadow: `0 0 8px ${wr >= 60 ? "rgba(var(--green-rgb), 0.2)" : wr >= 45 ? "rgba(var(--yellow-rgb), 0.2)" : "rgba(var(--red-rgb), 0.2)"}`,
                      }}>
                        {wr.toFixed(0)}%
                      </td>
                      <td>
                        <div className="winrate-bar">
                          <div className="winrate-bar-fill" style={{ width: `${wr}%` }} />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
