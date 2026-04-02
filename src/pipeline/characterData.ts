// ── Character physics data for matchup-aware DI quality estimation ───
//
// Sources: Melee's internal character attribute tables, as documented by
// the community (schmooblidon's Melee Data Spreadsheet, SmashWiki,
// UnclePunch frame data tools, Achilles1515's decompilation).
//
// Keyed by slippi-js short name (characters.getCharacterShortName(id)).
//
// Competitive analysis fields (comboSusceptibility, expectedKillPercent,
// expectedComboLength) are derived from how the physics values interact
// in real high-level play and are calibrated for coaching accuracy.

export interface CharacterPhysics {
  /** Internal weight value (higher = heavier, affects knockback) */
  readonly weight: number;
  /** Normal fall speed (terminal velocity, units/frame) */
  readonly fallSpeed: number;
  /** Fast-fall speed (units/frame) */
  readonly fastFallSpeed: number;
  /** Gravity (acceleration per frame) */
  readonly gravity: number;
  /** Max air speed (horizontal, units/frame) */
  readonly airSpeed: number;
  /** Qualitative combo susceptibility 1-5 (5 = extreme combo food) */
  readonly comboSusceptibility: 1 | 2 | 3 | 4 | 5;
  /**
   * Realistic kill percent range in competitive play.
   * low = dying here with bad DI / strong moves is realistic.
   * high = surviving to here indicates strong survival DI.
   */
  readonly expectedKillPercent: readonly [low: number, high: number];
  /**
   * Expected combo length (moves received) baseline for DI scoring.
   * expected = average combo length this character receives at high level.
   * long = combo length indicating notably poor DI for this character.
   */
  readonly expectedComboLength: readonly [expected: number, long: number];
}

/**
 * Physics and competitive baseline data for all 26 Melee characters.
 *
 * Key = slippi-js getCharacterShortName() output.
 * Every competitive Melee character is represented.
 */
