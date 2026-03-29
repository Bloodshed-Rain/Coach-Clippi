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
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "8px 12px",
      fontSize: 12,
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{ color: "var(--text-dim)", fontSize: 10, marginBottom: 2 }}>{axis}</div>
      <div style={{ color: "var(--accent)", fontWeight: 700 }}>{Math.round(value)}</div>
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
          stroke="var(--accent)"
          fill="var(--accent)"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={{ r: 3.5, fill: "var(--bg-card)", strokeWidth: 2, stroke: "var(--accent)" } as any}
        />
        <Tooltip content={<RadarTooltip />} />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
