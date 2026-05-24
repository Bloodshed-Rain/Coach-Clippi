/**
 * Radar stat computation — 8 skill axes.
 *
 * Axes:
 * - Neutral: win rate in neutral interactions
 * - Punish: damage per opening + conversion rate
 * - Tech Skill: L-cancel rate (60%) + wavedash/dashDance movement (40%)
 * - Defense: avg death percent (50%) + recovery success rate (50%)
 * - Edgeguard: edgeguard success rate
 * - Consistency: low variance in neutral win rate across games
 * - Mixups: entropy of ledge, knockdown, and shield pressure options
 * - DI Quality: combo DI score (50%) + survival DI score (50%)
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
  ledgeEntropy?: number;
  knockdownEntropy?: number;
  shieldPressureEntropy?: number;
  diSurvivalScore?: number;
  diComboScore?: number;
  playedAt?: string | null;
}

export interface RadarStats {
  neutral: number;
  punish: number;
  techSkill: number;
  defense: number;
  edgeguard: number;
  consistency: number;
  mixups: number;
  diQuality: number;
}

export function computeRadarStats(games: RadarGameStats[]): RadarStats {
  if (games.length === 0) {
    return { neutral: 0, punish: 0, techSkill: 0, defense: 0, edgeguard: 0, consistency: 0, mixups: 0, diQuality: 0 };
  }

  const avg = (fn: (g: RadarGameStats) => number) => games.reduce((s, g) => s + fn(g), 0) / games.length;

  // Neutral: straight win rate
  const neutralWR = avg((g) => g.neutralWinRate);
  const neutral = clamp(neutralWR * 100);

  // Punish: damage per opening (50%) + conversion rate (50%)
  const dpo = avg((g) => g.avgDamagePerOpening);
  const convRate = avg((g) => g.conversionRate);
  const punish = clamp((dpo / 60) * 50 + convRate * 50);

  // Tech Skill: L-cancel (60%) + movement tech (40%)
  const lcancel = avg((g) => g.lCancelRate);
  const wavedashes = avg((g) => g.wavedashCount ?? 0);
  const dashDance = avg((g) => g.dashDanceFrames ?? 0);
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

  // Mixups: average of ledge, knockdown, and shield pressure entropy
  // Max entropy for ledge options (~5 options) is ~1.6, knockdown (~4) is ~1.4
  // Normalize each to 0-100 scale, then average
  const ledgeE = avg((g) => g.ledgeEntropy ?? 0);
  const knockdownE = avg((g) => g.knockdownEntropy ?? 0);
  const shieldE = avg((g) => g.shieldPressureEntropy ?? 0);
  const mixups = clamp((ledgeE / 1.6) * 33 + (knockdownE / 1.4) * 33 + (shieldE / 1.5) * 34);

  // DI Quality: combo DI (50%) + survival DI (50%)
  // Both are 0-1 scores where 0.5 is baseline
  const comboDI = avg((g) => g.diComboScore ?? 0.5);
  const survivalDI = avg((g) => g.diSurvivalScore ?? 0.5);
  const diQuality = clamp(comboDI * 100 * 0.5 + survivalDI * 100 * 0.5);

  return { neutral, punish, techSkill, defense, edgeguard, consistency, mixups, diQuality };
}

/** Filter games to a date window and compute radar stats for comparison */
export function computeRadarForPeriod(
  games: RadarGameStats[],
  afterDate: string,
  beforeDate?: string,
): RadarStats | null {
  const filtered = games.filter((g) => {
    if (!g.playedAt) return false;
    if (g.playedAt < afterDate) return false;
    if (beforeDate && g.playedAt >= beforeDate) return false;
    return true;
  });
  if (filtered.length < 3) return null;
  return computeRadarStats(filtered);
}

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0));
}
