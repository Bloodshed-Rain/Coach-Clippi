const SEARCH_ALIASES: Record<string, string[]> = {
  ztd: ["zero to death"],
  "0 death": ["zero to death"],
  "0 to death": ["zero to death"],
  "zero death": ["zero to death"],
  "zero deaths": ["zero to death"],
  kencombo: ["ken combo"],
  "ken combos": ["ken combo"],
  waveshines: ["waveshine"],
  "wave shine": ["waveshine"],
  "wave shines": ["waveshine"],
  "four stocks": ["four stock"],
};

const COMPOUND_MOVE_PATTERN = /\b(up|down|forward|back|neutral) (smash|air|tilt|throw|b)\b/g;

const SIGNATURE_SEARCH_KEYS: Array<{ phrases: string[]; keys: string[] }> = [
  { phrases: ["ken combo", "kencombo"], keys: ["kenCombos"] },
  { phrases: ["waveshine", "wave shine"], keys: ["multiShineCombos", "waveshineToUpsmash"] },
  { phrases: ["multi shine", "multishine"], keys: ["multiShineCombos"] },
  { phrases: ["pillar combo", "pillar"], keys: ["pillarCombos"] },
  { phrases: ["stomp knee", "stompknee"], keys: ["stompKnees"] },
  { phrases: ["tech chase", "techchase"], keys: ["techChases"] },
  { phrases: ["chain grab", "chaingrab"], keys: ["chainGrabs"] },
  { phrases: ["rest kill", "rest"], keys: ["restKills"] },
  { phrases: ["wobble", "wobbling"], keys: ["wobbles"] },
  { phrases: ["shine spike", "shinespike"], keys: ["shineSpikeKills"] },
];

export function normalizeReplaySearchQuery(query: string): string {
  return query
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function singularizeLastWord(query: string): string {
  const words = query.split(" ");
  const last = words.at(-1);
  if (!last || last.length < 4) return query;

  if (last.endsWith("ies") && last.length > 4) {
    words[words.length - 1] = `${last.slice(0, -3)}y`;
  } else if (last.endsWith("s") && !last.endsWith("ss")) {
    words[words.length - 1] = last.slice(0, -1);
  }
  return words.join(" ");
}

/**
 * Produces a small set of normalized alternatives for human replay searches.
 * These variants make common Melee phrases tolerant of punctuation, plurals,
 * and move-name spacing without turning Library search into a fuzzy full scan.
 */
export function buildReplaySearchTerms(query: string): string[] {
  const normalized = normalizeReplaySearchQuery(query);
  if (!normalized) return [];

  const terms = new Set<string>([normalized]);
  const singular = singularizeLastWord(normalized);
  terms.add(singular);

  const compactMoves = normalized.replace(COMPOUND_MOVE_PATTERN, "$1$2");
  terms.add(compactMoves);
  terms.add(singularizeLastWord(compactMoves));
  terms.add(normalized.replace(/\s+/g, ""));
  terms.add(singular.replace(/\s+/g, ""));

  for (const candidate of [...terms]) {
    for (const alias of SEARCH_ALIASES[candidate] ?? []) terms.add(alias);
  }

  return [...terms].filter(Boolean);
}

export function buildReplaySignatureSearchKeys(query: string): string[] {
  const terms = new Set(buildReplaySearchTerms(query));
  const keys = new Set<string>();
  for (const definition of SIGNATURE_SEARCH_KEYS) {
    if (definition.phrases.some((phrase) => terms.has(phrase))) {
      for (const key of definition.keys) keys.add(key);
    }
  }
  return [...keys];
}
