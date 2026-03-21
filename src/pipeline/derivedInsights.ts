import {
  State,
  Frames,
  type FramesType,
  type StatsType,
  type ConversionType,
  type StockType,
} from "@slippi/slippi-js/node";

import type { DerivedInsights, HabitProfile } from "./types.js";
import {
  ratio, entropy, frameToTimestamp, moveIdToName, getMoveName,
  isKnockdown, isLedgeGrab, isShielding, isOffstage,
} from "./helpers.js";

// ── Derived insights ──────────────────────────────────────────────────

function classifyPostState(actionState: number): string | null {
  // After knockdown: what did they do?
  if (actionState === State.NEUTRAL_TECH) return "tech in place";
  if (actionState === State.FORWARD_TECH) return "tech forward";
  if (actionState === State.BACKWARD_TECH) return "tech backward";
  if (
    actionState === State.TECH_MISS_UP ||
    actionState === State.TECH_MISS_DOWN
  )
    return "missed tech";
  if (actionState === State.JAB_RESET_UP || actionState === State.JAB_RESET_DOWN)
    return "jab reset";

  // Getup attacks (195-198 range)
  if (actionState >= 195 && actionState <= 198) return "getup attack";

  return null;
}

function classifyLedgeOption(actionState: number): string | null {
  if (actionState === State.ROLL_FORWARD) return "ledge roll";
  // Ledge jump (254), ledge attack (256), ledge getup (250), ledge drop
  if (actionState === 250) return "ledge getup";
  if (actionState === 254) return "ledge jump";
  if (actionState === 256) return "ledge attack";
  if (actionState === State.FALL || actionState === State.FALL_FORWARD || actionState === State.FALL_BACKWARD)
    return "ledge drop";
  // Air dodge from ledge (ledgedash)
  if (actionState === State.AIR_DODGE) return "ledgedash";
  return null;
}

function classifyShieldOption(actionState: number): string | null {
  if (actionState === State.ROLL_FORWARD) return "roll forward";
  if (actionState === State.ROLL_BACKWARD) return "roll backward";
  if (actionState === State.SPOT_DODGE) return "spot dodge";
  if (actionState === State.GRAB || actionState === State.DASH_GRAB)
    return "grab OOS";
  if (
    actionState >= State.CONTROLLED_JUMP_START &&
    actionState <= State.CONTROLLED_JUMP_END
  )
    return "jump OOS";
  // Aerial OOS
  if (
    actionState >= State.AERIAL_ATTACK_START &&
    actionState <= State.AERIAL_DAIR
  )
    return "aerial OOS";
  // Shine OOS would appear as a special move — hard to distinguish without character check
  if (actionState >= State.GROUND_ATTACK_START && actionState <= State.GROUND_ATTACK_END)
    return "attack OOS";
  return null;
}

function buildHabitProfile(
  playerIndex: number,
  frames: FramesType,
  lastFrame: number,
  triggerFn: (actionState: number) => boolean,
  classifyFn: (actionState: number) => string | null,
): HabitProfile {
  const counts = new Map<string, number>();
  let inTrigger = false;

  for (let f = Frames.FIRST_PLAYABLE; f <= lastFrame; f++) {
    const frame = frames[f];
    if (!frame) continue;
    const pd = frame.players[playerIndex]?.post;
    if (!pd) continue;
    const actionState = pd.actionStateId ?? 0;

    if (triggerFn(actionState)) {
      inTrigger = true;
    } else if (inTrigger) {
      // Player just left the trigger state — classify what they did
      const option = classifyFn(actionState);
      if (option) {
        counts.set(option, (counts.get(option) ?? 0) + 1);
        inTrigger = false;
      }
      // If we can't classify yet, keep waiting (they might transition through intermediate states)
    }
  }

  const options = [...counts.entries()]
    .map(([action, frequency]) => ({ action, frequency }))
    .sort((a, b) => b.frequency - a.frequency);

  return { options, entropy: entropy(options) };
}

