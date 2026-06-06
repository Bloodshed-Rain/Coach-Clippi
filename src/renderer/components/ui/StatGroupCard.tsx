import { Card } from "./Card";

export interface StatItem {
  label: string;
  value: string | number;
  /** true = green, false = red, undefined = neutral */
  good?: boolean;
  /** Render as plain text (not mono), used for strings like kill-move names. */
  isText?: boolean;
}

interface StatGroupCardProps {
  title: string;
  items: StatItem[];
}

export function StatGroupCard({ title, items }: StatGroupCardProps) {
  return (
    <Card title={title}>
      <div className="stat-group-grid">
        {items.map((it) => (
          <div key={it.label} className="stat-group-cell">
            <div className="stat-group-label">{it.label}</div>
            <div
              className={it.isText ? "stat-group-value stat-group-value-text" : "stat-group-value mono"}
              style={{
                color: it.good === true ? "var(--win)" : it.good === false ? "var(--loss)" : "var(--text)",
              }}
            >
              {/* Non-color cue (WCAG 1.4.1): a glyph backs up the good/bad color. */}
              {it.good !== undefined && (
                <span className="stat-trend" aria-hidden="true">
                  {it.good ? "▲" : "▼"}
                </span>
              )}
              {String(it.value)}
              {it.good !== undefined && <span className="sr-only">{it.good ? " (on target)" : " (needs work)"}</span>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
