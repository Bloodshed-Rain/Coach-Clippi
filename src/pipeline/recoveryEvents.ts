// ── Recovery spans + edgeguard commitment (Phase 1b) ──────────────────
//
// Per-span records of every recovery situation, for BOTH players — each
// player's spans double as the opponent's edgeguard opportunities. This is
// the "you never go offstage vs X" / "your up-B timing is metronomic"
// machinery: no shipping tool decomposes edgeguards by commitment depth or
// recovery by route/resource timing.
//
// Span detection mirrors playerSummary.ts's recovery/edgeguard counters
// (belowStage OR far-offstage-in-vulnerable-state) so the numbers stay
// familiar; the legacy counters remain until a dedicated refactor, but new
// consumers should read these spans.
//
// Honesty note (from adversarial verification): the edgeguard depth × kill
// table is DESCRIPTIVE, not causal — players commit deep precisely when the
// kill is already easy. Always surface per-cell sample counts with it.

import { State, Frames, type FramesType } from "@slippi/slippi-js/node";

import { isAirborne, isOffstage, stageBounds, STAGE_LEDGE_X } from "./helpers.js";
import {
  isDamagedState,
  isDeadOrRespawningState,
  CLIFF_WAIT_STATE,
  type PlayerSlot,
  type RecoverySpan,
} from "./frameEvents.js";

/** Double-jump states (JumpAerialF/B); not named in slippi-js's State table. */
const JUMP_AERIAL_F = 27;
const JUMP_AERIAL_B = 28;
const SPECIAL_STATE_START = 341;

const FAR_OFFSTAGE_MARGIN = 20; // matches playerSummary's farOffstage
const HIGH_ROUTE_Y = 20; // crossing the ledge plane above this = high route
const LOW_ROUTE_Y = -10; // crossing below this = low/sweetspot route
const DJ_EARLY_FRACTION = 0.2; // DJ inside the first 20% of the span = burned early
const ONSTAGE_SETTLE_FRAMES = 30; // airborne above stage this long = recovered
const DEEP_Y = -25; // edgeguarder below this = deep commitment
const DEEP_X_MARGIN = 30; // or this far past the ledge
const CONTEST_DISTANCE = 45; // edgeguarder within this range = contested

function vulnerableAirState(s: number): boolean {
  return isDamagedState(s) || s === State.LANDING_FALL_SPECIAL;
}

/** Ledge hang + all ledge getup options (252-263). */
function isCliffState(s: number): boolean {
  return s >= State.CLIFF_CATCH && s <= 263;
}

interface OpenSpan {
  startFrame: number;
  startX: number;
  startY: number;
  startPercent: number;
  djFrame: number | null;
  crossed: boolean;
  route: "high" | "mid" | "low" | null;
  upbDelay: number | null;
  airdodgeUsed: boolean;
  prevAbsX: number;
  depthRank: number; // 0 onstage, 1 ledge, 2 shallow, 3 deep
  invincibleLedgeFrames: number;
  minDistance: number;
}

const DEPTHS = ["onstage", "ledge", "shallow", "deep"] as const;

