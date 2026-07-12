# Operations Runbook

> **Status:** Current · **Updated:** 2026-07-12
>
> How to keep the app healthy and recover from problems. Grows as we hit (and
> document) real situations. What's actually armed/live right now:
> [production-state.md](./production-state.md).

## Environments
- **Local:** `pnpm dev` + local or hosted Supabase.
- **Preview:** automatic Vercel deploy per PR (own URL).
- **Production:** Vercel deploy from `main`; hosted Supabase (EU, eu-west-3).

## Routine
- **Deploys:** merge to `main` → auto production deploy. Watch the Vercel build;
  smoke-test sign-in + a read/write after a notable release. The repo is
  **public** with **branch protection** (2026-07-06): merges to `main` require
  the three CI checks green — a red build cannot reach production by accident.
- **Photo bytes:** covered by the automated **B2 mirror** (below). The in-app
  photo-archive export remains the on-demand user-side copy.
- **Usage check:** glance at Supabase **storage** usage at each phase boundary
  ([cost-model](./cost-model.md), R4).

## Keep-warm (free-tier pause — R1)
Free Supabase projects pause after ~7 days idle. A scheduled GitHub Action pings
the project so a personal "production" app stays responsive.

- Workflow: `.github/workflows/keep-warm.yml` (cron, every 3 days).
- Needs GitHub **Action secrets** with exactly these names: `SUPABASE_URL`
  (`https://<ref>.supabase.co`, no trailing slash) and
  `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`).
- It queries a real table endpoint (`/rest/v1/species?select=id&limit=1`) —
  **not** the bare `/rest/v1/` root, which requires a *secret* key under the
  2026 API key system and 401s publishable keys.
- **Verify: green now means pinged** (fails loud since S08.8: missing secrets
  or a non-2xx response turn the run red and auto-file an "Ops alert" issue).
  Success log line: `Supabase responded with HTTP 200 — database queried,
  project is active.`
- If the project still paused: open the Supabase dashboard once to resume, then
  confirm the cron is enabled and the secrets are set. GitHub also disables
  crons after ~60 days without repo activity — re-enable from the Actions tab
  during quiet periods.

## Backups & restore (R9 — free tier has NO managed backups)

