// Photo-bucket mirror (Risk R9, second half): the weekly DB dump contains only
// rows — the photo BYTES in the tree-photos bucket had exactly one copy. This
// mirrors the bucket to a Backblaze B2 bucket (10 GB free, no card) so losing
// the Supabase project no longer means losing every progression photo.
//
// Incremental by object path: uploads only what B2 doesn't have (or whose size
// disagrees — a same-name object should never change). Never deletes anything
// on B2, so the mirror is also a recycle bin against accidental app-side loss.
//
// Uses B2's native API via fetch — zero new dependencies. Run by
// .github/workflows/photo-backup.yml; the B2 application key must be scoped to
// the one mirror bucket (Read and Write). B2_ENDPOINT (S3 form) is not needed
// by this script but stays useful for browsing the mirror with S3 tools.

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { planUploads, walkBucket } from "./reconcile-lib.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const B2_BUCKET = process.env.B2_BUCKET;

const BUCKET = "tree-photos";

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
  console.error(
    `::error::Missing secret(s): ${missing.join(", ")} — the photo mirror is NOT running.`,
  );
  process.exit(1);
}

async function b2(url, { token, body } = {}) {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: token },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${url.split("/").pop()}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

// --- Authorize + resolve the bucket id ---------------------------------------
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

// --- What does the mirror already hold? ---------------------------------------
const existing = new Map();
let startFileName;
for (;;) {
  const page = await b2(`${apiUrl}/b2api/v2/b2_list_file_names`, {
    token,
    body: { bucketId, maxFileCount: 10000, ...(startFileName ? { startFileName } : {}) },
  });
  for (const f of page.files ?? []) existing.set(f.fileName, f.contentLength);
  if (!page.nextFileName) break;
  startFileName = page.nextFileName;
}

// --- What does the source hold? ------------------------------------------------
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const source = await walkBucket(admin, BUCKET);
const toUpload = planUploads(source, existing);

console.log(
  `Source: ${source.length} object(s) · mirror: ${existing.size} · to upload: ${toUpload.length}.`,
);
if (toUpload.length === 0) {
  console.log("Mirror is up to date.");
  process.exit(0);
}

// --- Upload (sequential; monthly cadence, small collection) --------------------
// B2 file names go in a header, URL-encoded except "/" separators.
const encodeName = (name) => name.split("/").map(encodeURIComponent).join("/");

let upload = await b2(`${apiUrl}/b2api/v2/b2_get_upload_url`, { token, body: { bucketId } });

async function uploadOne(path, bytes, retry = true) {
  const res = await fetch(upload.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: upload.authorizationToken,
      "X-Bz-File-Name": encodeName(path),
      "Content-Type": "b2/x-auto",
      "Content-Length": String(bytes.length),
      "X-Bz-Content-Sha1": createHash("sha1").update(bytes).digest("hex"),
    },
    body: bytes,
  });
  if (!res.ok) {
    // Upload URLs expire / rotate on 401 and 5xx: fetch a fresh one and retry once.
    if (retry && (res.status === 401 || res.status >= 500)) {
      upload = await b2(`${apiUrl}/b2api/v2/b2_get_upload_url`, { token, body: { bucketId } });
      return uploadOne(path, bytes, false);
    }
    throw new Error(`upload ${path}: HTTP ${res.status} ${await res.text()}`);
  }
}

let uploaded = 0;
const failed = [];
for (const path of toUpload) {
  const { data: blob, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !blob) {
    // Deleted between listing and download (or transient) — report, don't abort.
    console.error(`::warning::download ${path}: ${error?.message ?? "empty blob"}`);
    failed.push(path);
    continue;
  }
  await uploadOne(path, new Uint8Array(await blob.arrayBuffer()));
  uploaded += 1;
}

console.log(`Uploaded ${uploaded} object(s); mirror now holds ${existing.size + uploaded}.`);
if (failed.length > 0) {
  console.error(`::error::${failed.length} object(s) could not be mirrored: ${failed.join(", ")}`);
  process.exit(1); // red run -> ops-alert issue; the next run retries them
}
