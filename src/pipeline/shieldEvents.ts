// ── Shield Frame-Gap Audit (Phase 2) ──────────────────────────────────
//
// For every hit blocked on shield: measure the ACTUAL frame gap between
// defender-actionable and attacker-actionable, classify the out-of-shield
// choice, and grade it. No tool in the ecosystem computes per-hit frame
// advantage from replays — UnclePunch shows it live in-game only, and the
// getStats() baseline has zero shield-interaction stats.
//
// Design notes (from adversarial verification of the spec):
//  - Attacker-actionable comes from the attack instance's MEASURED
//    firstActionableFrame (frameEvents tagger), so L-cancels, autocancels,
//    IASA and jump-cancelled shines are all handled for free — and specials
//    (state ≥ 341) are included, so Falco shine-on-shield is covered.
//  - Guaranteed-grab threshold is gap ≥ 8 (shield grab connects ~frame 7-8
//    after actionable), gated on the attacker being grounded and in range —
//    this is what keeps full-screen laser blocks from grading as "missed
//    guaranteed punishes".
//  - A multihit that never lets the defender leave GuardSetOff counts as
//    ONE block event (per-hit splitting inside continuous stun needs hitlag
//    pulse analysis — future refinement).

import { State, Frames, type FramesType } from "@slippi/slippi-js/node";

import { GUARD, GUARD_ON, GUARD_REFLECT, GUARD_SET_OFF } from "./helpers.js";
import {
  isDamagedState,
  isGrabbedState,
  attackStateLabel,
  resolveCommitmentEnd,
  type AttackInstance,
  type ConversionRecord,
  type PlayerSlot,
  type ShieldBlockRecord,
} from "./frameEvents.js";

const SPECIAL_STATE_START = 341;
const PRESSURE_STRING_GAP_FRAMES = 45; // blocks closer than this = same pressure string
const CHOICE_SCAN_FRAMES = 12; // frames after actionable to find the OOS choice
const PUNISH_WINDOW = 30; // defender conversion starting within this = punish landed
const GOT_HIT_WINDOW = 20; // defender damaged within this after actionable = paid for it
const GUARANTEED_GAP = 8; // gap ≥ this + in range ⇒ a grab was guaranteed
const UNSAFE_GAP = -2; // gap ≤ this ⇒ challenging is losing on frames
const GRAB_RANGE_DX = 22; // rough standing-grab reach incl. body widths (v1 constant)
const GRAB_RANGE_DY = 25;

function isShieldState(s: number): boolean {
  return s === GUARD_ON || s === GUARD || s === GUARD_REFLECT || s === GUARD_SET_OFF || s === 180;
}

