import { FastForward, HelpCircle, Pause, Play, Repeat2, Rewind, RotateCcw } from "lucide-react";
import type { ReplayPlaybackStatus } from "../hooks/useEmbeddedReplaySession";

interface ReplayTransportControlsProps {
  status: ReplayPlaybackStatus;
  isPaused: boolean;
  onTogglePause: () => void;
  onSeekRelative: (seconds: number) => void;
  onRestart: () => void;
  loopEnabled?: boolean;
  onToggleLoop?: () => void;
  showCloseHint?: boolean;
}

export function ReplayTransportControls({
  status,
  isPaused,
  onTogglePause,
  onSeekRelative,
  onRestart,
  loopEnabled,
  onToggleLoop,
  showCloseHint = false,
}: ReplayTransportControlsProps) {
  const canControl = status === "ready";
  const canRestart = canControl || status === "ended";

  return (
    <div className="replay-player-controls">
      <button
        className="replay-control-btn"
        type="button"
        onClick={() => onSeekRelative(-2)}
        disabled={!canControl}
        title="Back 2 seconds (Left Arrow)"
        aria-label="Back 2 seconds"
      >
        <Rewind size={16} />
      </button>
      <button
        className="replay-control-btn replay-control-primary"
        type="button"
        onClick={onTogglePause}
        disabled={!canControl}
        title="Pause or play (Space)"
        aria-label={isPaused ? "Play replay" : "Pause replay"}
      >
        {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
      </button>
      <button
        className="replay-control-btn"
        type="button"
        onClick={() => onSeekRelative(2)}
        disabled={!canControl}
        title="Forward 2 seconds (Right Arrow)"
        aria-label="Forward 2 seconds"
      >
        <FastForward size={16} />
      </button>
      <button
        className="replay-control-btn"
        type="button"
        onClick={onRestart}
        disabled={!canRestart}
        title="Restart replay"
        aria-label="Restart replay"
      >
        <RotateCcw size={16} />
      </button>
      {onToggleLoop && (
        <button
          className={`replay-control-btn${loopEnabled ? " replay-control-active" : ""}`}
          type="button"
          onClick={onToggleLoop}
          disabled={!canControl}
          title="Loop selected review clip"
          aria-label="Loop selected review clip"
          aria-pressed={Boolean(loopEnabled)}
        >
          <Repeat2 size={16} />
        </button>
      )}
      <div className="replay-hotkey-help" tabIndex={0} aria-label="Keyboard shortcuts">
        <button className="replay-control-btn" type="button" aria-haspopup="true" aria-label="Keyboard shortcuts">
          <HelpCircle size={14} />
        </button>
        <div className="replay-hotkey-help-tooltip" role="tooltip">
          <div>
            <kbd>Space</kbd> Pause / Play
          </div>
          <div>
            <kbd>←</kbd> <kbd>→</kbd> Jump 2 seconds
          </div>
          {showCloseHint && (
            <div>
              <kbd>Esc</kbd> Close
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
