/**
 * Pure filename logic for the photo-archive export (ADR-0008). Kept separate
 * from the streaming route so it is unit-testable without a storage backend.
 *
 * Entries are grouped in a per-tree folder and named by capture date + a short
 * id, e.g. `Chinese juniper/2026-05-01-a1b2c3d4.webp`. Names are sanitized (no
 * path traversal, no zip-hostile characters) and de-duplicated within the zip.
 */

// Characters unsafe in a zip entry / Windows path name. Listed explicitly (no
// ranges) so digits and letters are preserved and no formatter rewrites it.
const UNSAFE_SEGMENT_CHARS = /[<>:"/\\|?*\t\n\r]/g;

/** Replace unsafe chars with spaces, collapse runs, trim, drop trailing dots. */
export function sanitizeSegment(input: string, fallback: string): string {
  const cleaned = input
    .replace(UNSAFE_SEGMENT_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "");
  return cleaned.length > 0 ? cleaned.slice(0, 80) : fallback;
}

/** Lowercase file extension from a storage path (default `jpg`, no leading dot). */
export function extensionFromPath(storagePath: string): string {
  const base = storagePath.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "jpg";
  const ext = base.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
}

export type PhotoEntryInput = {
  treeName: string | null;
  storagePath: string;
  takenAt: string | null;
  id: string;
};

/**
 * A unique, safe zip entry path for a photo. `used` accumulates chosen names so
 * repeated (tree, date, id-prefix) collisions get a numeric suffix.
 */
export function photoEntryName(input: PhotoEntryInput, used: Set<string>): string {
  const folder = sanitizeSegment(input.treeName ?? "", "Unfiled");
  const ext = extensionFromPath(input.storagePath);
  const date = (input.takenAt ?? "").slice(0, 10) || "undated";
  const shortId = input.id.replace(/-/g, "").slice(0, 8) || "photo";

  const base = `${folder}/${date}-${shortId}`;
  let candidate = `${base}.${ext}`;
  let n = 1;
  while (used.has(candidate)) {
    candidate = `${base}-${n}.${ext}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}
