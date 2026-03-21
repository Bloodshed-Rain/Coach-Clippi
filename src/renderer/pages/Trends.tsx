import { useEffect, useState, useMemo } from "react";
import { useTypewriter, useGlitchText } from "../hooks";
import { motion } from "framer-motion";
import Markdown from "react-markdown";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
} from "recharts";

interface RecentGame {
  playedAt: string | null;
  playerCharacter: string;
  opponentCharacter: string;
  opponentTag: string;
  result: string;
  neutralWinRate: number;
  lCancelRate: number;
  openingsPerKill: number;
  avgDamagePerOpening: number;
  conversionRate: number;
  avgDeathPercent: number;
  powerShieldCount: number;
  edgeguardSuccessRate: number;
  recoverySuccessRate: number;
}

interface MetricConfig {
  key: keyof RecentGame;
  label: string;
  format: (v: number) => string;
  color: string;
  isPercent: boolean;
  higherBetter: boolean;
  maxValue?: number;
}

const METRICS: MetricConfig[] = [
  { key: "neutralWinRate", label: "Neutral Win Rate", format: (v) => `${(v * 100).toFixed(1)}%`, color: "#6366f1", isPercent: true, higherBetter: true },
  { key: "lCancelRate", label: "L-Cancel Rate", format: (v) => `${(v * 100).toFixed(1)}%`, color: "#22c55e", isPercent: true, higherBetter: true },
  { key: "conversionRate", label: "Conversion Rate", format: (v) => `${(v * 100).toFixed(1)}%`, color: "#eab308", isPercent: true, higherBetter: true },
  { key: "avgDamagePerOpening", label: "Dmg / Opening", format: (v) => v.toFixed(1), color: "#f97316", isPercent: false, higherBetter: true, maxValue: 60 },
  { key: "openingsPerKill", label: "Openings / Kill", format: (v) => Number.isFinite(v) ? v.toFixed(1) : "N/A", color: "#ef4444", isPercent: false, higherBetter: false, maxValue: 15 },
  { key: "avgDeathPercent", label: "Avg Death %", format: (v) => `${v.toFixed(0)}%`, color: "#8b5cf6", isPercent: false, higherBetter: true, maxValue: 200 },
  { key: "powerShieldCount", label: "Power Shields", format: (v) => v.toFixed(1), color: "#14b8a6", isPercent: false, higherBetter: true, maxValue: 20 },
  { key: "edgeguardSuccessRate", label: "Edgeguard Rate", format: (v) => `${(v * 100).toFixed(1)}%`, color: "#f43f5e", isPercent: true, higherBetter: true },
  { key: "recoverySuccessRate", label: "Recovery Rate", format: (v) => `${(v * 100).toFixed(1)}%`, color: "#06b6d4", isPercent: true, higherBetter: true },
];

function StatGauge({ value, label, format, color, higherBetter, delta, isPercent, maxValue }: {
  value: number;
  label: string;
  format: (v: number) => string;
  color: string;
  higherBetter: boolean;
  delta: number;
  isPercent: boolean;
  maxValue?: number;
}) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const fillPercent = isPercent ? safeValue * 100 : Math.min(100, Math.max(0, (safeValue / (maxValue ?? 60)) * 100));
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (fillPercent / 100) * circumference;
  const improving = higherBetter ? delta > 0 : delta < 0;
  const stable = Math.abs(delta) < 0.01;

  return (
    <div className="stat-box" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "18px 14px" }}>
      <svg width="84" height="84" viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="44" cy="44" r="36" fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx="44" cy="44" r="36" fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="square"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
            filter: `drop-shadow(0 0 8px ${color}50)`,
          }}
        />
      </svg>
      <div style={{ marginTop: -68, marginBottom: 26, textAlign: "center" }}>
        <div className="stat-value" style={{ color, fontSize: 16, textShadow: `0 0 12px ${color}40` }}>{format(value)}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="stat-label" style={{ fontSize: 8 }}>{label}</div>
        {!stable && (
          <span
            className={improving ? "trend-up" : "trend-down"}
            style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 800 }}
          >
            {improving ? "+" : ""}
            {isPercent ? (delta * 100).toFixed(1) + "pp" : delta.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}