export const CHARACTER_DATA: Readonly<Record<string, CharacterPhysics>> = {
  // ── Top/High Tier ──────────────────────────────────────────────────

  Fox: {
    weight: 75,
    fallSpeed: 2.8,
    fastFallSpeed: 3.4,
    gravity: 0.23,
    airSpeed: 0.83,
    comboSusceptibility: 5,
    // Fox is light but a fast faller — dies to uthrow uair, upsmash at
    // ~80-90 but can survive with great DI to 140+ vs weaker moves.
    expectedKillPercent: [80, 140],
    // Fox gets extended comboed hard. 4-5 hits is standard; 7+ = bad DI.
    expectedComboLength: [4.5, 7],
  },

  Falco: {
    weight: 80,
    fallSpeed: 3.1,
    fastFallSpeed: 3.7,
    gravity: 0.17,
    airSpeed: 0.83,
    comboSusceptibility: 5,
    // Slightly heavier than Fox but highest fall speed in the game.
    // Pillar combos and chaingrabs shred Falco.
    expectedKillPercent: [75, 135],
    // Falco's extreme fall speed means longer combos. 5 hits typical.
    expectedComboLength: [5, 8],
  },

  Marth: {
    weight: 87,
    fallSpeed: 2.2,
    fastFallSpeed: 2.5,
    gravity: 0.085,
    airSpeed: 0.9,
    comboSusceptibility: 4,
    // Medium weight, moderate fall speed. Can be comboed but not as
    // freely as spacies. Dies around 90-100 to strong moves.
    expectedKillPercent: [90, 150],
    expectedComboLength: [3.5, 6],
  },

  Sheik: {
    weight: 90,
    fallSpeed: 2.13,
    fastFallSpeed: 2.6,
    gravity: 0.12,
    airSpeed: 0.78,
    comboSusceptibility: 4,
    // Medium-heavy, moderate faller. Gets tech-chased and comboed well
    // but her weight lets her survive longer than spacies.
    expectedKillPercent: [95, 155],
    expectedComboLength: [3.5, 6],
  },

  Falcon: {
    weight: 104,
    fallSpeed: 2.9,
    fastFallSpeed: 3.56,
    gravity: 0.13,
    airSpeed: 1.12,
    comboSusceptibility: 5,
    // Heavy + extremely fast faller = ultimate combo food.
    // Lives long due to weight but gets absolutely destroyed in combos.
    expectedKillPercent: [95, 165],
    // Falcon eats the longest combos in the game. 5-6 hits standard.
    expectedComboLength: [5.5, 9],
  },

  Puff: {
    weight: 60,
    fallSpeed: 1.3,
    fastFallSpeed: 1.78,
    gravity: 0.064,
    airSpeed: 1.35,
    comboSusceptibility: 1,
    // Extremely light and floaty — dies very early but hard to combo.
    // Rest kills at 0; raw kills start around 55-60.
    expectedKillPercent: [55, 110],
    // Puff floats out of almost everything. 2 hits typical.
    expectedComboLength: [2, 4],
  },

  ICs: {
    weight: 88,
    fallSpeed: 1.6,
    fastFallSpeed: 2.4,
    gravity: 0.1,
    airSpeed: 0.6835,
    comboSusceptibility: 3,
    // Medium weight, moderate fall speed. Nana dies easily and Popo
    // is vulnerable without her. As a pair, moderate combo food.
    expectedKillPercent: [85, 145],
    expectedComboLength: [3, 5],
  },

  Peach: {
    weight: 90,
    fallSpeed: 1.5,
    fastFallSpeed: 2.0,
    gravity: 0.08,
    airSpeed: 0.95,
    comboSusceptibility: 2,
    // Float + medium-heavy weight makes her hard to combo.
    // She escapes with float and CC but can die to edgeguards.
    expectedKillPercent: [95, 155],
    expectedComboLength: [2.5, 4.5],
  },

  Pikachu: {
    weight: 80,
    fallSpeed: 1.9,
    fastFallSpeed: 2.7,
    gravity: 0.11,
    airSpeed: 0.85,
    comboSusceptibility: 3,
    // Light-medium, moderate fall speed. Small body + good recovery
    // helps but still gets comboed at mid-level.
    expectedKillPercent: [80, 135],
    expectedComboLength: [3, 5],
  },

  Samus: {
    weight: 110,
    fallSpeed: 1.4,
    fastFallSpeed: 2.1,
    gravity: 0.066,
    airSpeed: 0.5135,
    comboSusceptibility: 2,
    // Heavy and floaty — hard to combo, lives long.
    // Very hard to kill but also hard to escape once caught.
    expectedKillPercent: [100, 170],
    expectedComboLength: [2.5, 4.5],
  },

  // ── Mid Tier ────────────────────────────────────────────────────────

  Luigi: {
    weight: 100,
    fallSpeed: 1.6,
    fastFallSpeed: 2.5,
    gravity: 0.069,
    airSpeed: 0.6835,
    comboSusceptibility: 3,
    // Heavy-ish and somewhat floaty, but his tall hurtbox and low
    // traction make him surprisingly comboable at mid percents.
    expectedKillPercent: [90, 155],
    expectedComboLength: [3, 5.5],
  },

  Mario: {
    weight: 100,
    fallSpeed: 1.7,
    fastFallSpeed: 2.5,
    gravity: 0.095,
    airSpeed: 0.86,
    comboSusceptibility: 3,
    // Average across the board. Textbook mid-weight, mid-fall-speed.
    expectedKillPercent: [90, 150],
    expectedComboLength: [3, 5],
  },

  Doc: {
    weight: 100,
    fallSpeed: 1.7,
    fastFallSpeed: 2.5,
    gravity: 0.095,
    airSpeed: 0.9,
    comboSusceptibility: 3,
    // Nearly identical to Mario physics-wise.
    expectedKillPercent: [90, 150],
    expectedComboLength: [3, 5],
  },

  Yoshi: {
    weight: 108,
    fallSpeed: 1.93,
    fastFallSpeed: 2.93,
    gravity: 0.093,
    airSpeed: 1.2,
    comboSusceptibility: 3,
    // Heavy with moderate fall speed. DJ armor helps escape but
    // his large hurtbox makes him fairly comboable.
    expectedKillPercent: [95, 160],
    expectedComboLength: [3.5, 5.5],
  },

  Ganon: {
    weight: 109,
    fallSpeed: 2.0,
    fastFallSpeed: 2.6,
    gravity: 0.13,
    airSpeed: 0.78,
    comboSusceptibility: 4,
    // Heavy + fast faller + huge hurtbox = extreme combo food.
    // Lives long due to weight but gets absolutely wrecked in combos.
    expectedKillPercent: [100, 175],
    // Ganon gets comboed nearly as hard as Falcon.
    expectedComboLength: [5, 8],
  },

  Link: {
    weight: 104,
    fallSpeed: 2.13,
    fastFallSpeed: 3.0,
    gravity: 0.11,
    airSpeed: 0.6943,
    comboSusceptibility: 4,
    // Heavy fast faller with a large hurtbox. Significant combo food.
    expectedKillPercent: [95, 160],
    expectedComboLength: [4, 7],
  },

  YLink: {
    weight: 85,
    fallSpeed: 1.6,
    fastFallSpeed: 2.5,
    gravity: 0.11,
    airSpeed: 0.74,
    comboSusceptibility: 3,
    // Lighter and slower faller than Link. Small hurtbox helps.
    expectedKillPercent: [80, 140],
    expectedComboLength: [3, 5],
  },

  // ── Low Tier ────────────────────────────────────────────────────────

  Zelda: {
    weight: 90,
    fallSpeed: 1.4,
    fastFallSpeed: 2.1,
    gravity: 0.073,
    airSpeed: 0.7143,
    comboSusceptibility: 1,
    // Floaty and medium weight. Hard to combo, but poor in neutral
    // means she often gets hit anyway.
    expectedKillPercent: [85, 145],
    expectedComboLength: [2, 4],
  },

  Roy: {
    weight: 85,
    fallSpeed: 2.4,
    fastFallSpeed: 2.9,
    gravity: 0.114,
    airSpeed: 0.9,
    comboSusceptibility: 4,
    // Fast faller + lighter = dies earlier than Marth and gets comboed
    // harder. A worse version of Marth's combo profile.
    expectedKillPercent: [80, 140],
    expectedComboLength: [4, 7],
  },

  Mewtwo: {
    weight: 85,
    fallSpeed: 1.5,
    fastFallSpeed: 2.3,
    gravity: 0.082,
    airSpeed: 1.2,
    comboSusceptibility: 2,
    // Light-medium and floaty, but his ENORMOUS hurtbox (tail!) makes
    // him easier to combo than his physics suggest. Rated 2 not 1.
    expectedKillPercent: [75, 130],
    expectedComboLength: [2.5, 5],
  },

  "G&W": {
    weight: 60,
    fallSpeed: 1.73,
    fastFallSpeed: 2.5,
    gravity: 0.095,
    airSpeed: 1.0,
    comboSusceptibility: 3,
    // Extremely light but moderate fall speed. The lightest character
    // tied with Puff, but falls faster. Unique: no L-cancel on aerials,
    // and cannot clank with most projectiles. His light weight means
    // he dies early, but moderate fall speed prevents infinites.
    expectedKillPercent: [60, 115],
    expectedComboLength: [3, 5],
  },

  Ness: {
    weight: 94,
    fallSpeed: 1.83,
    fastFallSpeed: 2.5,
    gravity: 0.09,
    airSpeed: 0.83,
    comboSusceptibility: 3,
    // Medium weight, moderate fall speed. Fairly average combo profile
    // but his exploitable recovery makes him die to edgeguards early.
    expectedKillPercent: [85, 140],
    expectedComboLength: [3, 5],
  },

  Bowser: {
    weight: 117,
    fallSpeed: 1.9,
    fastFallSpeed: 2.7,
    gravity: 0.13,
    airSpeed: 0.6535,
    comboSusceptibility: 4,
    // Heaviest character. Huge hurtbox, moderate-fast faller.
    // Lives forever but gets comboed to oblivion.
    expectedKillPercent: [100, 180],
    expectedComboLength: [5, 8],
  },

  Kirby: {
    weight: 70,
    fallSpeed: 1.6,
    fastFallSpeed: 2.3,
    gravity: 0.08,
    airSpeed: 0.63,
    comboSusceptibility: 2,
    // Very light and somewhat floaty. Small hurtbox helps escape combos
    // but dies extremely early. Basically evaporates.
    expectedKillPercent: [65, 120],
    expectedComboLength: [2.5, 4.5],
  },

  DK: {
    weight: 114,
    fallSpeed: 2.4,
    fastFallSpeed: 2.96,
    gravity: 0.1,
    airSpeed: 1.0,
    comboSusceptibility: 5,
    // Very heavy + fast faller + biggest hurtbox in the game.
    // THE definitive combo food. Gets chaingrabbed and comboed forever.
    expectedKillPercent: [100, 175],
    // DK eats the most hits per combo of any character.
    expectedComboLength: [5.5, 9],
  },

  Pichu: {
    weight: 55,
    fallSpeed: 1.9,
    fastFallSpeed: 2.7,
    gravity: 0.11,
    airSpeed: 0.85,
    comboSusceptibility: 3,
    // Lightest character in the game. Dies incredibly early but small
    // hurtbox and moderate fall speed prevent extended combos.
    expectedKillPercent: [50, 100],
    expectedComboLength: [3, 5],
  },
} as const;

