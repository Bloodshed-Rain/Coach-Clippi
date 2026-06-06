import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

interface Msg {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

const STARTER_PROMPTS = [
  "Why am I losing to Fox lately?",
  "Where is my edgeguard weakest?",
  "What's my biggest neutral leak?",
  "How can I convert more openings?",
];

export function Oracle({ refreshKey: _ }: { refreshKey: number }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const [dots, setDots] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.clippi.oracleListMessages().then(setMsgs);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length, loading]);

  // Animate the "Thinking…" placeholder so the long wait doesn't look frozen.
  useEffect(() => {
    if (!loading) {
      setDots("");
      return;
    }
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(id);
  }, [loading]);

  const ask = async (raw: string) => {
    const text = raw.trim();
    if (!text || loading) return;
    setLoading(true);
    setErr(null);
    setLastQuestion(text);
    try {
      const { user, assistant } = await window.clippi.oracleAsk(text);
      setMsgs((m) => [...m, user, assistant]);
      setInput("");
    } catch (e) {
      // Preserve the typed question so it isn't lost on failure.
      setInput(text);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const submit = () => ask(input);

  const clear = async () => {
    if (!confirm("Clear Oracle conversation history?")) return;
    await window.clippi.oracleClear();
    setMsgs([]);
  };

  return (
    <div style={{ height: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>
      <div className="page-header">
        <div>
          <h1>MAGI Oracle</h1>
          <p>Ask about any game, session, or pattern</p>
        </div>
        {msgs.length > 0 && (
          <button className="btn btn-ghost" onClick={clear}>
            Clear history
          </button>
        )}
      </div>
      <Card style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
        <div className="oracle-scroll">
          {msgs.length === 0 && !loading ? (
            <div style={{ flex: 1, display: "grid", placeContent: "center" }}>
              <EmptyState
                title="Ask the Oracle"
                sub="Tap a starter question or type your own below."
                chips={STARTER_PROMPTS.map((q) => ({ label: q, onClick: () => ask(q) }))}
              />
            </div>
          ) : null}
          {msgs.map((m) => (
            <div key={m.id} className="oracle-row">
              <div className={`oracle-avatar oracle-avatar-${m.role}`}>{m.role === "user" ? "Y" : "M"}</div>
              <div className="oracle-body">
                <Markdown>{m.content}</Markdown>
              </div>
            </div>
          ))}
          {loading && (
            <div className="oracle-row">
              <div className="oracle-avatar oracle-avatar-assistant">M</div>
              <div className="oracle-body">
                <em style={{ color: "var(--text-muted)" }}>Thinking{dots}</em>
              </div>
            </div>
          )}
          {err && (
            <div className="oracle-row">
              <div className="oracle-avatar oracle-avatar-assistant">M</div>
              <div className="oracle-body">
                <p style={{ color: "var(--loss)", margin: 0 }}>{err}</p>
                {lastQuestion && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => ask(lastQuestion)}
                    disabled={loading}
                    style={{ marginTop: 8 }}
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="oracle-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask about a game, matchup, or pattern…"
            disabled={loading}
            className="oracle-input"
          />
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            Ask
          </button>
        </div>
      </Card>
    </div>
  );
}
