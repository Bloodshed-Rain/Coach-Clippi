// Live running stats for Cornerman. Pure module — NO runtime imports, so both
// the Electron main process AND the two renderer windows (main window + the
// transparent overlay) can bundle it. slippi-js shapes are imported as TYPES
// only (erased at compile time); everything else is inlined.
//
// The snapshot is a stateless whole-game read: buildLiveStatsSnapshot() is a
// pure function of a getStats() result, re-derived every poll. That makes it
// automatically correct across the monitor's stalled-parser rebuilds and immune
// to the seen-key dedup bugs the event path has to guard against.
//
// One subtlety this module handles deliberately: slippi assigns each
// conversion's openingType lazily on the first getStats()/fetch() and never
// revisits it. Under the monitor's 500ms polling a conversion is classified
// while still OPEN, which permanently mislabels counter-attacks as neutral-wins
// and makes live neutralWins drift from a fresh post-game parse. We therefore
// ignore conv.openingType and re-derive it here every snapshot from the
// conversions' CURRENT endFrames (classifyOpeningTypes). See the project memory
// note "slippi-live-getstats-pitfalls".

import type { ActionCountsType, ConversionType, OverallType, StatsType } from "@slippi/slippi-js/node";

// ── Public identifiers & shapes ───────────────────────────────────────

export type CornermanLiveStatId =
  | "lCancelRate"
  | "openingsPerKill"
  | "damagePerOpening"
  | "neutralWins"
  | "grabSuccess"
  | "wavedashes"
  | "wavelands"
  | "dashDances"
  | "rolls"
  | "spotDodges"
  | "airDodges"
  | "ledgegrabs";

/** How a stat's value is rendered. */
export type CornermanLiveStatFormat = "percent" | "countTotal" | "decimal" | "integer" | "count";

/** Which direction is "good" — drives delta glyph coloring, not the glyph itself. */
export type CornermanLiveStatDirection = "higher" | "lower";

export interface CornermanLiveBaseline {
  /** Number of prior games the averages were computed over. */
  gamesSampled: number;
  lCancelRate: number | null;
  openingsPerKill: number | null;
  avgDamagePerOpening: number | null;
  neutralWinRate: number | null;
}

/** Baseline fields a stat can compare against (subset of CornermanLiveBaseline). */
export type CornermanLiveBaselineKey = "lCancelRate" | "openingsPerKill" | "avgDamagePerOpening" | "neutralWinRate";

export interface CornermanLiveStatDef {
  id: CornermanLiveStatId;
  /** Full words, for the Cornerman page table. */
  label: string;
  /** Terse, for the overlay tile. */
  shortLabel: string;
  format: CornermanLiveStatFormat;
  direction: CornermanLiveStatDirection;
  /** DB baseline field to compare against, or null when no honest baseline exists
   *  (pure counters, or stats whose post-game DB unit differs — dashDances is a
   *  slippi count while game_stats stores dash_dance_frames; wavelands is never
   *  persisted). Encoding null here stops anyone wiring a bogus delta later. */
  baselineKey: CornermanLiveBaselineKey | null;
  /** Minimum `total` (denominator; for openingsPerKill this is kills) before a
   *  delta glyph is allowed — small samples swing wildly and would flicker. */
  minSample: number;
  /** Delta magnitude, in the value's own unit, below which no glyph shows. */
  noiseBand: number;
}

export interface CornermanLiveStatValue {
  id: CornermanLiveStatId;
  /** null = undefined-so-far (no kills yet, no L-cancel attempts). UI shows "—",
   *  never a fake 0 — a real 0 and "no attempts yet" mean different things. */
  value: number | null;
  /** Numerator, or the raw count for pure counters. */
  count: number;
  /** Denominator; 0 for pure counters. */
  total: number;
}

/** Minimal player shape the snapshot builder needs. The monitor's
 *  CornermanLivePlayer is structurally assignable to this. */
export interface CornermanLiveStatsPlayer {
  playerIndex: number;
  tag: string;
  character: string;
  isTarget: boolean;
}

export interface CornermanLivePlayerStats {
  playerIndex: number;
  tag: string;
  character: string;
  isTarget: boolean;
  /** Every registry stat, in registry order; consumers pick which to show. */
  stats: CornermanLiveStatValue[];
}

export interface CornermanLiveSnapshot {
  /** Game identity — the tracker's file path. A new game is a new gameKey; the
   *  renderer replaces its snapshot wholesale when this changes. */
  gameKey: string;
  phase: "live" | "ended";
  latestFrame: number;
  /** Elapsed match time in seconds (counts UP from game start; not the in-game
   *  countdown clock). Matches the app's frameToTimestamp convention. */
  elapsedSeconds: number;
  /** Both players; the overlay renders the target only, the page shows both. */
  players: CornermanLivePlayerStats[];
  /** Stamped by the main-process handler from the DB; null off the monitor. */
  baseline: CornermanLiveBaseline | null;
}