// ── Lookup helper ─────────────────────────────────────────────────────

/**
 * Get character physics data by slippi-js short name.
 * Returns undefined for non-standard characters (Master Hand, Wireframe, etc.)
 */
export function getCharacterData(characterName: string): CharacterPhysics | undefined {
  return CHARACTER_DATA[characterName];
}

/**
 * Get character physics data by slippi-js character ID.
 * Requires the character name to already be resolved.
 */
export function getCharacterDataById(characterId: number): CharacterPhysics | undefined {
  // Map character ID to short name (same as slippi-js)
  const ID_TO_NAME: Record<number, string> = {
    0: "Falcon", 1: "DK", 2: "Fox", 3: "G&W", 4: "Kirby",
    5: "Bowser", 6: "Link", 7: "Luigi", 8: "Mario", 9: "Marth",
    10: "Mewtwo", 11: "Ness", 12: "Peach", 13: "Pikachu", 14: "ICs",
    15: "Puff", 16: "Samus", 17: "Yoshi", 18: "Zelda", 19: "Sheik",
    20: "Falco", 21: "YLink", 22: "Doc", 23: "Roy", 24: "Pichu",
    25: "Ganon",
  };
  const name = ID_TO_NAME[characterId];
  return name != null ? CHARACTER_DATA[name] : undefined;
}

