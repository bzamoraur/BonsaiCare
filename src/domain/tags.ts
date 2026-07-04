/**
 * Parses a comma-separated tag input into a clean, de-duplicated list. Pure and
 * synchronous so it can be unit-tested; the server action feeds it the raw form
 * value. De-dupe is case-insensitive (keeping the first casing seen); over-long
 * tags are dropped and the count is capped as a guard against abuse.
 */
export const MAX_TAG_LENGTH = 30;
export const MAX_TAGS = 20;

export function parseTagInput(raw: unknown): string[] {
  if (typeof raw !== "string") return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of raw.split(",")) {
    const name = part.trim();
    if (name === "" || name.length > MAX_TAG_LENGTH) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(name);
    if (result.length >= MAX_TAGS) break;
  }

  return result;
}