export interface CornermanLiveStatDelta {
  /** Direction the value moved vs baseline. */
  glyph: "▲" | "▼";
  /** Whether that move is good (drives color: green vs amber). */
  isBetter: boolean;
  /** Signed value − baseline, in the value's unit. */
  delta: number;
}

// ── Registry ──────────────────────────────────────────────────────────

export const LIVE_STAT_DEFS: CornermanLiveStatDef[] = [
  {
    id: "lCancelRate",
    label: "L-cancel success",
    shortLabel: "L-CANCEL",
    format: "percent",
    direction: "higher",
    baselineKey: "lCancelRate",
    minSample: 8, // L-cancel attempts
    noiseBand: 0.05, // 5 percentage points
  },
  {
    id: "openingsPerKill",
    label: "Openings per kill",
    shortLabel: "OPEN/KILL",
    format: "decimal",
    direction: "lower",
    baselineKey: "openingsPerKill",
    minSample: 2, // kills — at 1 kill this just measures elapsed game, not efficiency
    noiseBand: 0.5,
  },
  {
    id: "damagePerOpening",
    label: "Damage per opening",
    shortLabel: "DMG/OPEN",
    format: "integer",
    direction: "higher",
    baselineKey: "avgDamagePerOpening",
    minSample: 5, // openings
    noiseBand: 5,
  },
  {
    id: "neutralWins",
    label: "Neutral wins",
    shortLabel: "NEUTRAL",
    format: "countTotal",
    direction: "higher",
    baselineKey: "neutralWinRate",
    minSample: 10, // neutral interactions (mine + opponent's)
    noiseBand: 0.05,
  },
  {
    id: "grabSuccess",
    label: "Grab success",
    shortLabel: "GRAB",
    format: "percent",
    direction: "higher",
    baselineKey: null, // not persisted post-game
    minSample: 4,
    noiseBand: 0.05,
  },
  {
    id: "wavedashes",
    label: "Wavedashes",
    shortLabel: "WAVEDASH",
    format: "count",
    direction: "higher",
    baselineKey: null,
    minSample: 0,
    noiseBand: 0,
  },
  {
    id: "wavelands",
    label: "Wavelands",
    shortLabel: "WAVELAND",
    format: "count",
    direction: "higher",
    baselineKey: null,
    minSample: 0,
    noiseBand: 0,
  },
  {
    id: "dashDances",
    label: "Dash dances",
    shortLabel: "DASHDANCE",
    format: "count",
    direction: "higher",
    baselineKey: null,
    minSample: 0,
    noiseBand: 0,
  },
  {
    id: "rolls",
    label: "Rolls",
    shortLabel: "ROLLS",
    format: "count",
    direction: "lower",
    baselineKey: null,
    minSample: 0,
    noiseBand: 0,
  },
  {
    id: "spotDodges",
    label: "Spot dodges",
    shortLabel: "SPOTDODGE",
    format: "count",
    direction: "lower",
    baselineKey: null,
    minSample: 0,
    noiseBand: 0,
  },
  {
    id: "airDodges",
    label: "Air dodges",
    shortLabel: "AIRDODGE",
    format: "count",
    direction: "higher",
    baselineKey: null,
    minSample: 0,
    noiseBand: 0,
  },
  {
    id: "ledgegrabs",
    label: "Ledge grabs",
    shortLabel: "LEDGE",
    format: "count",
    direction: "higher",
    baselineKey: null,
    minSample: 0,
    noiseBand: 0,
  },
];

export const LIVE_STAT_DEF_BY_ID: Record<CornermanLiveStatId, CornermanLiveStatDef> = LIVE_STAT_DEFS.reduce(
  (acc, def) => {
    acc[def.id] = def;
    return acc;
  },
  {} as Record<CornermanLiveStatId, CornermanLiveStatDef>,
);

export const ALL_LIVE_STAT_IDS: CornermanLiveStatId[] = LIVE_STAT_DEFS.map((d) => d.id);

export function isCornermanLiveStatId(value: unknown): value is CornermanLiveStatId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(LIVE_STAT_DEF_BY_ID, value);
}

// ── Value computation ─────────────────────────────────────────────────

/** -39; mirrors slippi-js Frames.FIRST_PLAYABLE (inlined to keep this module
 *  runtime-import-free). The game clock starts here. */
const FIRST_PLAYABLE_FRAME = -39;

/** Rounded rate in [0,1], or null when there's nothing to divide. Matches
 *  pipeline/helpers.ts ratio() digit-for-digit when total > 0 (post-game masks
 *  the total===0 case to 0 for DB storage; the live UI shows "—" instead). */
function safeRate(count: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((count / total) * 10000) / 10000;
}

