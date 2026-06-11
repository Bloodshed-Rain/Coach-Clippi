import { findPlayerIdx, type GameResult } from "./pipeline";

/** Max gap between games of the same set — mirrors detect-sets.ts MAX_GAP_MS */
export const SET_GAP_MS = 30 * 60 * 1000;
/** Skip handwarmers / false starts — mirrors detect-sets.ts MIN_GAME_DURATION */
export const MIN_GAME_SECONDS = 30;

export interface LiveSetGame {
  gameResult: GameResult;
  /** Epoch ms the game started — replay startAt when present, else arrival time */
  startedAtMs: number;
  result: "win" | "loss" | "draw";
}

export interface LiveSetState {
  targetTag: string;
  opponentTag: string;
  /** connectCode when available, else tag — matches the Rivals opponentKey convention */
  opponentKey: string;
  games: LiveSetGame[];
  wins: number;
  losses: number;
}

export interface AdvanceOutcome {
  state: LiveSetState;
  isNewSet: boolean;
}

/** Mirror of the importer's result logic: dual-survivor or unknown winner = draw */
function gameResultFor(gr: GameResult, targetTag: string): "win" | "loss" | "draw" {
  const idx = findPlayerIdx(gr.gameSummary, targetTag);
  const oppIdx = idx === 0 ? 1 : 0;
  const pStocks = gr.gameSummary.result.finalStocks[idx];
  const oStocks = gr.gameSummary.result.finalStocks[oppIdx];
  if (pStocks > 0 && oStocks > 0) return "draw";
  if (gr.gameSummary.result.winner === gr.gameSummary.players[idx].tag) return "win";
  if (gr.gameSummary.result.winner === "Unknown") return "draw";
  return "loss";
}

/**
 * Advance the live-set state with a freshly imported game.
 * Pure: no clock access — callers pass `arrivedAtMs` (Date.now() in the handler).
 * Returns null when the game should be ignored (too short to be a real game).
 */
export function advanceLiveSet(
  prev: LiveSetState | null,
  gameResult: GameResult,
  targetTag: string,
  arrivedAtMs: number,
): AdvanceOutcome | null {
  if (gameResult.gameSummary.duration < MIN_GAME_SECONDS) return null;

  const idx = findPlayerIdx(gameResult.gameSummary, targetTag);
  const oppIdx = idx === 0 ? 1 : 0;
  const opponent = gameResult.gameSummary.players[oppIdx];
  const opponentKey = opponent.connectCode || opponent.tag;

  const parsedStart = gameResult.startAt ? Date.parse(gameResult.startAt) : NaN;
  const startedAtMs = Number.isFinite(parsedStart) ? parsedStart : arrivedAtMs;

  const entry: LiveSetGame = {
    gameResult,
    startedAtMs,
    result: gameResultFor(gameResult, targetTag),
  };

  const lastGame = prev?.games[prev.games.length - 1];
  const sameOpponent = prev !== null && prev.opponentKey === opponentKey;
  const withinGap = lastGame !== undefined && startedAtMs - lastGame.startedAtMs <= SET_GAP_MS;
  const isNewSet = !(sameOpponent && withinGap);

  const base: LiveSetState = isNewSet
    ? {
        targetTag,
        opponentTag: opponent.tag,
        opponentKey,
        games: [],
        wins: 0,
        losses: 0,
      }
    : prev!;

  const state: LiveSetState = {
    ...base,
    games: [...base.games, entry],
    wins: base.wins + (entry.result === "win" ? 1 : 0),
    losses: base.losses + (entry.result === "loss" ? 1 : 0),
  };

  return { state, isNewSet };
}
