# Operations Runbook

> **Status:** Current · **Updated:** 2026-07-06
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
  smoke-test sign-in + a read/write after a notable release. (Note: Vercel
  deploys `main` regardless of CI — branch protection is unavailable on a
  private GitHub Free repo; see the improvement-plan owner decision.)
- **Photo bytes:** the automated backup covers the **database only** — run the
  in-app **photo-archive export monthly** until the bucket mirror ships
  ([improvement plan](../roadmap/improvement-plan.md) M9.3).
- **Usage check:** glance at Supabase **storage** usage at each phase boundary
  ([cost-model](./cost-model.md), R4).

## Keep-warm (free-tier pause — R1)
Free Supabase projects pause after ~7 days idle. A scheduled GitHub Action pings
the project so a personal "production" app stays responsive.

- Workflow: `.github/workflows/keep-warm.yml` (cron, every 3 days).
- Needs GitHub **Action secrets** with exactly these names: `SUPABASE_URL`
  (`https://<ref>.supabase.co`, no trailing slash) and
  `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`).
- **Verify — a green run proves nothing by itself** (the workflow currently
  fails open; fail-loud is scheduled, improvement plan S08.8). Open the run's
  log and check for `Supabase REST responded with HTTP 200`; separately confirm
  the project shows "Active" in the Supabase dashboard.
- If the project still paused: open the Supabase dashboard once to resume, then
  confirm the cron is enabled and the secrets are set. GitHub also disables
  crons after ~60 days without repo activity — re-enable from the Actions tab
  during quiet periods.

## Backups & restore (R9 — free tier has NO managed backups)

**What runs:** `.github/workflows/backup.yml` — every Sunday 05:00 UTC, dumps
the hosted DB (schema + data) via `supabase db dump` and uploads
`db-backup-<run>` artifacts kept **90 days**. Fails red on a failed dump; a
no-op (with a notice) until its secret is set.

**Arming it:** repo secret `SUPABASE_DB_URL` = the **Session-pooler URI** from
the dashboard's **Connect** button (top bar) →
`postgresql://postgres.<ref>:<password>@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`.
⚠ **Not** the "Direct connection" (`db.<ref>.supabase.co` — IPv6-only on the
free tier; GitHub-hosted runners have no IPv6, so it can never connect) and
**not** the Transaction pooler (port 6543 — incompatible with pg_dump). The DB
password can be reset at Project Settings → Database without affecting the app
(the app authenticates with API keys).

**What it does NOT cover:** photo bytes in the `tree-photos` bucket (see
Routine above) and — pending the S08 restore drill — proof that `auth.users`
rows survive a restore.

**Restore procedure (untested until the S08 drill — update this section from
the drill transcript):**
1. Create a fresh Supabase project (or use the scratch one).
2. Download the latest `db-backup-…` artifact; unzip →
   `backup-schema.sql` + `backup-data.sql`.
3. Apply schema: `psql "<new project session-pooler URI>" -f backup-schema.sql`
   (alternatively `pnpm exec supabase db push` against the new project rebuilds
   schema from migrations — pick ONE source of schema truth, not both).
4. Load data: `psql "<uri>" -f backup-data.sql`.
5. Re-point env vars (Vercel + `.env.local`) at the new project; verify
   sign-in, a tree page, and a timeline.
6. Photos: re-upload from the latest photo-archive export (paths in
   `photos.storage_path` tell you where each file goes).

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

## Incident playbook

| Situation | First checks | Action |
|---|---|---|
| **App down / 500s** | Vercel deploy status + logs; Supabase status | Roll back: Vercel → Deployments → promote last good. Check env vars exist for Production. |
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
