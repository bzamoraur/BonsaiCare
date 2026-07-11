// Delete-path B2 purge (ADR-0008 completeness). Deleting an account removes the
// user's DB rows + Supabase Storage bytes, but the off-site Backblaze B2 mirror
// (photo-backup.yml — deliberately never deletes) still holds their photos. The
// app runtime holds NO B2 delete key by design, so `delete_my_account` instead
// ENQUEUES the user's storage prefix in `b2_purge_queue`; this drains that queue.
//
// For each queued uid it deletes EVERY file version under `<uid>/` from the B2
// bucket (B2 keeps versions; a full delete must remove each one), then stamps
// `purged_at` — only after the prefix is fully gone, so a partial failure simply
// retries next run (delete is idempotent). Run by .github/workflows/b2-purge.yml
// with the service-role key + the mirror's B2 key (Read & Write ⇒ deleteFiles).
// DRY_RUN=true lists what it would delete without touching B2 or the queue.
// Uses B2's native API via fetch — zero new dependencies.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const B2_BUCKET = process.env.B2_BUCKET;
const DRY_RUN = process.env.DRY_RUN === "true";

const missing = Object.entries({
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  B2_KEY_ID,
  B2_APP_KEY,
  B2_BUCKET,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length > 0) {
  console.error(`::error::Missing secret(s): ${missing.join(", ")} — the B2 purge is NOT running.`);
  process.exit(1);
}

// A queued prefix must be exactly a uuid — a delete script never trusts its input
// to become a broad prefix (e.g. an empty string → the whole bucket).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function b2(url, { token, body } = {}) {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: token, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${url.split("/").pop()}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

// --- The queue: prefixes still to purge (service role → past RLS) -------------
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const { data: queued, error: queueError } = await admin
  .from("b2_purge_queue")
  .select("uid, requested_at")
  .is("purged_at", null)
  .order("requested_at", { ascending: true });
if (queueError) {
  console.error(`::error::Reading b2_purge_queue failed: ${queueError.message}`);
  process.exit(1);
}
if (!queued || queued.length === 0) {
  console.log("Purge queue is empty — nothing to do.");
  process.exit(0);
}
console.log(
  `${queued.length} account prefix(es) queued for B2 purge${DRY_RUN ? " (DRY_RUN)" : ""}.`,
);

// --- Authorize B2 + resolve the bucket id -------------------------------------
const basic = `Basic ${Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString("base64")}`;
const auth = await b2("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
  token: basic,
});
const { apiUrl, authorizationToken: token, accountId, allowed } = auth;

let bucketId;
if (allowed?.bucketName === B2_BUCKET && allowed?.bucketId) {
  bucketId = allowed.bucketId; // bucket-scoped key (the recommended setup)
} else {
  const { buckets } = await b2(`${apiUrl}/b2api/v2/b2_list_buckets`, {
    token,
    body: { accountId, bucketName: B2_BUCKET },
  });
  bucketId = buckets?.[0]?.bucketId;
}
if (!bucketId) {
  console.error(`::error::B2 bucket "${B2_BUCKET}" not found or the key can't access it.`);
  process.exit(1);
}

// Fail loud early if the key can't delete, rather than half-purging. B2 returns
// the key's granted capabilities in `allowed.capabilities` (present for both
// bucket-scoped and master keys); guard defensively — only reject when the list
// is present AND lacks the cap, so an unexpected shape never blocks a valid key.
if (Array.isArray(allowed?.capabilities) && !allowed.capabilities.includes("deleteFiles")) {
  console.error(
    "::error::The B2 key lacks the deleteFiles capability — recreate it as Read & Write. No deletion attempted.",
  );
  process.exit(1);
}

// --- List every file version under a prefix (paginated) -----------------------
async function listVersionsUnder(prefix) {
  const versions = [];
  let startFileName;
  let startFileId;
  for (;;) {
    const page = await b2(`${apiUrl}/b2api/v2/b2_list_file_versions`, {
      token,
      body: {
        bucketId,
        prefix,
        maxFileCount: 10000,
        ...(startFileName ? { startFileName } : {}),
        ...(startFileId ? { startFileId } : {}),
      },
    });
    for (const f of page.files ?? []) versions.push({ fileName: f.fileName, fileId: f.fileId });
    if (!page.nextFileName) break;
    startFileName = page.nextFileName;
    startFileId = page.nextFileId;
  }
  return versions;
}

// Delete one version, retrying ONCE on a transient B2 error (network drop, or
// 401 expired token / 408 / 429 / 5xx) — per B2's integration checklist and
// mirroring uploadOne in mirror-photos.mjs. Without this, a single transient
// blip leaves the whole account unstamped until the next monthly run. Delete is
// idempotent, so a retry is always safe.
async function deleteVersion(fileName, fileId) {
  const url = `${apiUrl}/b2api/v2/b2_delete_file_version`;
  try {
    await b2(url, { token, body: { fileName, fileId } });
  } catch (e) {
    const status = Number(String(e?.message).match(/HTTP (\d+)/)?.[1]);
    const retriable =
      !status || status === 401 || status === 408 || status === 429 || status >= 500;
    if (!retriable) throw e;
    await b2(url, { token, body: { fileName, fileId } });
  }
}

// --- Drain --------------------------------------------------------------------
let purgedAccounts = 0;
let deletedVersions = 0;
const failures = [];

for (const { uid } of queued) {
  if (!UUID.test(uid)) {
    console.error(`::error::Refusing to purge a non-uuid prefix: ${JSON.stringify(uid)}`);
    failures.push(uid);
    continue;
  }
  const prefix = `${uid}/`;

  let versions;
  try {
    versions = await listVersionsUnder(prefix);
  } catch (e) {
    console.error(`::warning::Listing ${prefix} failed: ${e.message ?? e}`);
    failures.push(uid);
    continue;
  }

  if (DRY_RUN) {
    console.log(`  ${prefix}: would delete ${versions.length} file version(s).`);
    for (const v of versions.slice(0, 20)) console.log(`      ${v.fileName}`);
    if (versions.length > 20) console.log(`      …and ${versions.length - 20} more`);
    continue;
  }

  let ok = true;
  for (const v of versions) {
    try {
      await deleteVersion(v.fileName, v.fileId);
      deletedVersions += 1;
    } catch (e) {
      console.error(`::warning::Deleting ${v.fileName} failed: ${e.message ?? e}`);
      ok = false;
    }
  }
  if (!ok) {
    failures.push(uid);
    continue;
  }

  // Stamp only after the prefix is fully cleared → a partial failure retries.
  const { error: stampError } = await admin
    .from("b2_purge_queue")
    .update({ purged_at: new Date().toISOString() })
    .eq("uid", uid);
  if (stampError) {
    console.error(`::warning::Stamping purged_at for ${uid} failed: ${stampError.message}`);
    failures.push(uid);
    continue;
  }
  purgedAccounts += 1;
  console.log(`Purged ${prefix}: ${versions.length} file version(s).`);
}

if (DRY_RUN) {
  if (failures.length > 0) {
    console.error(
      `::error::DRY_RUN could not enumerate ${failures.length} account(s): ${failures.join(", ")}.`,
    );
    process.exit(1);
  }
  console.log("DRY_RUN complete — nothing was deleted or stamped.");
  process.exit(0);
}

console.log(
  `Purged ${purgedAccounts}/${queued.length} account(s); deleted ${deletedVersions} file version(s).`,
);
if (failures.length > 0) {
  console.error(
    `::error::${failures.length} account(s) could not be fully purged: ${failures.join(", ")} — will retry next run.`,
  );
  process.exit(1); // red run → ops-alert issue
}