function rollingAvg(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

function buildTrendSummary(
  chronological: RecentGame[],
  firstHalf: RecentGame[],
  secondHalf: RecentGame[],
  avg: (rows: RecentGame[], key: keyof RecentGame) => number,
): string {
  const totalGames = chronological.length;
  const wins = chronological.filter((g) => g.result === "win").length;
  const losses = totalGames - wins;
  const winRate = ((wins / totalGames) * 100).toFixed(1);

  const matchupCounts: Record<string, number> = {};
  for (const g of chronological) {
    const key = `${g.playerCharacter} vs ${g.opponentCharacter}`;
    matchupCounts[key] = (matchupCounts[key] ?? 0) + 1;
  }
  const topMatchups = Object.entries(matchupCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mu, count]) => `${mu} (${count} games)`)
    .join(", ");

  const lines: string[] = [
    `Player's recent performance across ${totalGames} games:`,
    `Overall record: ${wins}W-${losses}L (${winRate}% win rate)`,
    `Most played matchups: ${topMatchups}`,
    "",
    "Stat trends (first half of games -> second half):",
  ];

  for (const m of METRICS) {
    const early = avg(firstHalf, m.key);
    const late = avg(secondHalf, m.key);
    const delta = late - early;
    const improving = m.higherBetter ? delta > 0 : delta < 0;
    const direction = Math.abs(delta) < 0.01 ? "stable" : improving ? "IMPROVING" : "DECLINING";
    lines.push(`  ${m.label}: ${m.format(early)} -> ${m.format(late)} [${direction}]`);
  }

  const last5 = chronological.slice(-5);
  const last5Record = last5.filter((g) => g.result === "win").length;
  lines.push("");
  lines.push(`Last ${last5.length} games: ${last5Record}W-${last5.length - last5Record}L`);

  const recentAvg = (key: keyof RecentGame) =>
    last5.reduce((s, g) => s + (g[key] as number), 0) / last5.length;
  lines.push(`Last 5 neutral win rate: ${(recentAvg("neutralWinRate") * 100).toFixed(1)}%`);
  lines.push(`Last 5 L-cancel rate: ${(recentAvg("lCancelRate") * 100).toFixed(1)}%`);
  lines.push(`Last 5 avg death%: ${recentAvg("avgDeathPercent").toFixed(0)}%`);

  return lines.join("\n");
}

function ChartTooltip({ active, payload, label, metric }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: "var(--bg-glass-strong)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid var(--border-glow)",
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
    }}>
      <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 4, fontFamily: "var(--font-mono)", letterSpacing: "1px" }}>
        GAME {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: metric.color, fontFamily: "var(--font-mono)" }}>
        {metric.format(payload[0].value)}
      </div>
    </div>
  );
}

