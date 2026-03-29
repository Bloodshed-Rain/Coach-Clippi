import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40,
          maxWidth: 600,
          margin: "80px auto",
          textAlign: "center",
          color: "var(--text)",
        }}>
          <h2 style={{ marginBottom: 12, color: "var(--red, #C60707)" }}>Something went wrong</h2>
          <p style={{ color: "var(--text-dim)", marginBottom: 16, fontSize: 14 }}>
            MAGI hit an unexpected error. Try reloading the app.
          </p>
          <pre style={{
            textAlign: "left",
            padding: 16,
            borderRadius: 8,
            background: "var(--surface-1, #111a16)",
            border: "1px solid var(--border, #263830)",
            fontSize: 12,
            overflow: "auto",
            maxHeight: 200,
            color: "var(--text-dim)",
          }}>
            {this.state.error?.message ?? "Unknown error"}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
            }}
            style={{
              marginTop: 16,
              padding: "8px 20px",
              borderRadius: 6,
              border: "none",
              background: "var(--accent, #18FF6D)",
              color: "#000",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
