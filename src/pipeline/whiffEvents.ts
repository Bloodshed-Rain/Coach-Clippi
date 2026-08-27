// ── Whiff-Punish Ledger (Phase 2b) ────────────────────────────────────
//
// The opportunity denominator. Existing conversion stats only see punishes
// that HAPPENED; this measures the ones that were available: every whiffed
// attack that left the opponent in range, actionable, with enough committed
// frames to act on. "You were given 9 free punishes and took 2" is invisible
// to every openings/kill-family stat in the ecosystem.
//
// Both directions come out of one pass: your opponent's whiffs are your
// capture rate; your own whiffs in their range are your exposure.
//
// Scope guards (v1, documented):
//  - Whiffs inside either player's conversion window are combo filler, not
//    neutral opportunities — skipped.
//  - Whiffs while the whiffer is offstage are edgeguard/recovery domain —
//    skipped (recovery up-Bs would flood the ledger).
//  - Opportunity ≈ min distance ≤ 40 units AND observer actionable during
//    the window AND ≥ 8 punishable frames after a 10-frame reaction anchor.

import { Frames, type FramesType } from "@slippi/slippi-js/node";

import { isOffstage } from "./helpers.js";
import {
  attackStateLabel,
  isActionableState,
  resolveCommitmentEnd,
  type AttackInstance,
  type ConversionRecord,
  type PlayerSlot,
  type WhiffEvent,
} from "./frameEvents.js";

const RANGE_UNITS = 40; // rough dash-in punish reach (v1 global constant)
const REACTION_ANCHOR_FRAMES = 10; // frames of animation before a human can commit
const MIN_PUNISHABLE_FRAMES = 8; // committed frames left after the anchor
const PUNISH_CONVERSION_SLACK = 20; // conversion may start slightly after the window
const REACTION_SCAN_SLACK = 15; // observer commitments slightly past the window still count
const MAX_WINDOW_FRAMES = 90; // bound pathological unresolved commitments

function extractForWhiffer(
  frames: FramesType,
  lastFrame: number,
  stageId: number,
  whifferIndex: number,
  observerIndex: number,
  whifferSlot: PlayerSlot,
  whifferAttacks: AttackInstance[],
  observerAttacks: AttackInstance[],
  conversions: ConversionRecord[],
): WhiffEvent[] {
  const observerSlot: PlayerSlot = whifferSlot === 0 ? 1 : 0;
  const out: WhiffEvent[] = [];

  const inConversionWindow = (f: number): boolean =>
    conversions.some((c) => f >= c.startFrame && f <= (c.endFrame ?? c.startFrame + 30));

  for (const instance of whifferAttacks) {
    if (instance.connected) continue;
    if (instance.startFrame < Frames.FIRST_PLAYABLE) continue;
    if (inConversionWindow(instance.startFrame)) continue;

    const startPost = frames[instance.startFrame]?.players[whifferIndex]?.post;
    if (!startPost) continue;
    if (isOffstage(startPost.positionX ?? 0, startPost.positionY ?? 0, stageId)) continue;

    const resolved = resolveCommitmentEnd(frames, whifferIndex, instance, lastFrame);
    const vulnerableEndFrame = Math.min(resolved, instance.startFrame + MAX_WINDOW_FRAMES, lastFrame);

    // Window scan: proximity + observer actionability.
    let minDistance = Infinity;
    let observerActionable = false;
    for (let f = instance.startFrame; f <= vulnerableEndFrame; f++) {
      const frame = frames[f];
      const wp = frame?.players[whifferIndex]?.post;
      const op = frame?.players[observerIndex]?.post;
      if (!wp || !op) continue;
      const dist = Math.hypot((wp.positionX ?? 0) - (op.positionX ?? 0), (wp.positionY ?? 0) - (op.positionY ?? 0));
      if (dist < minDistance) minDistance = dist;
      if (isActionableState(op.actionStateId ?? 0)) observerActionable = true;
    }
    if (minDistance === Infinity) continue;

    const punishableFrames = vulnerableEndFrame - (instance.startFrame + REACTION_ANCHOR_FRAMES);
    const opportunity = minDistance <= RANGE_UNITS && observerActionable && punishableFrames >= MIN_PUNISHABLE_FRAMES;

    const punished = conversions.some(
      (c) =>
        c.attackerSlot === observerSlot &&
        c.startFrame >= instance.startFrame &&
        c.startFrame <= vulnerableEndFrame + PUNISH_CONVERSION_SLACK,
    );

    const commitment = observerAttacks.find(
      (a) => a.startFrame > instance.startFrame && a.startFrame <= vulnerableEndFrame + REACTION_SCAN_SLACK,
    );
    const reactionDelay = commitment ? commitment.startFrame - instance.startFrame : null;

    out.push({
      whifferSlot,
      startFrame: instance.startFrame,
      vulnerableEndFrame,
      attackLabel: attackStateLabel(instance.startStateId),
      attackKind: instance.kind,
      minDistance: Math.round(minDistance * 100) / 100,
      opportunity,
      punished,
      reactionDelay,
    });
  }

  return out;
}

export function extractWhiffEvents(
  frames: FramesType,
  lastFrame: number,
  stageId: number,
  indexBySlot: [number, number],
  attacks: [AttackInstance[], AttackInstance[]],
  conversions: ConversionRecord[],
): WhiffEvent[] {
  return [
    ...extractForWhiffer(
      frames,
      lastFrame,
      stageId,
      indexBySlot[0],
      indexBySlot[1],
      0,
      attacks[0],
      attacks[1],
      conversions,
    ),
    ...extractForWhiffer(
      frames,
      lastFrame,
      stageId,
      indexBySlot[1],
      indexBySlot[0],
      1,
      attacks[1],
      attacks[0],
      conversions,
    ),
  ].sort((a, b) => a.startFrame - b.startFrame);
}
