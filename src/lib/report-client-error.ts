/**
 * Fire-and-forget client-crash report to `/api/log-error`, called from the error
 * boundaries (`error.tsx`, `global-error.tsx`) so a friend's white-screen isn't
 * invisible. Uses `navigator.sendBeacon` — it survives the boundary tearing the
 * page down and never blocks rendering. The route handler validates, bounds, and
 * strips the payload before it reaches the database, so this stays deliberately
 * thin. It must never throw (it runs inside an error boundary).
 */
export function reportClientError(report: {
  context: string;
  message?: string;
  digest?: string;
  path?: string;
}): void {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;
  try {
    const body = JSON.stringify({
      context: report.context,
      message: report.message,
      digest: report.digest,
      path: report.path ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    });
    navigator.sendBeacon("/api/log-error", new Blob([body], { type: "application/json" }));
  } catch {
    // Reporting a crash must never itself crash.
  }
}