function extractForDefender(
  frames: FramesType,
  lastFrame: number,
  defenderIndex: number,
  attackerIndex: number,
  defenderSlot: PlayerSlot,
  attackerInstances: AttackInstance[],
  conversions: ConversionRecord[],
): ShieldBlockRecord[] {
  const out: ShieldBlockRecord[] = [];
  let prevState = -1;
  let stringId = -1;
  let lastBlockFrame = -Infinity;

  for (let f = Frames.FIRST_PLAYABLE; f <= lastFrame; f++) {
    const post = frames[f]?.players[defenderIndex]?.post;
    if (!post) continue;
    const s = post.actionStateId ?? 0;
    const entered = s === GUARD_SET_OFF && prevState !== GUARD_SET_OFF;
    prevState = s;
    if (!entered) continue;

    if (f - lastBlockFrame > PRESSURE_STRING_GAP_FRAMES) stringId++;
    lastBlockFrame = f;

    // Defender actionable: first frame the shieldstun state ends.
    let defenderActionableFrame: number | null = null;
    for (let d = f + 1; d <= Math.min(f + 90, lastFrame); d++) {
      const ds = frames[d]?.players[defenderIndex]?.post?.actionStateId;
      if (ds == null) continue;
      if (ds !== GUARD_SET_OFF) {
        defenderActionableFrame = d;
        break;
      }
    }

    // The attack that got blocked: the attacker instance covering this frame.
    const instance =
      attackerInstances.find((a) => f >= a.startFrame && f <= a.endFrame + 3) ??
      attackerInstances.find((a) => a.endFrame >= f - 6 && a.startFrame <= f);

    // Attacker "actionable": measured endlag end, or the next commitment
    // start when endlag never resolved (Falco pillar shine, Peach float) —
    // shared resolution logic with the whiff ledger.
    const attackerActionableFrame = instance ? resolveCommitmentEnd(frames, attackerIndex, instance, lastFrame) : null;
    const frameGap =
      defenderActionableFrame != null && attackerActionableFrame != null
        ? attackerActionableFrame - defenderActionableFrame
        : null;

    // Range gate at the defender-actionable frame (v1: grounded + close).
    let inGrabRange = false;
    if (defenderActionableFrame != null) {
      const dFrame = frames[defenderActionableFrame];
      const dp = dFrame?.players[defenderIndex]?.post;
      const ap = dFrame?.players[attackerIndex]?.post;
      if (dp && ap) {
        inGrabRange =
          Math.abs((dp.positionX ?? 0) - (ap.positionX ?? 0)) <= GRAB_RANGE_DX &&
          Math.abs((dp.positionY ?? 0) - (ap.positionY ?? 0)) <= GRAB_RANGE_DY &&
          ap.isAirborne !== true;
      }
    }

    // OOS choice within the scan window after becoming actionable.
    let choice: string | null = null;
    if (defenderActionableFrame != null) {
      let jumpsquatAt: number | null = null;
      for (
        let c = defenderActionableFrame;
        c <= Math.min(defenderActionableFrame + CHOICE_SCAN_FRAMES, lastFrame);
        c++
      ) {
        const cs = frames[c]?.players[defenderIndex]?.post?.actionStateId;
        if (cs == null) continue;
        if (jumpsquatAt != null) {
          if (cs >= State.AERIAL_ATTACK_START && cs <= State.AERIAL_DAIR) {
            choice = "aerial OOS";
            break;
          }
          if (cs >= SPECIAL_STATE_START) {
            choice = "special OOS";
            break;
          }
          if (c - jumpsquatAt > 8) {
            choice = "jump OOS";
            break;
          }
          continue;
        }
        if (cs === State.ROLL_FORWARD) choice = "roll forward";
        else if (cs === State.ROLL_BACKWARD) choice = "roll backward";
        else if (cs === State.SPOT_DODGE) choice = "spot dodge";
        else if (cs === State.GRAB || cs === State.DASH_GRAB) choice = "grab OOS";
        else if (cs >= State.GROUND_ATTACK_START && cs <= State.GROUND_ATTACK_END) choice = "attack OOS";
        else if (cs === State.ACTION_KNEE_BEND) jumpsquatAt = c;
        else if (isDamagedState(cs) || isGrabbedState(cs)) break;
        if (choice) break;
      }
      if (!choice && jumpsquatAt != null) choice = "jump OOS";
      if (!choice) {
        const endState =
          frames[Math.min(defenderActionableFrame + CHOICE_SCAN_FRAMES, lastFrame)]?.players[defenderIndex]?.post
            ?.actionStateId;
        choice = endState != null && isShieldState(endState) ? "hold shield" : "drop shield";
      }
    }

    // Outcomes after becoming actionable.
    let punishedAttacker = false;
    let gotHit = false;
    if (defenderActionableFrame != null) {
      const D = defenderActionableFrame;
      punishedAttacker = conversions.some(
        (c) => c.attackerSlot === defenderSlot && c.startFrame >= D && c.startFrame <= D + PUNISH_WINDOW,
      );
      for (let h = D; h <= Math.min(D + GOT_HIT_WINDOW, lastFrame); h++) {
        const hs = frames[h]?.players[defenderIndex]?.post?.actionStateId;
        if (hs != null && (isDamagedState(hs) || isGrabbedState(hs))) {
          gotHit = true;
          break;
        }
      }
    }

    out.push({
      defenderSlot,
      blockFrame: f,
      attackKind: instance ? instance.kind : "projectile",
      attackLabel: instance ? attackStateLabel(instance.startStateId) : "projectile",
      defenderActionableFrame,
      attackerActionableFrame,
      frameGap,
      inGrabRange,
      choice,
      grade: "neutral", // resolved in the finalize pass below
      stringId,
      stringFinal: true, // provisional; fixed in the finalize pass
      punishedAttacker,
      gotHit,
    });
  }

  // Finalize: mark string-finals, then grade.
  for (let i = 0; i < out.length; i++) {
    const cur = out[i]!;
    const next = out[i + 1];
    cur.stringFinal = !(next && next.stringId === cur.stringId);
  }

  for (const b of out) {
    if (!b.stringFinal) {
      // Mid-string blocks: the "gap" that matters is until the next hit —
      // recorded for the offense histogram, not graded as a decision.
      b.grade = "pressured";
      continue;
    }
    if (b.frameGap == null) {
      b.grade = "unknown";
      continue;
    }
    const committal =
      b.choice === "grab OOS" || b.choice === "attack OOS" || b.choice === "aerial OOS" || b.choice === "special OOS";
    if (b.frameGap >= GUARANTEED_GAP && b.inGrabRange) {
      b.grade = committal && b.punishedAttacker ? "punish-taken" : "punish-missed";
    } else if (b.frameGap <= UNSAFE_GAP && committal && b.gotHit) {
      b.grade = "unsafe-challenge";
    } else if (b.frameGap <= UNSAFE_GAP && !committal) {
      b.grade = "correct-hold";
    } else {
      b.grade = "neutral";
    }
  }

  return out;
}

export function extractShieldBlocks(
  frames: FramesType,
  lastFrame: number,
  indexBySlot: [number, number],
  attacks: [AttackInstance[], AttackInstance[]],
  conversions: ConversionRecord[],
): ShieldBlockRecord[] {
  return [
    ...extractForDefender(frames, lastFrame, indexBySlot[0], indexBySlot[1], 0, attacks[1], conversions),
    ...extractForDefender(frames, lastFrame, indexBySlot[1], indexBySlot[0], 1, attacks[0], conversions),
  ].sort((a, b) => a.blockFrame - b.blockFrame);
}
