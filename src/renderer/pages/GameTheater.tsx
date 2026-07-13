import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useGameDetail } from "../hooks/queries";
import { useReplayPlayerStore } from "../stores/useReplayPlayerStore";
import { Badge } from "../components/ui/Badge";
import { ReplayEmbed } from "../components/ReplayEmbed";
import { GameStats } from "../components/GameStats";
import { CoachingPanel } from "../components/CoachingPanel";
import { StockTimeline } from "../components/StockTimeline";
import { GameHighlightReel } from "../components/HighlightReel";

interface CoachingEntry {
  id: number;
  modelUsed: string;
  analysisText: string;
  createdAt: string;
  scope: string;
  title?: string | null;
}

interface GameDetailShape {
  id: number;
  replayPath: string;
  playedAt: string | null;
  stage: string;
  durationSeconds: number;
  playerCharacter: string | null;
  opponentCharacter: string;
  opponentTag: string;
  result: "win" | "loss";
  playerFinalStocks: number;
  opponentFinalStocks: number;
  neutralWinRate?: number;
  lCancelRate?: number;
  conversionRate?: number;
  avgDamagePerOpening?: number;
  openingsPerKill?: number;
  recoverySuccessRate?: number;
  avgDeathPercent?: number;
  powerShieldCount?: number;
  edgeguardSuccessRate?: number;
  totalDamageDealt?: number;
  coachingAnalyses?: CoachingEntry[];
}

export function GameTheater() {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const parsed = idParam != null ? Number(idParam) : NaN;
  const gameId = Number.isFinite(parsed) ? parsed : null;

  // Set when arriving from a highlight click elsewhere in the app — the embed
  // opens directly at that moment.
  const initialSeekFrame = (location.state as { seekFrame?: number } | null)?.seekFrame;

  const closeGlobalPlayer = useReplayPlayerStore((s) => s.closePlayer);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/library");
    }
  };

  // Theater owns the embed inline — close any global overlay session so we
  // don't end up with two Dolphins fighting over focus.
  useEffect(() => {
    closeGlobalPlayer();
  }, [closeGlobalPlayer]);

  const { data, isLoading, error } = useGameDetail(gameId);
  const game = data as GameDetailShape | undefined | null;

  // Frame to (re)open the embed at — bumped on timestamp click to force seek.
  const [seekFrame, setSeekFrame] = useState<number | undefined>(initialSeekFrame);
  const [reopenKey, setReopenKey] = useState(0);

  const handleTimestampSeek = (frame: number) => {
    setSeekFrame(frame);
    setReopenKey((n) => n + 1);
  };

  const preloadedCoaching = useMemo(() => {
    if (!game?.coachingAnalyses?.length) return undefined;
    const gameScope = game.coachingAnalyses.find((a) => a.scope === "game");
    return gameScope?.analysisText;
  }, [game]);

  if (gameId == null) {
    return (
      <div className="theater-error">
        <p>Invalid game id.</p>
        <button className="btn" onClick={handleBack}>
          Back
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner loading-spinner" />
        Loading game…
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="theater-error">
        <p>Game not found.</p>
        <button className="btn" onClick={handleBack}>
          Back
        </button>
      </div>
    );
  }

  const dur = typeof game.durationSeconds === "number" ? game.durationSeconds : 0;
  const mins = Math.floor(dur / 60);
  const secs = Math.round(dur % 60)
    .toString()
    .padStart(2, "0");

  return (
    <div className="game-theater">
      <div className="game-theater-stage-col">
        {game.replayPath ? (
          <ReplayEmbed replayPath={game.replayPath} startFrame={seekFrame} reopenKey={reopenKey} />
        ) : (
          <div className="theater-no-replay">
            <p>No replay file linked to this game.</p>
          </div>
        )}
      </div>

      <motion.aside className="game-theater-side-col custom-scrollbar">
        <header className="game-theater-side-head">
          <button className="btn btn-ghost game-theater-back" onClick={handleBack} aria-label="Back">
            <ChevronLeft size={16} />
            Back
          </button>
          <div className="game-theater-title-row">
            <Badge variant={game.result === "win" ? "win" : "loss"}>{game.result === "win" ? "W" : "L"}</Badge>
            <h2 className="game-theater-heading">
              {game.playerCharacter || "—"} <span style={{ color: "var(--text-muted)" }}>vs</span>{" "}
              {game.opponentCharacter}
            </h2>
          </div>
          <div className="game-theater-meta">
            vs {game.opponentTag} · {game.stage} · {mins}:{secs}
          </div>
        </header>

        {game.replayPath && (
          <StockTimeline
            replayPath={game.replayPath}
            playerCharacter={game.playerCharacter || "Player"}
            opponentCharacter={game.opponentCharacter || "Opponent"}
            onSeekFrame={handleTimestampSeek}
          />
        )}

        <GameHighlightReel gameId={game.id} onSeekFrame={game.replayPath ? handleTimestampSeek : undefined} />

        <CoachingPanel
          scope="game"
          id={game.id}
          title={`${game.playerCharacter ?? "—"} vs ${game.opponentCharacter} on ${game.stage}`}
          replayPath={game.replayPath || undefined}
          preloadedText={preloadedCoaching}
          onTimestampSeek={game.replayPath ? handleTimestampSeek : undefined}
        />

        <GameStats game={game} />
      </motion.aside>
    </div>
  );
}
