import type { MotionStyle } from "framer-motion";

/** Uniform props for every character-detail module. Modules fetch their own
 *  data via hooks in hooks/queries.ts (react-query dedupes by key). */
export interface CharacterModuleProps {
  character: string;
  color: string;
  glowColor: string;
}

/** Inline vars consumed by color-mix(...) accents, same pattern as the radar card. */
export function accentVars(color: string, glowColor: string): MotionStyle {
  return { "--char-color": color, "--char-glow": glowColor } as MotionStyle;
}

/** "62%" with a fixed guard for empty denominators. */
export function pct(num: number, den: number, digits = 0): string {
  if (den <= 0) return "—";
  return `${((num / den) * 100).toFixed(digits)}%`;
}

/** "12/52" denominator display — every rate on this page shows its n. */
export function ratio(num: number, den: number): string {
  return `${num}/${den}`;
}

/** snake_case / kebab-case / SCREAMING keys → Title Case labels. */
export function prettyLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Sort rows by a preferred key order, unknown keys appended in given order. */
export function orderBy<T>(rows: T[], key: (row: T) => string, preferred: readonly string[]): T[] {
  const rank = new Map(preferred.map((k, i) => [k, i]));
  return [...rows].sort((a, b) => (rank.get(key(a)) ?? preferred.length) - (rank.get(key(b)) ?? preferred.length));
}

export function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}
