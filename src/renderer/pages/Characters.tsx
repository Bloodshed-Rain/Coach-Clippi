import { useEffect, useState, useCallback } from "react";
import { PlayerRadar } from "../components/RadarChart";

// ── Types ────────────────────────────────────────────────────────────

interface CharacterOverview {
  character: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  avgNeutralWinRate: number;
  avgConversionRate: number;
  avgLCancelRate: number;
  avgOpeningsPerKill: number;
  avgDamagePerOpening: number;
  avgDeathPercent: number;
  avgRecoverySuccessRate: number;
  lastPlayed: string | null;
}

interface CharacterMatchup {
  opponentCharacter: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  avgNeutralWinRate: number;
  avgConversionRate: number;
  avgOpeningsPerKill: number;
}

interface CharacterStageStats {
  stage: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
}

// Signature stat entry for display
interface SignatureStat {
  label: string;
  value: number;
  suffix?: string;
  highlight?: boolean;
}

// ── Character metadata (icons, colors, signature stat labels) ────────

const CHARACTER_META: Record<string, {
  emoji: string;
  color: string;
  glowColor: string;
}> = {
  Fox:              { emoji: "🦊", color: "#ff6b35", glowColor: "rgba(255, 107, 53, 0.15)" },
  Falco:            { emoji: "🦅", color: "#4a7cff", glowColor: "rgba(74, 124, 255, 0.15)" },
  Marth:            { emoji: "⚔️",  color: "#6b8cff", glowColor: "rgba(107, 140, 255, 0.15)" },
  Sheik:            { emoji: "🥷", color: "#8b5cf6", glowColor: "rgba(139, 92, 246, 0.15)" },
  Falcon:           { emoji: "🦅", color: "#f59e0b", glowColor: "rgba(245, 158, 11, 0.15)" },
  Puff:             { emoji: "🎀", color: "#ec4899", glowColor: "rgba(236, 72, 153, 0.15)" },
  Peach:            { emoji: "🍑", color: "#f472b6", glowColor: "rgba(244, 114, 182, 0.15)" },
  ICs:              { emoji: "🧊", color: "#67e8f9", glowColor: "rgba(103, 232, 249, 0.15)" },
  Samus:            { emoji: "🔫", color: "#f97316", glowColor: "rgba(249, 115, 22, 0.15)" },
  Pikachu:          { emoji: "⚡", color: "#facc15", glowColor: "rgba(250, 204, 21, 0.15)" },
  Luigi:            { emoji: "🟢", color: "#22c55e", glowColor: "rgba(34, 197, 94, 0.15)" },
  Mario:            { emoji: "🔴", color: "#ef4444", glowColor: "rgba(239, 68, 68, 0.15)" },
  Doc:              { emoji: "💊", color: "#f8fafc", glowColor: "rgba(248, 250, 252, 0.15)" },
  Yoshi:            { emoji: "🦎", color: "#4ade80", glowColor: "rgba(74, 222, 128, 0.15)" },
  Ganon:            { emoji: "👊", color: "#7c3aed", glowColor: "rgba(124, 58, 237, 0.15)" },
  Link:             { emoji: "🗡️",  color: "#22c55e", glowColor: "rgba(34, 197, 94, 0.15)" },
  YLink:            { emoji: "🏹", color: "#84cc16", glowColor: "rgba(132, 204, 22, 0.15)" },
  Zelda:            { emoji: "✨", color: "#c084fc", glowColor: "rgba(192, 132, 252, 0.15)" },
  Roy:              { emoji: "🔥", color: "#dc2626", glowColor: "rgba(220, 38, 38, 0.15)" },
  Mewtwo:           { emoji: "🔮", color: "#a78bfa", glowColor: "rgba(167, 139, 250, 0.15)" },
  "G&W":            { emoji: "🔔", color: "#1e293b", glowColor: "rgba(30, 41, 59, 0.15)" },
  Ness:             { emoji: "🧢", color: "#ef4444", glowColor: "rgba(239, 68, 68, 0.15)" },
  Bowser:           { emoji: "🐢", color: "#65a30d", glowColor: "rgba(101, 163, 13, 0.15)" },
  Kirby:            { emoji: "🩷", color: "#fb7185", glowColor: "rgba(251, 113, 133, 0.15)" },
  DK:               { emoji: "🦍", color: "#92400e", glowColor: "rgba(146, 64, 14, 0.15)" },
  Pichu:            { emoji: "⚡", color: "#facc15", glowColor: "rgba(250, 204, 21, 0.15)" },
};

