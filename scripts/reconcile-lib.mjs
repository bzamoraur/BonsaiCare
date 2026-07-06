// Helpers for the storage-orphan sweep, extracted so the data-loss-critical
// logic is unit-tested (scripts/reconcile-lib.test.mjs) — this script deletes
// user photos, the one asset that can't be rebuilt from a database dump.

export const DB_PAGE = 1000;

// Reads EVERY photos.storage_path via explicit .range() pagination. PostgREST
// silently caps a single response at max_rows (1,000 on this project) — an
// unpaginated read here would treat every row past the cap as an orphan and
// delete its object (the 2026-07-06 audit's one critical finding).
export async function fetchKnownPaths(admin) {
  const known = new Set();
  for (let from = 0; ; from += DB_PAGE) {
    const { data, error } = await admin
      .from("photos")
      .select("storage_path")
      .range(from, from + DB_PAGE - 1);
    if (error) {
      throw new Error(`read photos rows ${from}-${from + DB_PAGE - 1}: ${error.message}`);
    }
    const page = data ?? [];
    for (const row of page) known.add(row.storage_path);
    if (page.length < DB_PAGE) break;
  }
  return known;
}

// Orphan = no photos row AND created before the grace cutoff. A missing
// created_at is treated as too-risky-to-delete (kept), never swept.
export function collectOrphans(objects, known, cutoffMs) {
  return objects
    .filter((o) => !known.has(o.path) && o.createdAt && new Date(o.createdAt).getTime() < cutoffMs)
    .map((o) => o.path);
}

// Refuses a deleting sweep that looks like a pathology (DB read broke, mass
// data problem) rather than routine cleanup of a few stranded uploads. Dry
// runs are never blocked — they only print. FORCE_SWEEP=true overrides after
// a human has inspected a dry-run listing.
export function sweepGuard({ orphanCount, objectCount, knownCount, dryRun, force }) {
  if (dryRun || force || orphanCount === 0) return { ok: true };
  if (knownCount === 0) {
    return {
      ok: false,
      reason:
        `Refusing to delete: the database reports ZERO photos while storage holds ` +
        `${objectCount} object(s). That pattern means a broken DB read, not cleanup. ` +
        `Inspect a dry run; override only with FORCE_SWEEP=true.`,
    };
  }
  const ceiling = Math.max(20, Math.ceil(objectCount * 0.2));
  if (orphanCount > ceiling) {
    return {
      ok: false,
      reason:
        `Refusing to delete ${orphanCount} of ${objectCount} object(s) — more than ` +
        `max(20, 20% of the bucket). Routine strandings are a handful; this looks like ` +
        `a pathology. Inspect a dry run; override only with FORCE_SWEEP=true.`,
    };
  }
  return { ok: true };
}
