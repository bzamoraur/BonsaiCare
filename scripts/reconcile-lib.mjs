// Helpers for the storage-orphan sweep, extracted so the data-loss-critical
// logic is unit-tested (scripts/reconcile-lib.test.mjs) — this script deletes
// user photos, the one asset that can't be rebuilt from a database dump.

export const DB_PAGE = 1000;

// Reads EVERY photos.storage_path via KEYSET pagination (order by id, then
// `id > last`), not OFFSET pages: offset pagination without a total order can
// skip rows that shift between the per-page transactions (concurrent
// deletes/inserts, scan-order variance), and PostgREST additionally caps any
// single response at the server's max-rows. A skipped row here would classify
// a real photo as an orphan and delete it (the 2026-07-06 audit's one critical
// finding). Keyset + terminate-only-on-empty-page is immune to both: a
// server-capped page just makes the walk take more requests.
export async function fetchKnownPaths(admin) {
  const known = new Set();
  let lastId = null;
  for (;;) {
    let query = admin
      .from("photos")
      .select("id, storage_path")
      .order("id", { ascending: true })
      .limit(DB_PAGE);
    if (lastId !== null) query = query.gt("id", lastId);
    const { data, error } = await query;
    if (error) {
      throw new Error(`read photos after id ${lastId ?? "(start)"}: ${error.message}`);
    }
    const page = data ?? [];
    if (page.length === 0) break;
    for (const row of page) known.add(row.storage_path);
    lastId = page[page.length - 1].id;
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
// data problem) rather than routine cleanup of a few stranded uploads: more
// than max(20, 20% of bucket) — hard-capped at 200 regardless of bucket size —
// or a DB that claims zero photos while storage has objects. Dry runs are
// never blocked; FORCE_SWEEP=true overrides after a human has inspected a
// dry-run listing.
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
  const ceiling = Math.min(200, Math.max(20, Math.ceil(objectCount * 0.2)));
  if (orphanCount > ceiling) {
    return {
      ok: false,
      reason:
        `Refusing to delete ${orphanCount} of ${objectCount} object(s) — more than ` +
        `max(20, 20% of the bucket, capped at 200). Routine strandings are a handful; ` +
        `this looks like a pathology. Inspect a dry run; override only with FORCE_SWEEP=true.`,
    };
  }
  return { ok: true };
}