const DEFAULT_META = { emoji: "🎮", color: "var(--accent)", glowColor: "var(--accent-glow)" };

function getMeta(character: string) {
  return CHARACTER_META[character] || DEFAULT_META;
}

// ── Aggregate signature stats across games ──────────────────────────

function aggregateSignatureStats(rawStats: any[]): SignatureStat[] {
  if (rawStats.length === 0) return [];

  const character = rawStats[0]?.character;
  if (!character) return [];

  // Sum all numeric fields across games
  const totals: Record<string, number> = {};
  for (const game of rawStats) {
    for (const [key, val] of Object.entries(game)) {
      if (key === "character") continue;
      if (typeof val === "number") {
        totals[key] = (totals[key] ?? 0) + val;
      }
    }
  }

  const LABELS: Record<string, Record<string, { label: string; suffix?: string; highlight?: boolean }>> = {
    Fox: {
      waveshines: { label: "Multi-Shine Combos", highlight: true },
      waveshineToUpsmash: { label: "Waveshine → Upsmash" },
      upthrowUpairs: { label: "Uthrow → Uair" },
      upthrowUpairKills: { label: "Uthrow → Uair Kills", highlight: true },
      drillShines: { label: "Drill → Shine" },
      shineSpikeKills: { label: "Shine Spike Kills", highlight: true },
    },
    Falco: {
      pillarCombos: { label: "Pillar Combos", highlight: true },
      pillarKills: { label: "Pillar Kills", highlight: true },
      shineGrabs: { label: "Shine → Grab" },
      laserCount: { label: "Lasers Fired" },
    },
    Marth: {
      kenCombos: { label: "Ken Combos", highlight: true },
      kenComboKills: { label: "Ken Combo Kills", highlight: true },
      chainGrabs: { label: "Chain Grabs" },
      fsmashKills: { label: "Fsmash Kills", highlight: true },
    },
    Sheik: {
      techChases: { label: "Tech Chases", highlight: true },
      techChaseKills: { label: "Tech Chase Kills", highlight: true },
      needleHits: { label: "Needle Hits" },
      fairChains: { label: "Fair Chains (3+)" },
    },
    Falcon: {
      kneeKills: { label: "Knee Kills", highlight: true },
      stompKnees: { label: "Stomp → Knee", highlight: true },
      upthrowKnees: { label: "Uthrow → Knee Kills" },
      techChaseGrabs: { label: "Tech Chase Grabs", highlight: true },
      gentlemanCount: { label: "Gentlemen" },
    },
    Puff: {
      restKills: { label: "Rest Kills", highlight: true },
      restAttempts: { label: "Rest Attempts" },
      bairStrings: { label: "Bair Walls (3+)", highlight: true },
      longestBairString: { label: "Longest Bair String", suffix: " hits" },
    },
    ICs: {
      wobbles: { label: "Wobbles", highlight: true },
      wobbleKills: { label: "Wobble Kills", highlight: true },
      desyncs: { label: "Desyncs", highlight: true },
      sopoKills: { label: "Sopo Kills" },
      nanaDeaths: { label: "Nana Deaths" },
    },
    Peach: {
      turnipPulls: { label: "Turnip Pulls" },
      turnipHits: { label: "Turnip Hits" },
      stitchFaces: { label: "Stitch Faces", highlight: true },
      dsmashKills: { label: "Downsmash Kills", highlight: true },
      floatCancelAerials: { label: "Float Cancel Aerials" },
    },
    Samus: {
      chargeShotKills: { label: "Charge Shot Kills", highlight: true },
      missileCount: { label: "Missiles Fired" },
      upBKills: { label: "Up-B Kills" },
      dairKills: { label: "Dair Kills" },
    },
    Pikachu: {
      thunderKills: { label: "Thunder Kills", highlight: true },
      upSmashKills: { label: "Upsmash Kills", highlight: true },
      upairChains: { label: "Uair Chains (3+)" },
      nairCombos: { label: "Nair Combos (2+)" },
    },
    Luigi: {
      shoryukenKills: { label: "Shoryuken Kills", highlight: true },
      dairKills: { label: "Dair Kills" },
      downSmashKills: { label: "Dsmash Kills" },
      fireBallCount: { label: "Fireballs Fired" },
    },
    Mario: {
      capeCount: { label: "Capes Used" },
      fireBallCount: { label: "Fireballs Fired" },
      fsmashKills: { label: "Fsmash Kills", highlight: true },
      upSmashKills: { label: "Upsmash Kills" },
      fairSpikeKills: { label: "Fair Spike Kills", highlight: true },
    },
    Doc: {
      pillCount: { label: "Pills Thrown" },
      fsmashKills: { label: "Fsmash Kills", highlight: true },
      upBKills: { label: "Up-B Kills", highlight: true },
      dairKills: { label: "Dair Kills" },
      fairSpikeKills: { label: "Fair Spike Kills", highlight: true },
    },
    Yoshi: {
      eggThrowCount: { label: "Eggs Thrown" },
      dairKills: { label: "Dair Kills", highlight: true },
      upSmashKills: { label: "Upsmash Kills" },
      fairSpikeKills: { label: "Fair Spike Kills", highlight: true },
    },
    Ganon: {
      stompKills: { label: "Stomp Kills", highlight: true },
      warlocKickKills: { label: "Warlock Kick Kills", highlight: true },
      upTiltKills: { label: "Utilt Kills", highlight: true },
      fairKills: { label: "Fair Kills" },
    },
    Link: {
      boomerangCount: { label: "Boomerangs" },
      bombCount: { label: "Bombs" },
      dairSpikeKills: { label: "Dair Spike Kills", highlight: true },
      upSmashKills: { label: "Upsmash Kills" },
      grabCombos: { label: "Grab Combos" },
    },
    YLink: {
      fireArrowCount: { label: "Fire Arrows" },
      bombCount: { label: "Bombs" },
      dairSpikeKills: { label: "Dair Spike Kills", highlight: true },
      nairCombos: { label: "Nair Combos (2+)" },
    },
    Zelda: {
      lightningKickKills: { label: "Lightning Kick Kills", highlight: true },
      dinsFireCount: { label: "Din's Fire" },
      upBKills: { label: "Up-B Kills" },
    },
    Roy: {
      fsmashKills: { label: "Fsmash Kills", highlight: true },
      blazerKills: { label: "Blazer Kills", highlight: true },
      counterCount: { label: "Counters" },
      chainGrabs: { label: "Chain Grabs" },
      dtiltConversions: { label: "Dtilt Conversions" },
    },
    Mewtwo: {
      shadowBallCount: { label: "Shadow Balls" },
      confusionCount: { label: "Confusions" },
      upThrowKills: { label: "Uthrow Kills", highlight: true },
      fairKills: { label: "Fair Kills" },
    },
    "G&W": {
      judgementCount: { label: "Judgements" },
      judgementKills: { label: "Judgement Kills", highlight: true },
      upAirKills: { label: "Uair Kills", highlight: true },
      baconCount: { label: "Bacon (Chef)" },
    },
    Ness: {
      pkFireCount: { label: "PK Fire" },
      backThrowKills: { label: "Back Throw Kills", highlight: true },
      dairKills: { label: "Dair Kills" },
      fairKills: { label: "Fair Kills" },
    },
    Bowser: {
      flameCount: { label: "Flame Breath" },
      koopaClaw: { label: "Koopa Klaw" },
      upBKills: { label: "Up-B Kills" },
      fsmashKills: { label: "Fsmash Kills", highlight: true },
    },
    Kirby: {
      inhaleCount: { label: "Inhales" },
      upTiltKills: { label: "Utilt Kills", highlight: true },
      fsmashKills: { label: "Fsmash Kills" },
      dairCombos: { label: "Dair Combos (3+)" },
      stoneKills: { label: "Stone Kills", highlight: true },
    },
    DK: {
      giantPunchKills: { label: "Giant Punch Kills", highlight: true },
      headbuttCount: { label: "Headbutts" },
      spikeKills: { label: "Spike Kills", highlight: true },
      bairKills: { label: "Bair Kills" },
    },
    Pichu: {
      thunderJoltCount: { label: "Thunder Jolts" },
      thunderKills: { label: "Thunder Kills", highlight: true },
      upSmashKills: { label: "Upsmash Kills" },
      nairCombos: { label: "Nair Combos (2+)" },
    },
  };

  const charLabels = LABELS[character];
  if (!charLabels) return [];

  // For longestBairString, use max instead of sum
  if (character === "Puff" && totals["longestBairString"] !== undefined) {
    totals["longestBairString"] = Math.max(...rawStats.map((g: any) => g.longestBairString ?? 0));
  }

  return Object.entries(charLabels)
    .filter(([key]) => totals[key] !== undefined)
    .map(([key, meta]) => ({
      label: meta.label,
      value: totals[key]!,
      suffix: meta.suffix,
      highlight: meta.highlight,
    }));
}

