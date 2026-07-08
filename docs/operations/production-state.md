# Production State

> **Status:** Living · **Updated:** 2026-07-08
>
> The one-page answer to "what is actually live and armed in production?" —
> the question no other doc could answer at the 2026-07-06 audit. The owner (or
> the agent, on the owner's word) updates this whenever a setup action runs.
> Names and dates only — **never secret values**.

## Hosted database (Supabase `Bonsai_App`, eu-west-3)

| Fact | Value | Verified |
|---|---|---|
| Migration high-water mark | `20260706130000_owner_metrics` (all 8 repo migrations pushed) | 2026-07-06 (owner ran `db push`; /admin loads) |
| Account deletion live-tested | Yes — throwaway-account acceptance test | 2026-07-06 |
| `anon` EXECUTE on SECURITY DEFINER fns | ✅ Revoked in S08.3 (#72); advisors cleared | 2026-07-07 |

## GitHub repository

| Item | State | Verified |
|---|---|---|
| Visibility | **Public** (license stays proprietary; history forensically secret-free) | 2026-07-06 |
| Branch protection on `main` | Required checks: `build`, `Database (RLS) tests`, `E2E (auth flows)`; no force-push/deletion; linear history | 2026-07-06 (set via API) |
| Secret scanning + push protection | Enabled | 2026-07-06 |
| Dependabot | Alerts enabled + `dependabot.yml` (monthly, grouped) | 2026-07-06 |

## Vercel

| Item | State | Verified |
|---|---|---|
| `NEXT_PUBLIC_*` env vars (3) | Set (Production) | earlier setup |
| `OWNER_USER_ID` | Set → /admin live for the owner | 2026-07-06 |
| Function region colocated with eu-west-3 | Owner set it per runbook v4 task 8 | 2026-07-06 (owner) |

## GitHub Actions secrets — all automations ARMED

| Secret | Arms | State |
|---|---|---|
| `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` | keep-warm | ✅ Verified live 2026-07-06: run 28790896388 → `HTTP 200 — database queried` (the earlier 401 was the workflow's bug, fixed S08.8) |
| `SUPABASE_DB_URL` | weekly DB backup | ✅ Verified live 2026-07-06: run 28816036702 SUCCESS after the owner reset the DB password (first value had URL-breaking characters) |
| `SUPABASE_SERVICE_ROLE_KEY` | orphan sweep + photo mirror | ✅ Verified live 2026-07-06: dry-run 28816343325 → `Scanned 1 object(s); 1 known; 0 orphans` (Supabase key label is `github_orphan_sweep` — underscores; hyphens not allowed) |
| `B2_KEY_ID` / `B2_APP_KEY` / `B2_BUCKET` (+ `B2_ENDPOINT`, unused by the native-API script) | photo mirror | Set 2026-07-06 — first mirror run pending this PR's merge |

## Owner decisions in force (2026-07-06)

Improvement plan **Accepted** as written · registration = **allowlist** (M7) ·
repo → **public** ✅ done · photo backup → **Backblaze B2** ✅ account/bucket/key
created · care dates = plain `date`
([ADR-0012](../decisions/0012-care-dates-are-calendar-dates.md), migrates in
S08.3).

## Drills & manual cadences

| Item | Last done | Cadence |
|---|---|---|
| Restore drill (backup → scratch project) | **2026-07-08 ✅** — `db-backup-28816036702` restored into a throwaway project via the SQL Editor, ~20 min, no errors; complete round-trip incl. `auth.users`/identity/session + all 15 species (runbook §Backups corrected from the drill) | after any schema overhaul |
| In-app photo-archive export | superseded as a backup by the automated B2 mirror; still the on-demand user copy | on demand |