export function Trends({ refreshKey }: { refreshKey: number }) {
  const [games, setGames] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentary, setCommentary] = useState<string | null>(null);
  const { displayText: typedCommentary, isTyping } = useTypewriter(commentary ?? "", 4, !!commentary);
  const [analyzingTrends, setAnalyzingTrends] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const title = useGlitchText("TRENDS", 500);

  useEffect(() => {
    async function load() {
      try {
        const g = await window.clippi.getRecentGames(200);
        setGames(g);
      } catch (err) {
        console.error("Failed to load trends:", err);
      }
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  if (loading) return <div className="loading"><div className="spinner" style={{ margin: "0 auto 12px" }} />LOADING TRAJECTORY DATA...</div>;

  if (games.length < 4) {
    return (
      <div className="empty-state">
        <h2>INSUFFICIENT DATA</h2>
        <p>Import at least 4 engagements to generate trend analysis.</p>
      </div>
    );
  }

  const chronological = useMemo(() => [...games].reverse(), [games]);

  const chartData = useMemo(() => chronological.map((g, i) => ({
    game: i + 1,
    ...Object.fromEntries(
      METRICS.map((m) => {
        const raw = chronological.map((r) => r[m.key] as number);
        const smoothed = rollingAvg(raw, 5);
        return [m.key, smoothed[i]];
      }),
    ),
  })), [chronological]);

  const half = Math.floor(chronological.length / 2);
  const firstHalf = chronological.slice(0, half);
  const secondHalf = chronological.slice(half);

  function avg(rows: RecentGame[], key: keyof RecentGame): number {
    const vals = rows.map((r) => r[key] as number);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const handleGetCommentary = async () => {
    setAnalyzingTrends(true);
    setTrendError(null);
    try {
      const summary = buildTrendSummary(chronological, firstHalf, secondHalf, avg);
      const result = await window.clippi.analyzeTrends(summary);
      setCommentary(result);
    } catch (err: unknown) {
      setTrendError(err instanceof Error ? err.message : String(err));
    }
    setAnalyzingTrends(false);
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="page-header">
          <h1>{title}</h1>
          <p>
            // <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)" }}>{chronological.length}</span> ENGAGEMENTS | 5-GAME ROLLING AVG
          </p>
        </div>
      </motion.div>

      {/* MAGI Oracle */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <div className="card clippi-card">
          <div className="clippi-header">
            <div className="clippi-avatar">M</div>
            <div>
              <div className="clippi-name">MAGI</div>
              <div className="clippi-subtitle">
                {commentary ? "// TRAJECTORY ANALYSIS COMPLETE" : "// AWAITING ANALYSIS REQUEST"}
              </div>
            </div>
            {!commentary && !analyzingTrends && (
              <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={handleGetCommentary}>
                ANALYZE TRAJECTORY
              </button>
            )}
          </div>

          {analyzingTrends && (
            <div className="analyze-loading">
              <div className="spinner" />
              <span>PROCESSING TRAJECTORY DATA...</span>
            </div>
          )}

          {trendError && (
            <p style={{ color: "var(--red)", fontSize: 12, marginTop: 12, fontFamily: "var(--font-mono)" }}>{trendError}</p>
          )}

          {commentary && (
            <div className="clippi-commentary">
              <div className="analysis-text">
                <Markdown>{typedCommentary}</Markdown>
                {isTyping && <span className="typing-cursor">|</span>}
              </div>
              {!isTyping && (
                <button
                  className="btn"
                  style={{ marginTop: 14 }}
                  onClick={handleGetCommentary}
                  disabled={analyzingTrends}
                >
                  REFRESH ANALYSIS
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Gauge grid */}
      <div className="trends-gauge-grid">
        {METRICS.map((m, index) => {
          const early = avg(firstHalf, m.key);
          const late = avg(secondHalf, m.key);
          const delta = late - early;
          return (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <StatGauge
                value={late}
                label={m.label}
                format={m.format}
                color={m.color}
                higherBetter={m.higherBetter}
                delta={delta}
                isPercent={m.isPercent}
                maxValue={m.maxValue}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Charts with gradient area fills */}
      {METRICS.map((m, index) => (
        <motion.div
          key={m.key}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + index * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="card">
            <div className="card-title">{m.label}</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={m.color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={m.color} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="game"
                  tick={{ fill: "var(--text-dim)", fontSize: 9, fontFamily: "var(--font-mono)" } as any}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-dim)", fontSize: 9, fontFamily: "var(--font-mono)" } as any}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  tickFormatter={(v: number) => m.isPercent ? `${(v * 100).toFixed(0)}%` : v.toFixed(1)}
                  domain={m.isPercent ? [0, 1] : ["auto", "auto"]}
                  width={42}
                />
                <Tooltip content={<ChartTooltip metric={m} />} />
                <Area
                  type="monotone"
                  dataKey={m.key}
                  stroke={m.color}
                  strokeWidth={2}
                  fill={`url(#grad-${m.key})`}
                  dot={false}
                  activeDot={{ r: 4, fill: m.color, stroke: "var(--bg-card)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
