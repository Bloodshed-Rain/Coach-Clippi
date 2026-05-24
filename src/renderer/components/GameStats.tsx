import { StatGroupCard } from "./ui/StatGroupCard";

export interface GameStatsInput {
  neutralWinRate?: number;
  lCancelRate?: number;
  conversionRate?: number;
  avgDamagePerOpening?: number;
  openingsPerKill?: number;
  recoverySuccessRate?: number;
  avgDeathPercent?: number;
  powerShieldCount?: number;
  edgeguardSuccessRate?: number;
  totalDamageDealt?: number;
  killMove?: string | null;
}

interface StatItem {
  label: string;
  value: string | number;
  good?: boolean;
  isText?: boolean;
}

interface StatGroup {
  group: string;
  items: StatItem[];
}

function fmt(n: number | undefined, digits: number = 1, unit: string = ""): string {
  return typeof n === "number" ? `${n.toFixed(digits)}${unit}` : "—";
}

function buildStats(g: GameStatsInput): StatGroup[] {
  const performance: StatGroup = {
    group: "Performance",
    items: [
      {
        label: "Neutral WR",
        value: fmt(g.neutralWinRate !== undefined ? g.neutralWinRate * 100 : undefined, 1, "%"),
        good: g.neutralWinRate !== undefined ? g.neutralWinRate >= 0.5 : false,
      },
      {
        label: "L-Cancel",
        value: fmt(g.lCancelRate !== undefined ? g.lCancelRate * 100 : undefined, 0, "%"),
        good: g.lCancelRate !== undefined ? g.lCancelRate >= 0.9 : false,
      },
      {
        label: "Conversion",
        value: fmt(g.conversionRate !== undefined ? g.conversionRate * 100 : undefined, 0, "%"),
        good: g.conversionRate !== undefined ? g.conversionRate >= 0.5 : false,
      },
      { label: "Dmg/Op", value: fmt(g.avgDamagePerOpening, 1) },
      { label: "Op/Kill", value: fmt(g.openingsPerKill, 1) },
    ],
  };

  const defense: StatGroup = {
    group: "Defense",
    items: [
      {
        label: "Recovery",
        value: fmt(g.recoverySuccessRate !== undefined ? g.recoverySuccessRate * 100 : undefined, 0, "%"),
        good: g.recoverySuccessRate !== undefined ? g.recoverySuccessRate >= 0.7 : false,
      },
      {
        label: "Death %",
        value: fmt(g.avgDeathPercent, 0, "%"),
        good: g.avgDeathPercent !== undefined ? g.avgDeathPercent >= 110 : false,
      },
      { label: "Power Shields", value: g.powerShieldCount ?? "—" },
    ],
  };

  const offense: StatGroup = {
    group: "Offense",
    items: [
      {
        label: "Edgeguard",
        value: fmt(g.edgeguardSuccessRate !== undefined ? g.edgeguardSuccessRate * 100 : undefined, 0, "%"),
        good: g.edgeguardSuccessRate !== undefined ? g.edgeguardSuccessRate >= 0.5 : false,
      },
      { label: "Dmg Dealt", value: fmt(g.totalDamageDealt, 0) },
    ],
  };

  if (g.killMove !== undefined) {
    offense.items.push({ label: "Kill Move", value: g.killMove ?? "—", isText: true });
  }

  return [performance, defense, offense];
}

export function GameStats({ game }: { game: GameStatsInput }) {
  const stats = buildStats(game);
  return (
    <>
      {stats.map((s) => (
        <StatGroupCard key={s.group} title={s.group} items={s.items} />
      ))}
    </>
  );
}
