/**
 * Coerce a care entry's jsonb `details` (nullable / possibly non-object) to the
 * string map the care form uses — only string values (what the form writes)
 * survive. Shared by the log-form pre-fill (S09.5b) and the edit form.
 */
export function careDetailsToStrings(details: unknown): Record<string, string> {
  if (!details || typeof details !== "object" || Array.isArray(details)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
