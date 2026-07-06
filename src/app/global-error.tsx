"use client";

/**
 * Last-resort error boundary — catches errors in the root layout itself, which
 * (app)/error.tsx can't reach. It replaces the whole document, so it can't use
 * the app's CSS; styles are inline and minimal. Unhandled runtime errors are
 * also captured by Vercel's observability (Sentry is deferred until the
 * @sentry/nextjs dependency installs cleanly on Next 16 — see the backlog).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background: "#f4f6f1",
          color: "#18211c",
        }}
      >
        <main style={{ textAlign: "center", padding: "2rem", maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#586259", fontSize: "0.95rem", margin: "0 0 1.25rem" }}>
            The app hit an unexpected error. Your data is safe.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              font: "inherit",
              fontWeight: 500,
              background: "#2e6a4e",
              color: "#ffffff",
              border: 0,
              borderRadius: "0.5rem",
              padding: "0.55rem 1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p
              style={{
                color: "#838d84",
                fontSize: "0.75rem",
                fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                margin: "1rem 0 0",
              }}
            >
              If you report this, quote: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
