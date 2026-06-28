# Operations Runbook

> Status: v1, 2026-06-26. How to keep the app healthy and recover from problems.
> Grows as we hit (and document) real situations.

## Environments
- **Local:** `pnpm dev` + local or hosted Supabase.
- **Preview:** automatic Vercel deploy per PR (own URL).
- **Production:** Vercel deploy from `main`; hosted Supabase (EU).

## Routine
- **Deploys:** merge to `main` → auto production deploy. Watch the Vercel build;
  smoke-test sign-in + a read/write after a notable release.
- **Backups:** run a **data export** periodically (it doubles as a backup,
  [ADR-0008](../decisions/0008-data-ownership-and-export.md)); store the file
  somewhere safe. Verify the free-tier DB backup situation during setup (R9).
- **Usage check:** glance at Supabase **storage** usage at each phase boundary
  ([cost-model](./cost-model.md), R4).

## <a id="keep-warm"></a>Keep-warm (free-tier pause — R1)
Free Supabase projects pause after ~7 days idle. A scheduled GitHub Action pings
the project so a personal "production" app stays responsive.

- Workflow: `.github/workflows/keep-warm.yml` (runs on a cron, e.g. every 3 days).
- It makes a tiny authenticated REST request to the Supabase project.
- Needs GitHub **Action secrets**: `SUPABASE_URL` (or reuse project ref) and
  `SUPABASE_PUBLISHABLE_KEY`.
- **Verify:** check the Action's run history is green; the project stays "Active".
- If the project still paused: open the Supabase dashboard once to resume, then
  confirm the cron is enabled and the secrets are set.

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

## Restore from export
The CSV/JSON export is the user-facing recovery path. A full automated restore
isn't built for MVP; if needed, re-import manually or via a script (import is a
Phase-2 backlog item). For schema, migrations rebuild the structure; data comes
from the latest export.
