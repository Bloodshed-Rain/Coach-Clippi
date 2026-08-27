// ── Static frame data + slippi-js frame-data accessors ────────────────
//
// Central home for the frame-data facts that decision-grading stats need
// (jumpsquat, grab startup) and for the slippi-js utilities that already
// ship real per-character aerial data and death-direction decoding.
//
// IMPORTANT (verified against node_modules on 2026-07-19):
//  - `framedata.getAerialFrameData(internalCharacterId, aerialName)` EXISTS
//    in @slippi/slippi-js and returns { totalFrames, iasa, autoCancelBefore,
//    autoCancelAfter, landingLag, lcancelledLandingLag, hitFrames, hitboxes }.
//    It is keyed by the INTERNAL character id (post-frame
//    `internalCharacterId`), not the external/CSS id.
//  - `animations.getDeathDirection(actionStateId)` EXISTS and decodes the
//    StockType.deathAnimation action state (0=down, 1=left, 2=right, 3+=up).
// Do not hand-author aerial landing lag / autocancel tables — use the lib.

import { framedata, animations } from "@slippi/slippi-js/node";

export type AerialName = "fair" | "bair" | "nair" | "upair" | "dair";

export type AerialFrameData = ReturnType<typeof framedata.getAerialFrameData>;

/**
 * Aerial frame data (landing lag, L-cancel lag, autocancel windows, hit
 * frames) for a character. `internalCharacterId` comes from post-frame
 * updates (`post.internalCharacterId`) — NOT the external character id
 * used in game settings.
 */
export function getAerialFrameData(internalCharacterId: number, aerial: AerialName): AerialFrameData {
  return framedata.getAerialFrameData(internalCharacterId, aerial);
}

/**
 * Decode a StockType.deathAnimation into a blast-zone direction.
 * Returns undefined when the action state is not a death state.
 */
export function getDeathDirection(deathAnimation: number): "up" | "down" | "left" | "right" | undefined {
  return animations.getDeathDirection(deathAnimation);
}

// ── Jumpsquat (KneeBend) frames per character ─────────────────────────
//
// Frames spent in KneeBend (24) before becoming airborne. Community
// frame-data standard values (SmashWiki / schmooblidon's data sheet).
// Keyed by slippi-js getCharacterShortName() output, matching
// characterData.ts CHARACTER_DATA keys.

export const JUMPSQUAT_FRAMES: Readonly<Record<string, number>> = {
  Fox: 3,
  Falco: 5,
  Marth: 4,
  Sheik: 3,
  Falcon: 4,
  Puff: 5,
  ICs: 3,
  Peach: 5,
  Pikachu: 3,
  Samus: 3,
  Luigi: 4,
  Mario: 4,
  Doc: 4,
  Yoshi: 5,
  Ganon: 6,
  Link: 6,
  YLink: 4,
  Zelda: 6,
  Roy: 5,
  Mewtwo: 5,
  "G&W": 4,
  Ness: 4,
  Bowser: 8,
  Kirby: 3,
  DK: 5,
  Pichu: 3,
} as const;

/** Jumpsquat frames for a character short name (defaults to 4 if unknown). */
export function getJumpsquatFrames(characterShortName: string): number {
  return JUMPSQUAT_FRAMES[characterShortName] ?? 4;
}

// ── Grab startup ──────────────────────────────────────────────────────
//
// First active frame of a standing grab. Frame 7 is the near-universal
// value; the exceptions are tongue/tether grabs. Exception values are
// community-cited; verify against frame sheets before using them for
// guaranteed-punish grading tighter than ±1 frame.

export const STANDING_GRAB_ACTIVE_FRAME_DEFAULT = 7;

const STANDING_GRAB_OVERRIDES: Readonly<Record<string, number>> = {
  Yoshi: 14, // tongue grab
  Link: 11, // tether
  YLink: 11, // tether
  Samus: 18, // grapple
};

/** First active frame of a standing grab for a character short name. */
export function getStandingGrabActiveFrame(characterShortName: string): number {
  return STANDING_GRAB_OVERRIDES[characterShortName] ?? STANDING_GRAB_ACTIVE_FRAME_DEFAULT;
}

/**
 * Rough horizontal grab reach in stage units, used as a v1 "was the punish
 * in range" gate. Deliberately a single conservative constant until a
 * per-character reach table is validated.
 */
export const GRAB_RANGE_UNITS_DEFAULT = 14;
