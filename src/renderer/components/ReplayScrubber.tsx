import { useCallback, useRef, useState } from "react";
import { clampFrame, frameToTimestamp } from "../utils/scrubber";

export interface ReplayScrubberProps {
  /** Current playback frame (puck position when not dragging). */
  currentFrame: number;
  /** Total frames of the replay (must be > 0; render nothing otherwise). */
  totalFrames: number;
  /** Called once on pointer-up after a click or drag with the final frame. */
  onSeek: (frame: number) => void;
}

interface DragState {
  ghostFrame: number;
}

export function ReplayScrubber({ currentFrame, totalFrames, onSeek }: ReplayScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverFrame, setHoverFrame] = useState<number | null>(null);

  const frameAtClientX = useCallback(
    (clientX: number): number => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return clampFrame(ratio * totalFrames, totalFrames);
    },
    [totalFrames],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = frameAtClientX(e.clientX);
      setDrag({ ghostFrame: f });
      // Capture so pointermove fires even if the cursor leaves the bar.
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [frameAtClientX],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const f = frameAtClientX(e.clientX);
      if (drag) {
        setDrag({ ghostFrame: f });
      } else {
        setHoverFrame(f);
      }
    },
    [drag, frameAtClientX],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag) return;
      const finalFrame = frameAtClientX(e.clientX);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      setDrag(null);
      onSeek(finalFrame);
    },
    [drag, frameAtClientX, onSeek],
  );

  const onPointerLeave = useCallback(() => {
    if (!drag) setHoverFrame(null);
  }, [drag]);

  const displayFrame = drag ? drag.ghostFrame : currentFrame;
  const fillPct = totalFrames > 0 ? (displayFrame / totalFrames) * 100 : 0;
  const tooltipFrame = drag ? drag.ghostFrame : hoverFrame;
  const tooltipPct = tooltipFrame != null && totalFrames > 0 ? (tooltipFrame / totalFrames) * 100 : 0;

  return (
    <div className="replay-scrubber-row">
      <div
        ref={trackRef}
        className="replay-scrubber-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        role="slider"
        aria-label="Replay timeline"
        aria-valuemin={0}
        aria-valuemax={totalFrames}
        aria-valuenow={Math.floor(displayFrame)}
      >
        <div className="replay-scrubber-fill" style={{ width: `${fillPct}%` }} />
        <div className="replay-scrubber-puck" style={{ left: `${fillPct}%` }} />
        {tooltipFrame != null && (
          <div className="replay-scrubber-tooltip" style={{ left: `${tooltipPct}%` }}>
            {frameToTimestamp(tooltipFrame)}
          </div>
        )}
      </div>
      <div className="replay-scrubber-time">
        {frameToTimestamp(displayFrame)} / {frameToTimestamp(totalFrames)}
      </div>
    </div>
  );
}
