import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface CoachingModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: "game" | "session" | "character" | "stage" | "opponent";
  id: string | number;
  title: string;
}

export function CoachingModal({ isOpen, onClose, scope, id, title }: CoachingModalProps) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuePos, setQueuePos] = useState<number>(0);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setAnalysis("");
    setError(null);
    setQueuePos(0);

    try {
      // Get initial queue status for progress feedback
      window.clippi.getQueueStatus().then(s => setQueuePos(s.pending)).catch(() => {});

      // Setup listener for streaming (scoped by streamId to prevent cross-listener collision)
      const streamId = crypto.randomUUID();
      const removeListener = window.clippi.onAnalysisStream((chunk, sid) => {
        if (sid !== undefined && sid !== streamId) return;
        setQueuePos(0);
        setAnalysis((prev) => prev + chunk);
      });

      const removeEndListener = window.clippi.onAnalysisStreamEnd((sid) => {
        if (sid !== undefined && sid !== streamId) return;
        setLoading(false);
      });

      const result = await window.clippi.analyzeScoped(scope, id, undefined, streamId);
      if (result) {
        setAnalysis(result);
        setLoading(false);
      }

      removeListener();
      removeEndListener();
    } catch (err: any) {
      setError(err.message || String(err));
      setLoading(false);
    }
  }, [scope, id]);

  useEffect(() => {
    if (isOpen && !analysis && !loading) {
      runAnalysis();
    }
  }, [isOpen, analysis, loading, runAnalysis]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <motion.div
        className="modal-content coaching-modal"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        <header className="coaching-header">
          <div className="coaching-title-row">
            <div className="coaching-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12L2.1 12.1"/><path d="M12 12L19 19"/><path d="M12 12V22"/>
              </svg>
            </div>
            <div>
              <h2 className="coaching-heading">MAGI Coaching</h2>
              <p className="coaching-subtitle">{title}</p>
            </div>
          </div>
          <button className="coaching-close" onClick={onClose}>&times;</button>
        </header>

        <div className="coaching-body custom-scrollbar">
          {error && (
            <div className="coaching-error">
              {error}
            </div>
          )}

          {!analysis && loading && (
            <div className="coaching-loading">
              <div className="spinner spinner-lg" />
              <p className="coaching-loading-text">
                {queuePos > 0 ? `Queued (position ${queuePos})...` : "Consulting MAGI mainframe..."}
              </p>
            </div>
          )}

          <div className="prose">
            <ReactMarkdown>{analysis}</ReactMarkdown>
            {loading && analysis && <span className="cursor-blink">_</span>}
          </div>
        </div>

        <footer className="coaching-footer">
          <p className="coaching-disclaimer">
            AI analysis may occasionally hallucinate frame-perfect tech.
          </p>
          <button className="btn" onClick={onClose}>Close</button>
        </footer>
      </motion.div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }
        .coaching-modal {
          width: min(800px, 95vw);
          height: 80vh;
          display: flex;
          flex-direction: column;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md, 8px);
        }
        .coaching-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        .coaching-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .coaching-icon {
          width: 36px;
          height: 36px;
          background: rgba(var(--accent-rgb), 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          flex-shrink: 0;
        }
        .coaching-heading {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
          color: var(--text);
        }
        .coaching-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 2px 0 0;
        }
        .coaching-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 4px 8px;
          line-height: 1;
        }
        .coaching-close:hover { color: var(--text); }
        .coaching-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        .coaching-error {
          padding: 12px 16px;
          border-radius: var(--radius-xs, 4px);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          font-size: 0.875rem;
          margin-bottom: 16px;
        }
        .coaching-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          gap: 16px;
        }
        .coaching-loading-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .coaching-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-top: 1px solid var(--border);
        }
        .coaching-disclaimer {
          font-size: 10px;
          color: var(--text-secondary);
          font-style: italic;
          margin: 0;
        }
        .cursor-blink {
          display: inline-block;
          width: 8px;
          height: 1.2em;
          background: var(--accent);
          margin-left: 4px;
          animation: blink 1s step-end infinite;
          vertical-align: middle;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .prose h1, .prose h2, .prose h3 {
          color: var(--accent);
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-family: var(--font-display);
        }
        .prose p {
          margin-bottom: 1em;
          line-height: 1.6;
          color: var(--text-secondary);
        }
        .prose ul, .prose ol {
          margin-bottom: 1em;
          padding-left: 1.5em;
        }
        .prose li {
          margin-bottom: 0.5em;
        }
        .prose strong {
          color: var(--text);
        }
      `}</style>
    </div>
  );
}
