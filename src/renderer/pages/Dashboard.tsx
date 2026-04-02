import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown, { type Components } from "react-markdown";
import { Onboarding } from "../components/Onboarding";
import { StockTimeline } from "../components/StockTimeline";
import { Tooltip } from "../components/Tooltip";
import { useRecentGames, useConfig } from "../hooks/queries";
import { formatGameDate } from "../hooks";

/** Returns a CSS color variable based on thresholds: good (green), ok (yellow), bad (red) */
function statColor(value: number, goodAbove: number, okAbove?: number): string {
  if (value > goodAbove) return "var(--green)";
  if (okAbove !== undefined && value > okAbove) return "var(--yellow)";
  return "var(--red)";
}

/** Same as statColor but lower is better (e.g. openings per kill) */
function statColorInverse(value: number, goodBelow: number, okBelow: number): string {
  if (!Number.isFinite(value)) return "var(--text-muted)";
  if (value <= goodBelow) return "var(--green)";
  if (value <= okBelow) return "var(--yellow)";
  return "var(--red)";
}

const FPS = 60;
const FIRST_PLAYABLE = -123; // Frames.FIRST_PLAYABLE from slippi-js

/** Convert a "M:SS" timestamp string back to a game frame number */
function timestampToFrame(ts: string): number {
  const parts = ts.split(":");
  if (parts.length !== 2) return 0;
  const minutes = parseInt(parts[0]!, 10);
  const seconds = parseInt(parts[1]!, 10);
  if (isNaN(minutes) || isNaN(seconds)) return 0;
  return (minutes * 60 + seconds) * FPS + FIRST_PLAYABLE;
}

/** Pre-process coaching markdown to convert [M:SS] timestamps into inline code spans */
function injectTimestampLinks(text: string): string {
  return text.replace(/\[(\d{1,2}:\d{2})\]/g, "`ts:$1`");
}

/** Create react-markdown components that render timestamp code spans as clickable buttons */
function makeTimestampComponents(replayPath: string): Components {
  return {
    code: ({ children }) => {
      const text = String(children);
      const match = text.match(/^ts:(\d{1,2}:\d{2})$/);
      if (match) {
        const ts = match[1]!;
        const frame = timestampToFrame(ts);
        const handleClick = async (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            await window.clippi.openInDolphinAtFrame(replayPath, frame);
          } catch (err) {
            console.error("Failed to open Dolphin at timestamp:", err);
          }
        };
        return (
          <button
            onClick={handleClick}
            className="timestamp-link"
            title={`Open replay at ${ts} — Dolphin will fast-forward to this point, hang tight`}
          >
            ▶ {ts}
          </button>
        );
      }
      return <code>{children}</code>;
    },
    a: ({ href, children }) => {
      // Prevent any remaining links from navigating the Electron renderer
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.preventDefault()}>
          {children}
        </a>
      );
    },
  };
}

interface RecentGame {
  id: number;
  playedAt: string | null;
  stage: string;
  playerCharacter: string;
  opponentCharacter: string;
  opponentTag: string;
  result: string;
  playerFinalStocks: number;
  opponentFinalStocks: number;
  neutralWinRate: number;
  lCancelRate: number;
  openingsPerKill: number;
  edgeguardSuccessRate: number;
  replayPath: string;
}

// Animated stat with count-up
function PulseStat({ value, label, color, index, tip }: {
  value: string;
  label: string;
  color: string;
  index: number;
  tip?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="stat-box"
    >
      <div className="stat-value" style={{ color }}>{value}</div>
      {tip ? (
        <Tooltip text={tip} position="bottom">
          <span className="stat-label">{label}</span>
        </Tooltip>
      ) : (
        <div className="stat-label">{label}</div>
      )}
    </motion.div>
  );
}

