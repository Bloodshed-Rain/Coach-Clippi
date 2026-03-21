/**
 * Shared radar stat computation used by Profile and Characters pages.
 *
 * Axes:
 * - Neutral: win rate in neutral interactions
 * - Punish: damage per opening + conversion rate
 * - Tech Skill: L-cancel rate (60%) + wavedash/dashDance movement (40%)
 * - Defense: avg death percent (50%) + recovery success rate (50%)
 * - Edgeguard: edgeguard success rate
 * - Consistency: low variance in neutral win rate across games
 */

export interface RadarGameStats {
  neutralWinRate: number;
  lCancelRate: number;
  openingsPerKill: number;
  avgDamagePerOpening: number;
  conversionRate: number;
  avgDeathPercent: number;
  recoverySuccessRate?: number;
  edgeguardSuccessRate?: number;
  wavedashCount?: number;
  dashDanceFrames?: number;
}

export interface RadarStats {
  neutral: number;
  punish: number;
  techSkill: number;
  defense: number;
  edgeguard: number;
  consistency: number;
}

export function computeRadarStats(games: RadarGameStats[]): RadarStats {
  if (games.length === 0) {
    return { neutral: 0, punish: 0, techSkill: 0, defense: 0, edgeguard: 0, consistency: 0 };
  }

  const avg = (fn: (g: RadarGameStats) => number) =>
    games.reduce((s, g) => s + fn(g), 0) / games.length;

  // Neutral: straight win rate
  const neutralWR = avg((g) => g.neutralWinRate);
  const neutral = clamp(neutralWR * 100);

  // Punish: damage per opening (50%) + conversion rate (50%)
  const dpo = avg((g) => g.avgDamagePerOpening);
  const convRate = avg((g) => g.conversionRate);
  const punish = clamp((dpo / 60) * 50 + convRate * 50);

  // Tech Skill: L-cancel (60%) + movement tech (40%)
  // Movement = wavedash count + dash dance frames, normalized
  const lcancel = avg((g) => g.lCancelRate);
  const wavedashes = avg((g) => g.wavedashCount ?? 0);
  const dashDance = avg((g) => g.dashDanceFrames ?? 0);
  // Normalize movement: wavedashes ~30/game is high, dash dance ~2000 frames is high
  const movementScore = clamp((wavedashes / 30) * 50 + (dashDance / 2000) * 50);
  const techSkill = clamp(lcancel * 100 * 0.6 + movementScore * 0.4);

  // Defense: avg death percent (50%) + recovery success rate (50%)
  const deathPct = avg((g) => g.avgDeathPercent);
  const recoveryRate = avg((g) => g.recoverySuccessRate ?? 0.5);
  const defense = clamp((deathPct / 150) * 50 + recoveryRate * 100 * 0.5);

  // Edgeguard: success rate directly
  const egRate = avg((g) => g.edgeguardSuccessRate ?? 0);
  const edgeguard = clamp(egRate * 100);

  // Consistency: inverse of neutral win rate standard deviation
  const nwRates = games.map((g) => g.neutralWinRate);
  const nwMean = nwRates.reduce((a, b) => a + b, 0) / nwRates.length;
  const variance = nwRates.reduce((s, v) => s + (v - nwMean) ** 2, 0) / nwRates.length;
  const stdDev = Math.sqrt(variance);
  const consistency = clamp((1 - stdDev * 3) * 100);

  return { neutral, punish, techSkill, defense, edgeguard, consistency };
}

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0));
}
