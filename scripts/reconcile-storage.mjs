// Storage-orphan reconciliation (Risk R7 / tech-debt): photo upload is
// storage-first, DB-second, with best-effort client cleanup — so a closed tab
// can strand an object with no `photos` row. This sweeps the `tree-photos`
// bucket for objects that have no matching photos row AND are older than a grace
// window (so in-flight uploads are never touched), and removes them.
//
// Run by .github/workflows/reconcile-storage.yml with a service-role key (which
// lives only in GitHub Actions secrets, never in the app runtime). Set
// DRY_RUN=true to list without deleting. A deleting run refuses pathological
// orphan counts (see sweepGuard) unless FORCE_SWEEP=true.

import { createClient } from "@supabase/supabase-js";
import { collectOrphans, fetchKnownPaths, sweepGuard, walkBucket } from "./reconcile-lib.mjs";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === "true";
const FORCE = process.env.FORCE_SWEEP === "true";

const BUCKET = "tree-photos";
const GRACE_HOURS = 24;
const PAGE = 100;

if (!url || !serviceKey) {
  console.log("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping reconciliation.");
  process.exit(0);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// Walk the fixed <uid>/<treeId>/<file> layout (shared with the photo mirror).
const objects = await walkBucket(admin, BUCKET, PAGE);

// Every path the database knows about (service role → all users, past RLS),
// read with explicit pagination — PostgREST caps single responses at 1,000
// rows, and truncation here would turn real photos into "orphans".
const known = await fetchKnownPaths(admin);

const cutoff = Date.now() - GRACE_HOURS * 60 * 60 * 1000;
const orphans = collectOrphans(objects, known, cutoff);

console.log(
  `Scanned ${objects.length} object(s); ${known.size} known to the DB; ` +
    `${orphans.length} orphan(s) older than ${GRACE_HOURS}h.`,
);

if (orphans.length === 0) process.exit(0);

if (DRY_RUN) {
  console.log("DRY_RUN — would remove:");
  for (const p of orphans.slice(0, 100)) console.log(`  ${p}`);
  if (orphans.length > 100) console.log(`  …and ${orphans.length - 100} more`);
  process.exit(0);
}

const guard = sweepGuard({
  orphanCount: orphans.length,
  objectCount: objects.length,
  knownCount: known.size,
  dryRun: DRY_RUN,
  force: FORCE,
});
if (!guard.ok) {
  console.error(guard.reason);
  process.exit(1);
}

for (let i = 0; i < orphans.length; i += PAGE) {
  const chunk = orphans.slice(i, i + PAGE);
  const { error } = await admin.storage.from(BUCKET).remove(chunk);
  if (error) throw new Error(`remove: ${error.message}`);
}
console.log(`Removed ${orphans.length} orphaned object(s).`);
