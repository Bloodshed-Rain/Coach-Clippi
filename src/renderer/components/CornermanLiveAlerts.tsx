interface CornermanLiveAlertsProps {
  events: CornermanLiveEvent[];
  compact?: boolean;
}

export function CornermanLiveAlerts({ events, compact = false }: CornermanLiveAlertsProps) {
  if (events.length === 0) return null;

  return (
    <div className={`cornerman-live-alerts${compact ? " cornerman-live-alerts-compact" : ""}`}>
      {events.map((event) => (
        <div className={`cornerman-live-alert cornerman-live-alert-${event.importance}`} key={event.id}>
          <div className="cornerman-live-alert-head">
            <span className="cornerman-live-alert-title">{event.title}</span>
            <span className="cornerman-live-alert-time">{event.timestamp}</span>
          </div>
          <div className="cornerman-live-alert-body">{event.body}</div>
        </div>
      ))}
    </div>
  );
}