function extractSpansForPlayer(
  frames: FramesType,
  lastFrame: number,
  stageId: number,
  playerIndex: number,
  opponentIndex: number,
  playerSlot: PlayerSlot,
): RecoverySpan[] {
  const bounds = stageBounds(stageId);
  const ledgeX = STAGE_LEDGE_X[stageId] ?? bounds.x;
  const spans: RecoverySpan[] = [];

  let open: OpenSpan | null = null;
  let prevStocks = -1;
  let onStageStreak = 0;
  let onStageStreakStart = 0;

  const close = (endFrame: number, endPercent: number, landing: RecoverySpan["landing"]): void => {
    if (!open) return;
    const duration = Math.max(1, endFrame - open.startFrame);
    const route = open.route ?? (landing === "ledge" && !open.crossed ? "low" : open.route);
    spans.push({
      playerSlot,
      startFrame: open.startFrame,
      endFrame,
      startX: Math.round(open.startX * 100) / 100,
      startY: Math.round(open.startY * 100) / 100,
      launchQuadrant: `${open.startX < 0 ? "left" : "right"}-${open.startY >= 0 ? "high" : "low"}`,
      djFrame: open.djFrame,
      djEarly: open.djFrame != null && open.djFrame - open.startFrame <= DJ_EARLY_FRACTION * duration,
      route,
      upbDelay: open.upbDelay,
      airdodgeUsed: open.airdodgeUsed,
      landing,
      edgeguarderDepth: DEPTHS[open.depthRank] ?? "onstage",
      edgeguarderInvincibleLedgeFrames: open.invincibleLedgeFrames,
      contested: open.depthRank > 0 || open.minDistance <= CONTEST_DISTANCE,
      hitDuringRecovery: endPercent > open.startPercent + 1,
    });
    open = null;
  };

  for (let f = Frames.FIRST_PLAYABLE; f <= lastFrame; f++) {
    const frame = frames[f];
    const post = frame?.players[playerIndex]?.post;
    if (!post) continue;

    const stocks = post.stocksRemaining ?? 0;
    const s = post.actionStateId ?? 0;
    const x = post.positionX ?? 0;
    const y = post.positionY ?? 0;
    const percent = post.percent ?? 0;

    // Death ends any open span.
    if (prevStocks > 0 && stocks < prevStocks) {
      close(f, percent, "death");
    }
    prevStocks = stocks;
    if (stocks <= 0) continue;
    if (isDeadOrRespawningState(s)) {
      open = null;
      continue;
    }

    if (!open) {
      // A ledge hang sits below the stage lip — cliff states are the LEDGE
      // situation (habit ledger's domain), not a new recovery span.
      if (isCliffState(s)) continue;
      const belowStage = y < bounds.yMin;
      const farOffstage = Math.abs(x) > bounds.x + FAR_OFFSTAGE_MARGIN;
      if (belowStage || (farOffstage && vulnerableAirState(s))) {
        open = {
          startFrame: f,
          startX: x,
          startY: y,
          startPercent: percent,
          djFrame: null,
          crossed: false,
          route: null,
          upbDelay: null,
          airdodgeUsed: false,
          prevAbsX: Math.abs(x),
          depthRank: 0,
          invincibleLedgeFrames: 0,
          minDistance: Infinity,
        };
        onStageStreak = 0;
      }
      continue;
    }

    // ── Inside a span: track the recovering player ─────────────────
    if ((s === JUMP_AERIAL_F || s === JUMP_AERIAL_B) && open.djFrame == null) open.djFrame = f;
    if (s >= SPECIAL_STATE_START && open.upbDelay == null) open.upbDelay = f - open.startFrame;
    if (s === State.AIR_DODGE) open.airdodgeUsed = true;

    // First inward crossing of the ledge plane sets the route height.
    const absX = Math.abs(x);
    if (!open.crossed && open.prevAbsX > ledgeX && absX <= ledgeX) {
      open.crossed = true;
      open.route = y > HIGH_ROUTE_Y ? "high" : y < LOW_ROUTE_Y ? "low" : "mid";
    }
    open.prevAbsX = absX;

    // ── Track the edgeguarder (the other player) ───────────────────
    const opp = frame?.players[opponentIndex]?.post;
    if (opp) {
      const ox = opp.positionX ?? 0;
      const oy = opp.positionY ?? 0;
      const os = opp.actionStateId ?? 0;
      const oppAirborne = opp.isAirborne === true || isAirborne(os);
      const atLedge = os === State.CLIFF_CATCH || os === CLIFF_WAIT_STATE;

      let rank = 0;
      if (atLedge) rank = 1;
      else if (oppAirborne && isOffstage(ox, oy, stageId)) {
        rank = oy < DEEP_Y || Math.abs(ox) > ledgeX + DEEP_X_MARGIN ? 3 : 2;
      }
      if (rank > open.depthRank) open.depthRank = rank;

      if (atLedge && (opp.hurtboxCollisionState ?? 0) !== 0) open.invincibleLedgeFrames++;

      // Proximity only counts while the recovering player is actually
      // offstage — otherwise small stages mark every span contested.
      if (isOffstage(x, y, stageId)) {
        const dist = Math.hypot(x - ox, y - oy);
        if (dist < open.minDistance) open.minDistance = dist;
      }
    }

    // ── Span resolution ────────────────────────────────────────────
    if (s === State.CLIFF_CATCH) {
      close(f, percent, "ledge");
      continue;
    }

    const onStage = !isOffstage(x, y, stageId);
    const airborne = post.isAirborne === true || isAirborne(s);
    if (onStage && !airborne) {
      close(f, percent, "stage");
    } else if (onStage) {
      if (onStageStreak === 0) onStageStreakStart = f;
      onStageStreak++;
      if (onStageStreak >= ONSTAGE_SETTLE_FRAMES) {
        close(onStageStreakStart, percent, "stage");
      }
    } else {
      onStageStreak = 0;
    }
  }

  // Unresolved span at game end: drop it (no outcome to grade).
  return spans;
}

export function extractRecoverySpans(
  frames: FramesType,
  lastFrame: number,
  stageId: number,
  indexBySlot: [number, number],
): RecoverySpan[] {
  return [
    ...extractSpansForPlayer(frames, lastFrame, stageId, indexBySlot[0], indexBySlot[1], 0),
    ...extractSpansForPlayer(frames, lastFrame, stageId, indexBySlot[1], indexBySlot[0], 1),
  ].sort((a, b) => a.startFrame - b.startFrame);
}
