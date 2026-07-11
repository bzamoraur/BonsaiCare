/**
 * Pure helpers for the error-visibility feature (see `app_errors` migration).
 * Kept free of any I/O so the sanitisation is unit-testable and shared by the
 * client-crash route handler and the server-side `logActionError`.
 *
 * Everything here is PII-poor by construction: text is length-bounded and paths
 * are reduced to their pathname (no query string, which can carry ids/tokens).
 */

/** RPC argument shape for `record_client_error` (optional args omitted, never null). */
export type AppErrorArgs = {
  p_source: "client" | "server";
  p_context?: string;
  p_message?: string;
  p_digest?: string;
  p_path?: string;
  p_user_agent?: string;
  p_release?: string;
};

/** A non-empty string clamped to `max` chars, or undefined (never null/blank). */
export function clampText(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.slice(0, max) : undefined;
}

/** Reduce a URL/path to its pathname — drop any `?query` or `#hash`. */
export function pathnameOnly(value: unknown): string | undefined {
  const s = clampText(value, 500);
  return s ? s.split(/[?#]/)[0] : undefined;
}

/** A short, human-legible description of an unknown thrown value. */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}

/**
 * Turn an untrusted client beacon body + request-derived fields into validated,
 * length-bounded RPC args. Returns null if the body isn't a JSON object. The
 * client can send anything; nothing here trusts it beyond "string, clamped".
 */
export function parseClientErrorReport(
  body: unknown,
  meta: { userAgent?: string | null; release?: string | null },
): AppErrorArgs | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  return {
    p_source: "client",
    p_context: clampText(b.context, 200),
    p_message: clampText(b.message, 2000),
    p_digest: clampText(b.digest, 100),
    p_path: pathnameOnly(b.path),
    p_user_agent: clampText(meta.userAgent, 500),
    p_release: clampText(meta.release, 100),
  };
}

/** Build the args for a server-side error (from `logActionError`). */
export function serverErrorArgs(
  context: string,
  error: unknown,
  release?: string | null,
): AppErrorArgs {
  return {
    p_source: "server",
    p_context: clampText(context, 200),
    p_message: clampText(describeError(error), 2000),
    p_release: clampText(release, 100),
  };
}