function counterValue(id: CornermanLiveStatId, count: number): CornermanLiveStatValue {
  return { id, value: count, count, total: 0 };
}

/**
 * Faithful stateless reimplementation of slippi-js's _populateConversionTypes,
 * using each conversion's CURRENT endFrame. Returns openingType per conversion.
 * Recomputing every snapshot (rather than trusting the sticky conv.openingType)
 * makes mid-game and final neutral-win counts equal a fresh single-fetch
 * post-game parse.
 */
export function classifyOpeningTypes(conversions: readonly ConversionType[]): Map<ConversionType, string> {
  const result = new Map<ConversionType, string>();
  // endFrame of the most recent conversion (in startFrame order) in which each
  // player was the VICTIM (conversion.playerIndex === victim).
  const lastEndFrameByVictim = new Map<number, number | undefined>();

  // Group by startFrame preserving array order, then walk groups ascending —
  // matching slippi's groupBy + orderBy.
  const groups = new Map<number, ConversionType[]>();
  for (const conversion of conversions) {
    const existing = groups.get(conversion.startFrame);
    if (existing) existing.push(conversion);
    else groups.set(conversion.startFrame, [conversion]);
  }
  const startFrames = [...groups.keys()].sort((a, b) => a - b);

  for (const startFrame of startFrames) {
    const group = groups.get(startFrame) ?? [];
    const isTrade = group.length >= 2;
    for (const conversion of group) {
      lastEndFrameByVictim.set(conversion.playerIndex, conversion.endFrame);
      if (isTrade) {
        result.set(conversion, "trade");
        continue;
      }
      const lastMove = conversion.moves[conversion.moves.length - 1];
      const attackerIndex = lastMove ? lastMove.playerIndex : conversion.playerIndex;
      const oppEndFrame = lastEndFrameByVictim.get(attackerIndex);
      // slippi uses truthiness: both undefined and 0 are "no prior combo".
      const isCounterAttack = Boolean(oppEndFrame && oppEndFrame > conversion.startFrame);
      result.set(conversion, isCounterAttack ? "counter-attack" : "neutral-win");
    }
  }
  return result;
}

/** Neutral-win share for `attackerIndex`, mirroring slippi getOpeningRatio for
 *  the "neutral-win" type: count = my neutral-win openings, total = mine +
 *  opponents'. Openings are attributed to the first mover (moves[0].playerIndex). */
function computeNeutralWins(
  conversions: readonly ConversionType[],
  openingTypes: Map<ConversionType, string>,
  attackerIndex: number,
  opponentIndices: readonly number[],
): { count: number; total: number } {
  let mine = 0;
  let opponents = 0;
  for (const conversion of conversions) {
    if (openingTypes.get(conversion) !== "neutral-win") continue;
    const opener = conversion.moves[0]?.playerIndex;
    if (opener == null) continue;
    if (opener === attackerIndex) mine++;
    else if (opponentIndices.includes(opener)) opponents++;
  }
  return { count: mine, total: mine + opponents };
}

function buildPlayerStats(
  player: CornermanLiveStatsPlayer,
  actionCounts: ActionCountsType | undefined,
  overall: OverallType | undefined,
  conversions: readonly ConversionType[],
  openingTypes: Map<ConversionType, string>,
  opponentIndices: readonly number[],
): CornermanLivePlayerStats {
  const stats: CornermanLiveStatValue[] = [];

  // Rate stats from actionCounts / overall. Every field is guarded because a
  // non-1v1 game yields an empty actionCounts array (the monitor suppresses
  // those, but the function stays total regardless of caller discipline).
  if (overall) {
    const opk = overall.openingsPerKill;
    stats.push({ id: "openingsPerKill", value: opk.ratio ?? null, count: opk.count, total: opk.total });
    const dpo = overall.damagePerOpening;
    stats.push({ id: "damagePerOpening", value: dpo.ratio ?? null, count: Math.round(dpo.count), total: dpo.total });
  } else {
    stats.push({ id: "openingsPerKill", value: null, count: 0, total: 0 });
    stats.push({ id: "damagePerOpening", value: null, count: 0, total: 0 });
  }

  const nw = computeNeutralWins(conversions, openingTypes, player.playerIndex, opponentIndices);
  const neutral: CornermanLiveStatValue = {
    id: "neutralWins",
    value: safeRate(nw.count, nw.total),
    count: nw.count,
    total: nw.total,
  };

  if (actionCounts) {
    const lSuccess = actionCounts.lCancelCount.success;
    const lTotal = lSuccess + actionCounts.lCancelCount.fail;
    stats.push({ id: "lCancelRate", value: safeRate(lSuccess, lTotal), count: lSuccess, total: lTotal });
    const gSuccess = actionCounts.grabCount.success;
    const gTotal = gSuccess + actionCounts.grabCount.fail;
    stats.push(neutral);
    stats.push({ id: "grabSuccess", value: safeRate(gSuccess, gTotal), count: gSuccess, total: gTotal });
    stats.push(counterValue("wavedashes", actionCounts.wavedashCount));
    stats.push(counterValue("wavelands", actionCounts.wavelandCount));
    stats.push(counterValue("dashDances", actionCounts.dashDanceCount));
    stats.push(counterValue("rolls", actionCounts.rollCount));
    stats.push(counterValue("spotDodges", actionCounts.spotDodgeCount));
    stats.push(counterValue("airDodges", actionCounts.airDodgeCount));
    stats.push(counterValue("ledgegrabs", actionCounts.ledgegrabCount));
  } else {
    stats.push({ id: "lCancelRate", value: null, count: 0, total: 0 });
    stats.push(neutral);
    stats.push({ id: "grabSuccess", value: null, count: 0, total: 0 });
    for (const id of [
      "wavedashes",
      "wavelands",
      "dashDances",
      "rolls",
      "spotDodges",
      "airDodges",
      "ledgegrabs",
    ] as const) {
      stats.push(counterValue(id, 0));
    }
  }

  // Emit in canonical registry order so consumers can rely on positional/id lookup.
  const byId = new Map(stats.map((s) => [s.id, s]));
  const ordered = ALL_LIVE_STAT_IDS.map((id) => byId.get(id) ?? counterValue(id, 0));

  return {
    playerIndex: player.playerIndex,
    tag: player.tag,
    character: player.character,
    isTarget: player.isTarget,
    stats: ordered,
  };
}

