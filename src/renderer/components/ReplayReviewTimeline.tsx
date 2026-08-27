import type { KeyboardEvent, PointerEvent } from "react";
import { clampReplayFrame, formatReplayFrame, type ReplayReviewMarker } from "../../replayReview";

interface ReplayReviewTimelineProps {
  durationFrames: number;
  currentFrame: number;
  markers: ReplayReviewMarker[];
  selectedMarkerId?: string | null;
  onScrub: (frame: number) => void;
  onMarker: (marker: ReplayReviewMarker) => void;
}

export function ReplayReviewTimeline({
  durationFrames,
  currentFrame,
  markers,
  selectedMarkerId,
  onScrub,
  onMarker,
}: ReplayReviewTimelineProps) {
  const maxFrame = Math.max(1, durationFrames);
  const clampedCurrent = clampReplayFrame(currentFrame, maxFrame);
  const progress = (clampedCurrent / maxFrame) * 100;

  const seekFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".replay-review-marker")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    onScrub(clampReplayFrame(ratio * maxFrame, maxFrame));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    const increment = event.shiftKey ? 5 * 60 : 60;
    if (event.key === "ArrowLeft") next = clampedCurrent - increment;
    else if (event.key === "ArrowRight") next = clampedCurrent + increment;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = maxFrame;
    if (next == null) return;
    event.preventDefault();
    onScrub(clampReplayFrame(next, maxFrame));
  };

  return (
    <div className="replay-review-timeline-shell">
      <div className="replay-review-time" aria-live="off">
        <span>≈ {formatReplayFrame(clampedCurrent)}</span>
        <span>{formatReplayFrame(maxFrame)}</span>
      </div>
      <div
        className="replay-review-track"
        role="slider"
        tabIndex={0}
        aria-label="Replay timeline"
        aria-valuemin={0}
        aria-valuemax={maxFrame}
        aria-valuenow={clampedCurrent}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest(".replay-review-marker")) return;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            seekFromPointer(event);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onKeyDown={onKeyDown}
      >
        <div className="replay-review-progress" style={{ width: `${progress}%` }} />
        <div className="replay-review-playhead" style={{ left: `${progress}%` }} />
        {markers.map((marker, index) => {
          const left = (clampReplayFrame(marker.frame, maxFrame) / maxFrame) * 100;
          return (
            <button
              type="button"
              key={marker.id}
              className={`replay-review-marker replay-review-marker-${marker.kind}${
                selectedMarkerId === marker.id ? " replay-review-marker-selected" : ""
              }`}
              style={{ left: `${left}%`, top: index % 2 === 0 ? -5 : 8 }}
              title={`${marker.label} · ${formatReplayFrame(marker.frame)}`}
              aria-label={`${marker.label} at ${formatReplayFrame(marker.frame)}`}
              onClick={(event) => {
                event.stopPropagation();
                onMarker(marker);
              }}
            />
          );
        })}
      </div>
      <div className="replay-review-legend" aria-hidden="true">
        <span>
          <i className="replay-review-dot replay-review-dot-highlight" />
          Highlights
        </span>
        <span>
          <i className="replay-review-dot replay-review-dot-player" />
          Your stocks
        </span>
        <span>
          <i className="replay-review-dot replay-review-dot-opponent" />
          Opponent stocks
        </span>
      </div>
    </div>
  );
}