// ── Radar stats computation ──────────────────────────────────────────

interface GameStat {
  neutralWinRate: number;
  lCancelRate: number;
  openingsPerKill: number;
  avgDamagePerOpening: number;
  conversionRate: number;
  avgDeathPercent: number;
}

type RadarStats = {
  neutral: number;
  punish: number;
  techSkill: number;
  defense: number;
  aggression: number;
  consistency: number;
};

function computeCharacterRadar(games: GameStat[]): RadarStats {
  if (games.length === 0) {
    return { neutral: 0, punish: 0, techSkill: 0, defense: 0, aggression: 0, consistency: 0 };
  }

  const avg = (fn: (g: GameStat) => number) =>
    games.reduce((s, g) => s + fn(g), 0) / games.length;

  const neutralWR = avg((g) => g.neutralWinRate);
  const neutral = Math.min(100, Math.max(0, neutralWR * 100));

  const dpo = avg((g) => g.avgDamagePerOpening);
  const convRate = avg((g) => g.conversionRate);
  const punish = Math.min(100, (dpo / 60) * 50 + convRate * 50);

  const lcancel = avg((g) => g.lCancelRate);
  const techSkill = Math.min(100, lcancel * 100);

  const deathPct = avg((g) => g.avgDeathPercent);
  const defense = Math.min(100, Math.max(0, (deathPct / 150) * 100));

  const opk = avg((g) => g.openingsPerKill);
  const aggression = Math.min(100, Math.max(0, (1 - (opk - 1) / 10) * 100));

  const nwRates = games.map((g) => g.neutralWinRate);
  const nwMean = nwRates.reduce((a, b) => a + b, 0) / nwRates.length;
  const variance = nwRates.reduce((s, v) => s + (v - nwMean) ** 2, 0) / nwRates.length;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.min(100, Math.max(0, (1 - stdDev * 3) * 100));

  return { neutral, punish, techSkill, defense, aggression, consistency };
}