// Quick-glance stats from the last session
function SessionPulse({ games }: { games: RecentGame[] }) {
  if (games.length === 0) return null;

  const wins = games.filter((g) => g.result === "win").length;
  const losses = games.length - wins;
  const avgNeutral = games.reduce((s, g) => s + g.neutralWinRate, 0) / games.length;
  const avgLCancel = games.reduce((s, g) => s + g.lCancelRate, 0) / games.length;

  const recordColor = wins > losses ? "var(--green)" : wins < losses ? "var(--red)" : "var(--text)";
  const stats = [
    { label: "Record", value: `${wins}W-${losses}L`, color: recordColor, tip: "Wins vs losses in your recent session" },
    { label: "Neutral WR", value: `${(avgNeutral * 100).toFixed(1)}%`, color: statColor(avgNeutral, 0.5), tip: "How often you win the neutral game — first hit in an exchange. Above 50% means you're winning more openers than your opponent." },
    { label: "L-Cancel", value: `${(avgLCancel * 100).toFixed(1)}%`, color: statColor(avgLCancel, 0.85), tip: "Percentage of aerial landings where you successfully L-cancelled. 85%+ is good, 95%+ is top-level." },
    { label: "Games", value: `${games.length}`, color: "var(--text)", tip: "Total games in this recent session" },
  ];

  return (
    <div className="session-pulse">
      {stats.map((s, i) => (
        <PulseStat key={s.label} value={s.value} label={s.label} color={s.color} index={i} tip={s.tip} />
      ))}
    </div>
  );
}

const TIMESTAMP_PATTERN = /\[\d{1,2}:\d{2}\]/;

/** Renders analysis markdown with memoized timestamp components to avoid full re-parse on every render */
function GameAnalysisText({ replayPath, text, isStreaming, showTimestampHint }: {
  replayPath: string;
  text: string;
  isStreaming?: boolean;
  showTimestampHint?: boolean;
}) {
  const components = useMemo(() => makeTimestampComponents(replayPath), [replayPath]);
  const processed = useMemo(() => injectTimestampLinks(text), [text]);
  const hasTimestamps = showTimestampHint && TIMESTAMP_PATTERN.test(text);

  return (
    <div className="analysis-text">
      <Markdown components={components}>{processed}</Markdown>
      {isStreaming && <span className="streaming-cursor" />}
      {hasTimestamps && (
        <p className="timestamp-hint">
          Timestamps open the replay in Dolphin — it'll fast-forward to the moment, so give it a sec.
        </p>
      )}
    </div>
  );
}