**What runs:** `.github/workflows/backup.yml` — every Sunday 05:00 UTC, dumps
the hosted DB (schema + data) via `supabase db dump`, then **encrypts the
tarball** (AES-256-CBC via `openssl`, using the `BACKUP_ENCRYPTION_KEY` secret)
and uploads the resulting `db-backup-<run>` artifact (`backup.tar.gz.enc`) kept
**35 days**. The repo is PUBLIC and the dump contains `auth.users` (emails,
password hashes, session tokens), so the step **fails loud and uploads nothing**
if `BACKUP_ENCRYPTION_KEY` is missing — it never uploads plaintext (addressed
the beta-readiness CRITICAL, #116, 2026-07-11). **Fails loud** (since S08.8): a
missing or malformed secret, a wrong connection type (direct/transaction
pooler), a failed dump, or a trivially-empty dump all turn the run red and
auto-file an "Ops alert" issue. A malformed-URL failure almost always means the
DB password contains special characters or leftover `[brackets]` — reset the
password until clean and rebuild the URI.

**Arming it:** repo secret `SUPABASE_DB_URL` = the **Session-pooler URI** from
the dashboard's **Connect** button (top bar) →
`postgresql://postgres.<ref>:<password>@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`.
⚠ **Not** the "Direct connection" (`db.<ref>.supabase.co` — IPv6-only on the
free tier; GitHub-hosted runners have no IPv6, so it can never connect) and
**not** the Transaction pooler (port 6543 — incompatible with pg_dump). The DB
password can be reset at Project Settings → Database without affecting the app
(the app authenticates with API keys).

**What it does NOT cover:** photo *bytes* in the `tree-photos` bucket (the dump
holds only the photo row/metadata — bytes are the B2 mirror's job, below) and
the `auth` new-user trigger `on_auth_user_created` (a Supabase-managed object
that `supabase db dump` excludes). The S08.11 drill confirmed `auth.users` +
identities + sessions **do** restore (the login identity survives); but with the
trigger absent from the dump, a *promoted* restore must recreate it from
migrations or new signups won't get a `profiles` row.

**Restore procedure — TESTED 2026-07-08 (S08.11 drill: `db-backup-28816036702`
restored into a throwaway project, ~20 min, zero errors, complete round-trip):**
The dump is small and `INSERT`-based, so it restores through the dashboard **SQL
Editor** with no local tooling — the drill used that path.
1. Create a fresh Supabase project (the drill used a throwaway
   `bonsai-restore-drill`; delete it afterwards — it holds a real copy of
   `auth.users`).
2. Download the latest `db-backup-…` artifact (Actions → Weekly database backup →
   newest run → Artifacts) and unzip it → `backup.tar.gz.enc`. **Decrypt +
   unpack** with the backup passphrase (`BACKUP_ENCRYPTION_KEY`):
   `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in backup.tar.gz.enc -pass env:BACKUP_ENCRYPTION_KEY | tar -xz`
   → `backup-schema.sql` + `backup-data.sql`. (Artifacts auto-delete after 35
   days. ⚠ The 2026-07-08 drill restored a pre-encryption plaintext dump, so
   this decrypt step is not yet drill-tested — and a lost passphrase makes every
   encrypted backup unrecoverable.)
3. In the **new project's** SQL Editor, run `backup-schema.sql` (builds tables,
   RLS, functions, FKs → "Success, no rows"; a few "already exists" NOTICEs are
   normal), then run **the whole** `backup-data.sql`. Its first line
   (`SET session_replication_role = replica;`) suppresses FK + trigger enforcement
   for the load — that's what lets the circular `trees.cover_photo_id` ↔
   `photos.tree_id` references (a non-deferrable FK pair) and any trigger load
   cleanly, so exact ordering isn't required. ⚠ Run it as **one script** — if you
   paste only the `INSERT` block, that `SET` is lost and the tree insert fails a
   foreign-key check. **Do NOT also run migrations** — the dump is the single
   source of schema truth.
   *Real-recovery / large-DB equivalent:* `psql "<new project SESSION-POOLER
   URI>" -f backup-schema.sql` then `-f backup-data.sql` — Session pooler only
   (Connect button), not the direct connection (IPv6-only) or the 6543
   transaction pooler.
4. Verify with a row-count check (`select count(*)` per table). The drill
   round-tripped 1 user + identity/session, 1 profile, 1 tree, 1 task, 1 care
   entry, 1 photo row, 15 species, 1 storage-object row.
   ⚠ In the dashboard, confirm the count runs against the **scratch** project,
   not production — the counts differ only where live data has moved since the
   dump, so a same-looking result can hide a wrong-project query.
5. Re-point env vars (Vercel + `.env.local`) at the new project; recreate the
   `on_auth_user_created` trigger from migrations; verify sign-in, a tree page,
   and a timeline.
6. Photos: re-upload the image bytes from the B2 mirror (below) — the DB restore
   only brought back the photo rows; `photos.storage_path` says where each goes.

## Photo mirror (Backblaze B2)

`.github/workflows/photo-backup.yml` (monthly, 15th 03:30 UTC + manual
dispatch) mirrors the private `tree-photos` bucket to the owner's B2 bucket —
photo BYTES previously had exactly one copy (the DB dump holds only rows).
Incremental by object path (+ size-drift re-copy); **never deletes on the B2
side**, so the mirror doubles as a recycle bin against accidental app-side
loss. Fails loud + ops-alert issue. Secrets: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` (shared with the sweep), `B2_KEY_ID`, `B2_APP_KEY`
(bucket-scoped, Read & Write), `B2_BUCKET`. Restore: download from the B2
bucket (paths mirror `photos.storage_path`) and re-upload to a fresh project's
bucket.

## Storage-orphan sweep

`.github/workflows/reconcile-storage.yml` (monthly, 1st 04:00 UTC) removes
photo objects with no `photos` row, older than a 24h grace window. Manual runs
default to **dry-run**; scheduled runs delete. Armed by repo secrets
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (the service-role key lives ONLY
here, never in the app). Safe to arm since S08.1: the DB read paginates past
PostgREST's 1,000-row cap (unit-tested — truncation once meant real photos
classified as orphans), and a deleting run **refuses pathological counts**
(orphans > max(20, 20% of the bucket), or a DB that claims zero photos) unless
`FORCE_SWEEP=true` is set after inspecting a dry run.

## Delete-path B2 purge (deleted accounts)

`.github/workflows/b2-purge.yml` (monthly, 15th 05:00 UTC + manual dispatch)
completes account deletion off-site. Deleting an account removes the user's DB
rows and Supabase Storage bytes, but the B2 mirror **never deletes**, so their
photos would linger there. `delete_my_account` enqueues the user's storage
prefix in `b2_purge_queue` (the app holds no B2 delete key by design);
`scripts/purge-b2.mjs` drains the queue, deleting **every file version** under
`<uid>/` from B2, then stamping `purged_at` — only after the prefix is fully
cleared, so a partial failure retries next run (delete is idempotent). Manual
runs default to **dry-run**; scheduled runs delete. Fails loud + ops-alert
issue. Reuses the mirror's secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET`) — no new secrets, since the mirror's
Read & Write key already grants `deleteFiles` (the script fails loud if it
doesn't). Verify: `select uid, requested_at, purged_at from public.b2_purge_queue
order by requested_at desc;` — a drained row has `purged_at` set.

## Owner metrics (private config — one-time seed)

Since S08.3 the `/admin` metrics RPC (`owner_metrics`) is gated **inside the
database**: it returns the aggregate counts only to the configured owner and
`NULL` to anyone else. The owner id lives in `private.app_config` — a schema
PostgREST never exposes. It must be seeded **once**, right after the S08.3
`supabase db push`, or `/admin` will show its "couldn't load metrics" fallback
forever. Copy your user id from Vercel → Project → Settings → Environment
Variables → `OWNER_USER_ID`, then in the Supabase dashboard → **SQL Editor**:

```sql
insert into private.app_config (owner_user_id)
values ('<your OWNER_USER_ID uuid>');
```

Singleton table (one row only). To change the owner later, `update
private.app_config set owner_user_id = '<new uuid>';`. If `/admin` shows the
fallback alert after seeding, confirm the seeded uuid equals `OWNER_USER_ID`.

## Error visibility (`app_errors` → /admin)

A durable, PII-poor error log — the interim record until a hosted tool like
Sentry is worth adding (#134/#135). `public.app_errors` has RLS **on with NO
policies** (direct API grants revoked), so it is reachable only through
`SECURITY DEFINER` functions:

- **Write path:** `record_client_error` (SECURITY DEFINER, self-stamps
  `owner_id` from `auth.uid()`, granted to `anon` so a crash on the signed-out
  `/login` screen still records). Client crashes are reported by `error.tsx` /
  `global-error.tsx` via `navigator.sendBeacon` → the **public** `/api/log-error`
  route (8 KB body cap, validates + length-bounds, best-effort `204`); server
  errors are persisted via Next `after()`.
- **Read path:** the owner reads them on **/admin → "Recent errors"** via
  `recent_app_errors`, gated inside the DB on the same `private.app_config` owner
  singleton as `owner_metrics` (must be seeded — see above; fails **CLOSED** to
  `NULL`, and every field is HTML-escaped on render).

## Incident playbook

| Situation | First checks | Action |
|---|---|---|
| **App down / 500s** | **/admin → Recent errors** (`app_errors`); Vercel deploy status + logs; Supabase status | Roll back: Vercel → Deployments → promote last good. Check env vars exist for Production. |
| **Auth broken** | Supabase Auth URL config; `NEXT_PUBLIC_SITE_URL`; redirect URLs | Ensure prod URL is in redirect list; redeploy after env fix. |
| **DB unreachable** | Supabase project state (paused?) | Resume project; verify keep-warm; check the password/keys weren't rotated. |
| **RLS leak suspected** | Run the isolation test; review recent policy migrations | Patch policy via a new migration; rotate keys if exposure suspected; audit. |
| **Secret leaked** | Where (git? client bundle?) | **Rotate** the key in Supabase (Settings → API → reset); update `.env*`, Vercel, GitHub secrets; redeploy. |
| **Storage near 1 GB** | Supabase storage usage | Confirm compression is on; prune/large-file audit; plan Pro upgrade ([cost-model](./cost-model.md)). |
| **Photo upload failing** | Bucket privacy + policy; client compression errors | Re-check `tree-photos` policy migration; check client compression lib. |

## Rotating secrets (procedure)
1. Supabase → Project Settings → **API** → reset the affected key.
2. Update everywhere it lives: `.env.local`, **Vercel** env vars, **GitHub**
   Action secrets ([setup/04](../setup/04-environment-variables.md)).
3. Redeploy (Vercel) so the new value takes effect.
4. Note the rotation (date + reason) in the
   [risk register](../product/risks-and-assumptions.md) if it was an incident.

## Restore from export (user-facing path)
The CSV/JSON export is the user-facing recovery path — distinct from the
operational SQL restore above. A full automated re-import isn't built for MVP;
if needed, re-import manually or via a script (import is a Phase-2 backlog
item). For schema, migrations rebuild the structure; data comes from the latest
export.