// ── Component ────────────────────────────────────────────────────────

export function Characters({ refreshKey }: { refreshKey: number }) {
  const [characters, setCharacters] = useState<CharacterOverview[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matchups, setMatchups] = useState<CharacterMatchup[]>([]);
  const [stages, setStages] = useState<CharacterStageStats[]>([]);
  const [signatureStats, setSignatureStats] = useState<SignatureStat[]>([]);
  const [radarStats, setRadarStats] = useState<RadarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const chars = await window.clippi.getCharacterList();
        setCharacters(chars);
        // Don't auto-select; start with grid view
        if (selected && !chars.some((c) => c.character === selected)) {
          setSelected(null);
        }
      } catch (err) {
        console.error("Failed to load characters:", err);
      }
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  // Load detail data when selection changes
  const loadDetail = useCallback(async (char: string) => {
    setDetailLoading(true);
    try {
      const [mu, st, sig, gameStats] = await Promise.all([
        window.clippi.getCharacterMatchups(char),
        window.clippi.getCharacterStageStats(char),
        window.clippi.getCharacterSignatureStats(char),
        window.clippi.getCharacterGameStats(char),
      ]);
      setMatchups(mu);
      setStages(st);
      setSignatureStats(aggregateSignatureStats(sig));
      setRadarStats(computeCharacterRadar(gameStats));
    } catch (err) {
      console.error("Failed to load character details:", err);
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (selected) loadDetail(selected);
  }, [selected, refreshKey, loadDetail]);

  if (loading) return <div className="loading">Loading characters...</div>;
  if (characters.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎮</div>
        <h2>No Character Data Yet</h2>
        <p>Import some replays to see your character stats.</p>
      </div>
    );
  }

  const selectedChar = characters.find((c) => c.character === selected);
  const meta = selected ? getMeta(selected) : DEFAULT_META;
  const pct = (v: number) => (v * 100).toFixed(1) + "%";

  return (
    <div>
      <div className="page-header">
        <h1>Characters</h1>
        <p>Your signature stats, per character</p>
      </div>

      {/* Grid mode — no character selected */}
      {!selected && (
        <div className="char-grid">
          {characters.map((c) => {
            const cm = getMeta(c.character);
            const wr = (c.winRate * 100).toFixed(0);
            return (
              <button
                key={c.character}
                className="char-card"
                onClick={() => setSelected(c.character)}
                style={{
                  "--char-color": cm.color,
                  "--char-glow": cm.glowColor,
                } as React.CSSProperties}
              >
                <div className="char-card-emoji">{cm.emoji}</div>
                <div className="char-card-name">{c.character}</div>
                <div className="char-card-record">
                  <span className="record-win">{c.wins}W</span>
                  {" - "}
                  <span className="record-loss">{c.losses}L</span>
                </div>
                <div className="char-card-games">{c.gamesPlayed} games · {wr}%</div>
                <div className="char-card-baseline">
                  <span className="char-card-baseline-stat">{pct(c.avgNeutralWinRate)} NW</span>
                  <span className="char-card-baseline-stat">{pct(c.avgConversionRate)} CV</span>
                  <span className="char-card-baseline-stat">{pct(c.avgLCancelRate)} LC</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail mode — character selected */}
      {selected && selectedChar && (
        <div className="char-detail" style={{ "--char-color": meta.color, "--char-glow": meta.glowColor } as React.CSSProperties}>
          <button className="char-back-btn" onClick={() => setSelected(null)}>
            ← All Characters
          </button>

          <div className="char-detail-layout">
            {/* Left column — hero card */}
            <div className="char-detail-left">
              <div
                className="char-hero-card"
                style={{ "--char-color": meta.color, "--char-glow": meta.glowColor } as React.CSSProperties}
              >
                <div className="char-hero-card-emoji">{meta.emoji}</div>
                <div className="char-hero-card-name" style={{ color: meta.color }}>{selectedChar.character}</div>
                <div className="char-hero-card-record">
                  <span className="record-win">{selectedChar.wins}W</span>
                  {" - "}
                  <span className="record-loss">{selectedChar.losses}L</span>
                </div>
                <div className="char-hero-card-meta">
                  {selectedChar.gamesPlayed} games · {pct(selectedChar.winRate)} win rate
                </div>
                <div className="char-hero-stats">
                  <div className="char-hero-stat">
                    <div className="char-hero-stat-value">{pct(selectedChar.avgNeutralWinRate)}</div>
                    <div className="char-hero-stat-label">Neutral WR</div>
                  </div>
                  <div className="char-hero-stat">
                    <div className="char-hero-stat-value">{pct(selectedChar.avgConversionRate)}</div>
                    <div className="char-hero-stat-label">Conv Rate</div>
                  </div>
                  <div className="char-hero-stat">
                    <div className="char-hero-stat-value">{pct(selectedChar.avgLCancelRate)}</div>
                    <div className="char-hero-stat-label">L-Cancel</div>
                  </div>
                  <div className="char-hero-stat">
                    <div className="char-hero-stat-value">{selectedChar.avgOpeningsPerKill}</div>
                    <div className="char-hero-stat-label">Openings/Kill</div>
                  </div>
                  <div className="char-hero-stat">
                    <div className="char-hero-stat-value">{selectedChar.avgDamagePerOpening}</div>
                    <div className="char-hero-stat-label">Dmg/Opening</div>
                  </div>
                  <div className="char-hero-stat">
                    <div className="char-hero-stat-value">{selectedChar.avgDeathPercent}%</div>
                    <div className="char-hero-stat-label">Death %</div>
                  </div>
                  <div className="char-hero-stat">
                    <div className="char-hero-stat-value">{pct(selectedChar.avgRecoverySuccessRate)}</div>
                    <div className="char-hero-stat-label">Recovery</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column — scrollable stats */}
            <div className="char-detail-right">
              {detailLoading ? (
                <div className="loading">Loading stats...</div>
              ) : (
                <>
                  {/* Radar chart */}
                  {radarStats && (
                    <div className="card">
                      <div className="card-title">Skill Profile</div>
                      <PlayerRadar stats={radarStats} />
                    </div>
                  )}

                  {/* Signature stats */}
                  {signatureStats.length > 0 && (
                    <div className="card">
                      <div className="card-title">Signature Stats</div>
                      <div className="sig-grid">
                        {signatureStats.map((s) => (
                          <div
                            key={s.label}
                            className={`sig-stat ${s.highlight ? "sig-stat-highlight" : ""}`}
                            style={s.highlight ? { borderColor: meta.color } : undefined}
                          >
                            <div className="sig-stat-value" style={s.highlight ? { color: meta.color } : undefined}>
                              {s.value}{s.suffix ?? ""}
                            </div>
                            <div className="sig-stat-label">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matchups */}
                  {matchups.length > 0 && (
                    <div className="card">
                      <div className="card-title">Matchup Records</div>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>vs Character</th>
                            <th>Games</th>
                            <th>Record</th>
                            <th>Win Rate</th>
                            <th>Neutral WR</th>
                            <th>Conv Rate</th>
                            <th>Openings/Kill</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matchups.map((m) => {
                            const oppMeta = getMeta(m.opponentCharacter);
                            return (
                              <tr key={m.opponentCharacter}>
                                <td>
                                  <span style={{ marginRight: 6 }}>{oppMeta.emoji}</span>
                                  {m.opponentCharacter}
                                </td>
                                <td>{m.gamesPlayed}</td>
                                <td>
                                  <span className="record-win">{m.wins}W</span>
                                  {" - "}
                                  <span className="record-loss">{m.losses}L</span>
                                </td>
                                <td>
                                  <span className="matchup-wr-bar" style={{ "--wr": m.winRate } as React.CSSProperties}>
                                    {pct(m.winRate)}
                                  </span>
                                </td>
                                <td>{pct(m.avgNeutralWinRate)}</td>
                                <td>{pct(m.avgConversionRate)}</td>
                                <td>{m.avgOpeningsPerKill}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Stage records */}
                  {stages.length > 0 && (
                    <div className="card">
                      <div className="card-title">Stage Records</div>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Stage</th>
                            <th>Games</th>
                            <th>Record</th>
                            <th>Win Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stages.map((s) => (
                            <tr key={s.stage}>
                              <td>{s.stage}</td>
                              <td>{s.gamesPlayed}</td>
                              <td>
                                <span className="record-win">{s.wins}W</span>
                                {" - "}
                                <span className="record-loss">{s.losses}L</span>
                              </td>
                              <td>{pct(s.winRate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
