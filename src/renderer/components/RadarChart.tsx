import {
  Radar, RadarChart as RechartsRadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import type { RadarStats } from "../radarStats";

interface RadarProps {
  stats: RadarStats;
}

function RadarTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const { axis, value } = payload[0].payload;
  return (
    <div style={{
      background: "var(--bg-glass-strong)",
      backdropFilter: "blur(12px)",
      border: "1px solid var(--border-glow)",
      padding: "8px 12px",
      fontSize: 12,
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{ color: "var(--text-dim)", fontSize: 10, marginBottom: 2 }}>{axis}</div>
      <div style={{ color: "var(--accent)", fontWeight: 800 }}>{Math.round(value)}</div>
    </div>
  );
}

export function PlayerRadar({ stats }: RadarProps) {
  const data = [
    { axis: "Neutral", value: stats.neutral },
    { axis: "Punish", value: stats.punish },
    { axis: "Tech Skill", value: stats.techSkill },
    { axis: "Defense", value: stats.defense },
    { axis: "Edgeguard", value: stats.edgeguard },
    { axis: "Consistency", value: stats.consistency },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <defs>
          <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--plasma-a)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--plasma-b)" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="radarStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--plasma-a)" />
            <stop offset="100%" stopColor="var(--plasma-b)" />
          </linearGradient>
        </defs>
        <PolarGrid stroke="var(--border)" strokeDasharray="3 3" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "var(--text-dim)", fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)" } as any}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <Radar
          dataKey="value"
          stroke="url(#radarStroke)"
          fill="url(#radarFill)"
          fillOpacity={1}
          strokeWidth={2.5}
          dot={{ r: 4, fill: "var(--accent)", strokeWidth: 2, stroke: "var(--bg-card)" } as any}
        />
        <Tooltip content={<RadarTooltip />} />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