// ── Opponent combo game strength ──────────────────────────────────────
//
// How strong each character's combo game is (multiplier on expected combo
// length the victim should receive). >1.0 = this attacker extends combos
// beyond average; <1.0 = shorter/simpler conversions.
//
// This is distinct from combo susceptibility (which is about being comboed).
// Falco has the best combo game (pillars) and is also extreme combo food.

export const COMBO_GAME_STRENGTH: Readonly<Record<string, number>> = {
  Fox:     1.30,  // Shine combos, uthrow uair, drill shine
  Falco:   1.35,  // Pillar combos, dair shine loops — best combo game
  Marth:   1.20,  // Chain grabs, tipper kill setups, ken combos
  Sheik:   1.15,  // Tech chases, fair chains, guaranteed followups
  Falcon:  1.25,  // Stomp knee, uthrow knee, massive punish game
  Puff:    0.70,  // Rest kills in 1 hit, bair strings are short
  Peach:   0.85,  // Float cancel combos, dsmash — moderate
  ICs:     1.40,  // Wobbling is infinite; even without, strong grab game
  Pikachu: 1.05,  // Uair chains, decent combos
  Samus:   0.80,  // Charge shot kills, limited combo extensions
  Luigi:   0.90,  // Shoryuken kills, moderate combos
  Mario:   0.90,
  Doc:     0.90,
  Yoshi:   0.85,
  Ganon:   0.95,  // Stomp followups but limited
  Link:    0.80,
  YLink:   0.85,
  Zelda:   0.65,  // Lightning kick kills, very few true combos
  Roy:     0.85,
  Mewtwo:  0.80,
  "G&W":   0.80,
  Ness:    0.85,
  Bowser:  0.75,
  Kirby:   0.75,
  DK:      1.00,  // Cargo throw combos, decent
  Pichu:   0.80,
};