function computePerformanceByStock(
  playerIndex: number,
  playerStocks: StockType[],
  conversions: ConversionType[],
  opponentIndex: number,
  lastFrame: number,
): DerivedInsights["performanceByStock"] {
  return playerStocks.map((stock) => {
    const startF = stock.startFrame;
    const endF = stock.endFrame ?? lastFrame;

    // conversion.playerIndex = victim
    // My attacks (opponent is victim) = neutral wins for me
    const myAttacks = conversions.filter(
      (c) =>
        c.playerIndex === opponentIndex &&
        c.startFrame >= startF &&
        c.startFrame <= endF,
    );
    // Opponent's attacks (I am victim) = neutral losses for me
    const oppAttacks = conversions.filter(
      (c) =>
        c.playerIndex === playerIndex &&
        c.startFrame >= startF &&
        c.startFrame <= endF,
    );

    const dmgDealt = myAttacks.reduce(
      (s, c) => s + ((c.endPercent ?? c.currentPercent) - c.startPercent),
      0,
    );
    const dmgTaken = oppAttacks.reduce(
      (s, c) => s + ((c.endPercent ?? c.currentPercent) - c.startPercent),
      0,
    );

    const totalNeutral = myAttacks.length + oppAttacks.length;

    return {
      stock: stock.count,
      neutralWinRate: ratio(myAttacks.length, totalNeutral),
      damageEfficiency:
        dmgTaken > 0 ? Math.round((dmgDealt / dmgTaken) * 100) / 100 : dmgDealt > 0 ? 999 : 0,
    };
  });
}

function findBestConversion(
  conversions: ConversionType[],
  playerIndex: number,
  opponentIndex: number,
): DerivedInsights["bestConversion"] {
  // conversion.playerIndex = victim. My best conversion = opponent is victim.
  const playerConvs = conversions.filter(
    (c) => c.playerIndex === opponentIndex && c.moves.length > 0,
  );

  let best: ConversionType | undefined;
  let bestDmg = 0;

  for (const c of playerConvs) {
    const dmg = (c.endPercent ?? c.currentPercent) - c.startPercent;
    if (dmg > bestDmg || (dmg === bestDmg && c.didKill)) {
      bestDmg = dmg;
      best = c;
    }
  }

  if (!best) {
    return {
      moves: [],
      totalDamage: 0,
      startPercent: 0,
      endedInKill: false,
      timestamp: "0:00",
    };
  }

  return {
    moves: best.moves.map(
      (m) => moveIdToName[m.moveId] ?? getMoveName(m.moveId),
    ),
    totalDamage: Math.round(bestDmg),
    startPercent: Math.round(best.startPercent),
    endedInKill: best.didKill,
    timestamp: frameToTimestamp(best.startFrame),
  };
}

function findWorstMissedPunish(
  conversions: ConversionType[],
  playerIndex: number,
  opponentIndex: number,
): DerivedInsights["worstMissedPunish"] {
  // conversion.playerIndex = victim. My missed punish = opponent is victim but I did low damage.
  const playerConvs = conversions.filter(
    (c) => c.playerIndex === opponentIndex && c.moves.length > 0,
  );

  let worst: ConversionType | undefined;
  let worstScore = -Infinity;

  for (const c of playerConvs) {
    const dmg = (c.endPercent ?? c.currentPercent) - c.startPercent;
    if (dmg >= 10) continue; // Not a missed punish
    if (c.didKill) continue;

    // Score = opponent percent at time (higher = worse missed opportunity)
    const opponentPercent = c.startPercent;
    const score = opponentPercent - dmg; // Higher opponent % + lower damage = worse
    if (score > worstScore) {
      worstScore = score;
      worst = c;
    }
  }

  if (!worst) return null;

  const firstMove = worst.moves[0]!;
  return {
    opener: moveIdToName[firstMove.moveId] ?? getMoveName(firstMove.moveId),
    damageDealt: Math.round(
      (worst.endPercent ?? worst.currentPercent) - worst.startPercent,
    ),
    opponentPercent: Math.round(worst.startPercent),
    timestamp: frameToTimestamp(worst.startFrame),
  };
}

