import { useEffect, useState } from "react";
import { CoachingCards } from "../components/CoachingCards";
import "../styles/overlay.css";

/** Toast UI for the transparent always-on-top overlay window (#/overlay).
 *  The main process shows the window when a card starts streaming; this
 *  component just renders whatever arrives and offers ✕ to hide. */
export function CornermanOverlay() {
  const [status, setStatus] = useState<CornermanStatus | null>(null);
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("overlay-mode");
    window.clippi.cornermanStatus().then(setStatus).catch(() => {});
    const offStream = window.clippi.onCornermanStream((chunk) => {
      setError(null);
      setIsStreaming(true);
      setText((prev) => prev + chunk);
    });
    const offCard = window.clippi.onCornermanCard((card) => {
      setIsStreaming(false);
      setText(card.text);
    });
    const offUpdate = window.clippi.onCornermanSetUpdate((s) => {
      setStatus(s);
      // New game registered — clear the previous card so the next stream starts clean.
      setText("");
    });
    const offError = window.clippi.onCornermanError((message) => {
      setIsStreaming(false);
      setText("");
      setError(message);
    });
    return () => {
      document.body.classList.remove("overlay-mode");
      offStream();
      offCard();
      offUpdate();
      offError();
    };
  }, []);

  const dismiss = () => {
    window.clippi.cornermanOverlayDismiss().catch(() => {});
  };

  return (
    <div className="overlay-toast">
      <div className="overlay-toast-head">
        <span className="overlay-toast-title">Cornerman</span>
        {status && status.gamesCount > 0 && (
          <span className="overlay-toast-score">
            {status.wins}-{status.losses} vs {status.opponentTag} · G{status.gamesCount}
          </span>
        )}
        <button className="overlay-toast-close" onClick={dismiss} aria-label="Dismiss">
          ✕
        </button>
      </div>
      <div className="overlay-toast-body">
        {error ? (
          <div className="overlay-toast-waiting" role="alert">
            {error}
          </div>
        ) : text ? (
          <CoachingCards text={text} isStreaming={isStreaming} />
        ) : (
          <div className="overlay-toast-waiting">Waiting for the next game…</div>
        )}
      </div>
    </div>
  );
}