export function Dashboard({ refreshKey }: { refreshKey: number }) {
  const { data: games = [], isLoading: loading, refetch } = useRecentGames(20);
  const { data: config } = useConfig();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Discovery / Oracle state
  const [discovery, setDiscovery] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryStream, setDiscoveryStream] = useState("");
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Per-game analysis state
  const [expandedGame, setExpandedGame] = useState<number | null>(null);
  const [analysisCache, setAnalysisCache] = useState<Record<number, string>>({});
  const [analyzingGame, setAnalyzingGame] = useState<number | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<{ pending: number; processing: boolean } | null>(null);
  const [dolphinError, setDolphinError] = useState<string | null>(null);
  const [launchingDolphin, setLaunchingDolphin] = useState<number | null>(null);
  // Streaming state: text accumulating in real-time
  const [streamingText, setStreamingText] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);

  const handleWatchReplay = async (e: React.MouseEvent, game: RecentGame) => {
    e.stopPropagation();
    setDolphinError(null);
    setLaunchingDolphin(game.id);
    try {
      await window.clippi.openInDolphin(game.replayPath);
    } catch (err: unknown) {
      setDolphinError(err instanceof Error ? err.message : String(err));
    }
    setLaunchingDolphin(null);
  };

  useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);

  const handleGameClick = async (game: RecentGame) => {
    if (expandedGame === game.id) {
      setExpandedGame(null);
      return;
    }

    setExpandedGame(game.id);
    setAnalyzeError(null);
    setDolphinError(null);

    if (analysisCache[game.id]) return;

    setAnalyzingGame(game.id);
    setStreamingText("");
    setIsStreaming(false);
    setQueueStatus(null);

    // Fetch queue status for progress feedback
    window.clippi.getQueueStatus().then(setQueueStatus).catch(() => {});

    // Subscribe to streaming chunks (scoped by streamId to prevent cross-listener collision)
    const streamId = crypto.randomUUID();
    const unsubStream = window.clippi.onAnalysisStream((chunk: string, sid?: string) => {
      if (sid !== undefined && sid !== streamId) return;
      setIsStreaming(true);
      setStreamingText((prev) => prev + chunk);
    });
    const unsubEnd = window.clippi.onAnalysisStreamEnd((sid?: string) => {
      if (sid !== undefined && sid !== streamId) return;
      setIsStreaming(false);
    });

    try {
      const target = config?.connectCode || config?.targetPlayer || "";
      const result = await window.clippi.analyzeReplays([game.replayPath], target, streamId);
      // Cache the final complete text (from the invoke return value)
      setAnalysisCache((prev) => ({ ...prev, [game.id]: result }));
      setStreamingText("");
    } catch (err: unknown) {
      setAnalyzeError(err instanceof Error ? err.message : String(err));
      setStreamingText("");
    } finally {
      unsubStream();
      unsubEnd();
      setIsStreaming(false);
      setAnalyzingGame(null);
      setQueueStatus(null);
    }
  };

  const handleRunDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveryStream("");
    setDiscovery(null);
    setDiscoveryError(null);

    const discoveryStreamId = crypto.randomUUID();
    const unsubStream = window.clippi.onAnalysisStream((chunk: string, sid?: string) => {
      if (sid !== undefined && sid !== discoveryStreamId) return;
      setDiscoveryStream((prev) => prev + chunk);
    });
    const unsubEnd = window.clippi.onAnalysisStreamEnd((sid?: string) => {
      if (sid !== undefined && sid !== discoveryStreamId) return;
      setIsDiscovering(false);
    });

    try {
      const result = await window.clippi.analyzeDiscovery(discoveryStreamId);
      setDiscovery(result);
      setDiscoveryStream("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Discovery failed:", err);
      if (msg.includes("minimum 5 games")) {
        setDiscoveryError("Deep Discovery requires at least 5 imported games. Import more replays and try again.");
      } else {
        setDiscoveryError(msg);
      }
    } finally {
      unsubStream();
      unsubEnd();
      setIsDiscovering(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner loading-spinner" />
        Loading...
      </div>
    );
  }

  if (games.length === 0 && !onboardingDismissed) {
    return (
      <Onboarding
        onComplete={() => {
          setOnboardingDismissed(true);
          refetch();
        }}
        onSkip={() => setOnboardingDismissed(true)}
      />
    );
  }

  if (games.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="9" y1="8" x2="17" y2="8" />
            <line x1="9" y1="12" x2="14" y2="12" />
          </svg>
        </div>
        <h2>No replays found</h2>
        <p>Go to Settings to configure your replay folder and import your games.</p>
      </div>
    );
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="page-header">
          <h1>Coaching</h1>
          <p>Select a game for AI coaching analysis</p>
        </div>
      </motion.div>

      <SessionPulse games={games} />

      {/* MAGI Discovery (The Oracle) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="discovery-section"
      >
        <div className="card discovery-card">
          <div className="discovery-header">
            <div className="discovery-title-row">
              <div className="discovery-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12L2.1 12.1"/><path d="M12 12L19 19"/><path d="M12 12V22"/>
                </svg>
              </div>
              <div>
                <h2 className="discovery-heading">Deep Discovery</h2>
                <p className="discovery-desc">
                  MAGI is mining your entire career for hidden mathematical truths and non-obvious win conditions.
                </p>
              </div>
            </div>
            {!discovery && !isDiscovering && (
              <button className="btn btn-primary discovery-btn" onClick={handleRunDiscovery}>
                Synthesize Career Narrative
              </button>
            )}
          </div>

          {discoveryError && (
            <div className="discovery-error">
              {discoveryError}
            </div>
          )}

          {(isDiscovering || discovery || discoveryStream) && (
            <div className="discovery-body">
              {isDiscovering && !discoveryStream && (
                <div className="analyze-loading">
                  <div className="spinner" />
                  <span>Running correlation matrix and situational anomaly filters...</span>
                </div>
              )}
              <div className="analysis-text discovery-analysis-text">
                <Markdown>{discovery || discoveryStream}</Markdown>
                {isDiscovering && <span className="streaming-cursor" />}
              </div>
              {discovery && !isDiscovering && (
                <button className="btn discovery-refresh-btn" onClick={handleRunDiscovery}>Refresh Discovery</button>
              )}
            </div>
          )}
          
          <div className="discovery-decor">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="var(--accent)">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
            </svg>
          </div>
        </div>
      </motion.div>

      <div className="game-list">
        {games.map((game, index) => {
          const isExpanded = expandedGame === game.id;
          const isAnalyzing = analyzingGame === game.id;
          const cached = analysisCache[game.id];

          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.12), duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={`game-card ${isExpanded ? "expanded" : ""} ${game.result === "win" ? "game-card-win" : "game-card-loss"}`}>
                <div className="game-card-header" role="button" tabIndex={0} onClick={() => handleGameClick(game)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleGameClick(game); } }}>
                  <div className="game-card-result">
                    <span className={game.result === "win" ? "result-badge win" : "result-badge loss"}>
                      {game.result === "win" ? "W" : "L"}
                    </span>
                    <span className="stock-count">{game.playerFinalStocks}-{game.opponentFinalStocks}</span>
                  </div>
                  <div className="game-card-matchup">
                    <div className="game-card-chars">
                      {game.playerCharacter} vs {game.opponentCharacter}
                    </div>
                    <div className="game-card-opponent">
                      vs {game.opponentTag}
                    </div>
                  </div>
                  <div className="game-card-details">
                    <span className="game-card-stage">{game.stage}</span>
                    <span className="game-card-date">
                      {formatGameDate(game.playedAt)}
                    </span>
                  </div>
                  <div className="game-card-stats">
                    <div className="mini-stat">
                      <span className="mini-stat-value" style={{ color: statColor(game.neutralWinRate, 0.5) }}>
                        {(game.neutralWinRate * 100).toFixed(0)}%
                      </span>
                      <Tooltip text="Neutral win rate — how often you won the first hit in an exchange" position="top">
                        <span className="mini-stat-label">Neutral</span>
                      </Tooltip>
                    </div>
                    <div className="mini-stat">
                      <span className="mini-stat-value" style={{ color: statColorInverse(game.openingsPerKill, 4, 7) }}>
                        {Number.isFinite(game.openingsPerKill) ? game.openingsPerKill.toFixed(1) : "\u2014"}
                      </span>
                      <Tooltip text="Openings per kill — how many neutral wins it takes to get a stock. Lower is better (fewer openings needed)." position="top">
                        <span className="mini-stat-label">Op/Kill</span>
                      </Tooltip>
                    </div>
                    <div className="mini-stat">
                      <span className="mini-stat-value" style={{ color: statColor(game.lCancelRate, 0.85, 0.7) }}>
                        {(game.lCancelRate * 100).toFixed(0)}%
                      </span>
                      <Tooltip text="L-cancel success rate — percentage of aerials landing with a successful L-cancel input" position="top">
                        <span className="mini-stat-label">L-Cancel</span>
                      </Tooltip>
                    </div>
                    <div className="mini-stat">
                      <span className="mini-stat-value" style={{ color: statColor(game.edgeguardSuccessRate, 0.6, 0.3) }}>
                        {(game.edgeguardSuccessRate * 100).toFixed(0)}%
                      </span>
                      <Tooltip text="Edgeguard success rate — how often your offstage attempts result in a stock taken" position="top">
                        <span className="mini-stat-label">Edgeguard</span>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="game-card-chevron">
                    <motion.span
                      className="game-card-chevron-icon"
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {"\u25BC"}
                    </motion.span>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      className="game-card-analysis"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="game-card-controls">
                        <button
                          className="btn game-card-watch-btn"
                          onClick={(e) => handleWatchReplay(e, game)}
                          disabled={launchingDolphin === game.id}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          {launchingDolphin === game.id ? "Launching..." : "Watch Replay"}
                        </button>
                        {dolphinError && expandedGame === game.id && (
                          <span className="game-card-error">{dolphinError}</span>
                        )}
                      </div>
                      <StockTimeline
                        replayPath={game.replayPath}
                        playerCharacter={game.playerCharacter}
                        opponentCharacter={game.opponentCharacter}
                      />
                      {analyzingGame === game.id && !isStreaming && !streamingText && !cached && (
                        <div className="analyze-loading">
                          <div className="spinner" />
                          <span>{queueStatus && queueStatus.pending > 0 ? `Queued (position ${queueStatus.pending})...` : "Starting analysis..."}</span>
                        </div>
                      )}
                      {analyzingGame === game.id && (isStreaming || streamingText) && !cached && (
                        <GameAnalysisText replayPath={game.replayPath} text={streamingText} isStreaming={isStreaming} />
                      )}
                      {analyzeError && expandedGame === game.id && !cached && !streamingText && (
                        <p className="game-card-error">{analyzeError}</p>
                      )}
                      {cached && (
                        <GameAnalysisText replayPath={game.replayPath} text={cached} showTimestampHint />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