/**
 * Get the combo game strength for an opponent character.
 * Defaults to 1.0 for unknown characters.
 */
export function getComboGameStrength(opponentCharacter: string): number {
  return COMBO_GAME_STRENGTH[opponentCharacter] ?? 1.0;
}

// ── DI quality estimation helpers ─────────────────────────────────────

/**
 * Compute a matchup-aware combo DI score.
 *
 * Compares received combo length against the character-specific baseline,
 * adjusted for the opponent's combo game strength. Uses a sigmoid curve
 * for smooth scoring without hard clipping at the edges.
 *
 * Examples:
 *  - Fox (expected=4.5) vs Falco (strength=1.35): adjusted baseline=6.08.
 *    Receiving 4.0-hit combos → score ~0.85 (great DI, escaping Falco combos early).
 *  - Puff (expected=2.0) vs Fox (strength=1.30): adjusted baseline=2.60.
 *    Receiving 4.5-hit combos → score ~0.10 (terrible DI for a floaty).
 *
 * @returns 0-1 score (0 = worst DI, 0.5 = expected for matchup, 1 = best DI)
 */
export function computeComboDIScore(
  characterName: string,
  avgComboLengthReceived: number,
  opponentCharacter: string,
): number {
  const data = getCharacterData(characterName);
  if (!data || avgComboLengthReceived <= 0) return 0.5;

  const [expected, long] = data.expectedComboLength;
  const opponentStrength = getComboGameStrength(opponentCharacter);

  // Adjust baselines by opponent combo game strength
  const adjustedExpected = expected * opponentStrength;
  const adjustedLong = long * opponentStrength;
  const halfRange = (adjustedLong - adjustedExpected) / 2;
  if (halfRange <= 0) return 0.5;

  // Deviation from adjusted baseline (negative = escaping early = good)
  const deviation = avgComboLengthReceived - adjustedExpected;
  const normalizedDeviation = deviation / halfRange;

  // Sigmoid: smooth mapping centered on 0.5, steepness 2.5
  // normalizedDeviation of 0 → 0.5, large positive → approaches 0, large negative → approaches 1
  const score = 1 / (1 + Math.exp(2.5 * normalizedDeviation));

  return Math.round(score * 100) / 100;
}

/**
 * Compute a matchup-aware survival DI score.
 *
 * Uses character-specific expected death percent ranges instead of
 * universal baselines. Sigmoid curve for smooth scoring.
 *
 * Examples:
 *  - Puff (range 55-110, midpoint 82.5): dying at 70% → score ~0.33 (bad for Puff).
 *  - Bowser (range 100-180, midpoint 140): dying at 90% → score ~0.12 (catastrophic).
 *  - Fox (range 80-140, midpoint 110): dying at 110% → score 0.50 (perfectly average).
 *
 * @returns 0-1 score (0 = terrible survival, 0.5 = expected, 1 = excellent)
 */
export function computeSurvivalDIScore(
  characterName: string,
  avgDeathPercent: number,
): number {
  const data = getCharacterData(characterName);
  if (!data || avgDeathPercent <= 0) return 0.5;

  const [low, high] = data.expectedKillPercent;
  const range = high - low;
  if (range <= 0) return 0.5;

  const midpoint = (low + high) / 2;
  const halfRange = range / 2;
  const deviation = avgDeathPercent - midpoint;
  const normalizedDeviation = deviation / halfRange;

  // Sigmoid with gentler steepness (2.0) — death percent has more natural
  // variance from kill move selection, stage, and percent at which kill
  // opportunities arise
  const score = 1 / (1 + Math.exp(-2.0 * normalizedDeviation));

  return Math.round(score * 100) / 100;
}