export function buildDerivedInsights(
  playerIndex: number,
  opponentIndex: number,
  stats: StatsType,
  frames: FramesType,
  lastFrame: number,
  stageId: number,
): DerivedInsights {
  const playerStocks = stats.stocks.filter(
    (s) => s.playerIndex === playerIndex,
  );

  const afterKnockdown = buildHabitProfile(
    playerIndex,
    frames,
    lastFrame,
    isKnockdown,
    classifyPostState,
  );

  const afterLedgeGrab = buildHabitProfile(
    playerIndex,
    frames,
    lastFrame,
    isLedgeGrab,
    classifyLedgeOption,
  );

  const afterShieldPressure = buildHabitProfile(
    playerIndex,
    frames,
    lastFrame,
    isShielding,
    classifyShieldOption,
  );

  const performanceByStock = computePerformanceByStock(
    playerIndex,
    playerStocks,
    stats.conversions,
    opponentIndex,
    lastFrame,
  );

  const bestConversion = findBestConversion(stats.conversions, playerIndex, opponentIndex);
  const worstMissedPunish = findWorstMissedPunish(
    stats.conversions,
    playerIndex,
    opponentIndex,
  );

  // Build chronological timeline of key moments for timestamp-backed analysis
  const keyMoments: DerivedInsights["keyMoments"] = [];

  // Kills the player landed (opponent is victim + didKill)
  for (const c of stats.conversions) {
    if (c.playerIndex === opponentIndex && c.didKill && c.moves.length > 0) {
      const lastMove = c.moves[c.moves.length - 1]!;
      const moveName = moveIdToName[lastMove.moveId] ?? getMoveName(lastMove.moveId);
      const dmg = Math.round((c.endPercent ?? c.currentPercent) - c.startPercent);
      const isOffstageKill =
        c.endFrame != null &&
        frames[c.endFrame]?.players[opponentIndex]?.post != null &&
        isOffstage(
          frames[c.endFrame]!.players[opponentIndex]!.post!.positionX ?? 0,
          frames[c.endFrame]!.players[opponentIndex]!.post!.positionY ?? 0,
          stageId,
        );

      keyMoments.push({
        timestamp: frameToTimestamp(c.startFrame),
        frame: c.startFrame,
        type: isOffstageKill ? "edgeguard_kill" : "kill",
        description: `Killed opponent with ${moveName} at ${Math.round(c.startPercent)}% (${dmg}% combo)`,
      });
    }
  }

  // Deaths the player suffered (player is victim + didKill)
  for (const c of stats.conversions) {
    if (c.playerIndex === playerIndex && c.didKill && c.moves.length > 0) {
      const lastMove = c.moves[c.moves.length - 1]!;
      const moveName = moveIdToName[lastMove.moveId] ?? getMoveName(lastMove.moveId);
      keyMoments.push({
        timestamp: frameToTimestamp(c.startFrame),
        frame: c.startFrame,
        type: "death",
        description: `Died to ${moveName} at ${Math.round(c.startPercent)}%`,
      });
    }
  }

  // Big punishes the player landed (≥40% damage in one conversion)
  for (const c of stats.conversions) {
    if (c.playerIndex === opponentIndex && c.moves.length > 0) {
      const dmg = (c.endPercent ?? c.currentPercent) - c.startPercent;
      if (dmg >= 40 && !c.didKill) {
        const moves = c.moves.map(
          (m) => moveIdToName[m.moveId] ?? getMoveName(m.moveId),
        );
        const opener = moves[0] ?? "unknown";
        keyMoments.push({
          timestamp: frameToTimestamp(c.startFrame),
          frame: c.startFrame,
          type: "big_punish",
          description: `${Math.round(dmg)}% punish starting with ${opener} (${moves.length} hits, opponent at ${Math.round(c.startPercent)}%)`,
        });
      }
    }
  }

  // Missed punishes (opening at high % that did <15% and didn't kill)
  for (const c of stats.conversions) {
    if (
      c.playerIndex === opponentIndex &&
      c.moves.length > 0 &&
      c.startPercent >= 80 &&
      !c.didKill
    ) {
      const dmg = (c.endPercent ?? c.currentPercent) - c.startPercent;
      if (dmg < 15) {
        const opener = moveIdToName[c.moves[0]!.moveId] ?? getMoveName(c.moves[0]!.moveId);
        keyMoments.push({
          timestamp: frameToTimestamp(c.startFrame),
          frame: c.startFrame,
          type: "missed_punish",
          description: `Missed punish: ${opener} at ${Math.round(c.startPercent)}%, only dealt ${Math.round(dmg)}%`,
        });
      }
    }
  }

  // Sort chronologically
  keyMoments.sort((a, b) => a.frame - b.frame);

  return {
    afterKnockdown,
    afterLedgeGrab,
    afterShieldPressure,
    performanceByStock,
    bestConversion,
    worstMissedPunish,
    keyMoments,
    adaptationSignals: [], // Only for multi-game sets
  };
}
