// Barrel re-exports — preserves the public API for all consumers.
// Imports from "../pipeline" or "./pipeline" resolve here.

export { processGame } from "./processGame.js";
export { buildDerivedInsights } from "./derivedInsights.js";
export { computeAdaptationSignals, findPlayerIdx } from "./adaptation.js";
export { 
  assembleUserPrompt, assemblePlayerContext, SYSTEM_PROMPT,
  assembleAggregatePrompt, SYSTEM_PROMPT_AGGREGATE,
  assembleDiscoveryPrompt, SYSTEM_PROMPT_DISCOVERY
} from "./prompt.js";

export type {
  PlayerSummary,
  GameSummary,
  DerivedInsights,
  HabitProfile,
  GameResult,
  KenComboStats,
  TurnipPullStats,
  CharacterSignatureStats,
  FoxSignatureStats,
  FalcoSignatureStats,
  SheikSignatureStats,
  FalconSignatureStats,
  PuffSignatureStats,
  IcClimbersSignatureStats,
  MarthSignatureStats,
  PeachSignatureStats,
  SamusSignatureStats,
  PikachuSignatureStats,
  LuigiSignatureStats,
  MarioSignatureStats,
  DocSignatureStats,
  YoshiSignatureStats,
  GanonSignatureStats,
  LinkSignatureStats,
  YLinkSignatureStats,
  ZeldaSignatureStats,
  RoySignatureStats,
  MewtwoSignatureStats,
  GnwSignatureStats,
  NessSignatureStats,
  BowserSignatureStats,
  KirbySignatureStats,
  DkSignatureStats,
  PichuSignatureStats,
  PlayerHistory,
  AggregateStats,
} from "./types.js";