/**
 * Build a complete live-stats snapshot from a getStats() result. Pure and
 * stateless — safe to call every poll. `baseline` is left null here and stamped
 * later by the main-process handler.
 */
export function buildLiveStatsSnapshot(
  stats: Pick<StatsType, "actionCounts" | "overall" | "conversions">,
  players: CornermanLiveStatsPlayer[],
  latestFrame: number,
  gameKey: string,
  ended: boolean,
): CornermanLiveSnapshot {
  const conversions = stats.conversions ?? [];
  const openingTypes = classifyOpeningTypes(conversions);
  const allIndices = players.map((p) => p.playerIndex);

  const playerStats = players.map((player) => {
    const ac = stats.actionCounts.find((a) => a.playerIndex === player.playerIndex);
    const ov = stats.overall.find((o) => o.playerIndex === player.playerIndex);
    const opponentIndices = allIndices.filter((i) => i !== player.playerIndex);
    return buildPlayerStats(player, ac, ov, conversions, openingTypes, opponentIndices);
  });

  return {
    gameKey,
    phase: ended ? "ended" : "live",
    latestFrame,
    elapsedSeconds: Math.max(0, (latestFrame - FIRST_PLAYABLE_FRAME) / 60),
    players: playerStats,
    baseline: null,
  };
}

// ── Delta & formatting ────────────────────────────────────────────────

function baselineValueFor(def: CornermanLiveStatDef, baseline: CornermanLiveBaseline | null): number | null {
  if (!def.baselineKey || !baseline) return null;
  return baseline[def.baselineKey];
}

/**
 * Compare a live value to the player's historical baseline. Returns null unless
 * a baseline exists, the in-game sample meets minSample, and the move exceeds
 * the stat's noise band — so the strip starts neutral and earns glyphs only as
 * evidence accumulates.
 */
export function computeStatDelta(
  def: CornermanLiveStatDef,
  value: CornermanLiveStatValue,
  baseline: CornermanLiveBaseline | null,
): CornermanLiveStatDelta | null {
  const base = baselineValueFor(def, baseline);
  if (base == null || value.value == null) return null;
  if (value.total < def.minSample) return null;

  const delta = value.value - base;
  if (Math.abs(delta) <= def.noiseBand) return null;

  const isBetter = def.direction === "higher" ? delta > 0 : delta < 0;
  return { glyph: delta > 0 ? "▲" : "▼", isBetter, delta };
}

/** Human-readable value for a tile/cell. Returns "—" for null (never a fake 0). */
export function formatLiveStatValue(def: CornermanLiveStatDef, value: CornermanLiveStatValue): string {
  switch (def.format) {
    case "percent":
      return value.value == null ? "—" : `${Math.round(value.value * 100)}%`;
    case "countTotal":
      return value.total <= 0 ? "—" : `${value.count}/${value.total}`;
    case "decimal":
      return value.value == null ? "—" : value.value.toFixed(1);
    case "integer":
      return value.value == null ? "—" : String(Math.round(value.value));
    case "count":
      return String(value.count);
    default:
      return "—";
  }
}

/** mm:ss from elapsed seconds, matching frameToTimestamp's formatting. */
export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
