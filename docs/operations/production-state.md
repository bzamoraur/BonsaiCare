# Production State

> **Status:** Living · **Updated:** 2026-09-07
>
> The one-page answer to "what is actually live and armed in production?" —
> the question no other doc could answer at the 2026-07-06 audit. The owner (or
> the agent, on the owner's word) updates this whenever a setup action runs.
> Names and dates only — **never secret values**.

## Hosted database (Supabase `Bonsai_App`, eu-west-3)

| Fact | Value | Verified |
|---|---|---|
| Migration high-water mark | `20260713100000_onboarding_tour_flag` (all 13 repo migrations pushed) | 2026-09-06/07 (owner's read-only production SQL check: latest recorded migration `20260713100000` / `onboarding_tour_flag`; `profiles.onboarding_seen_at` column exists) |
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
| `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` | keep-warm (**3×/day since 2026-09**, was every 3 days) | ✅ Re-verified 2026-09-06: manual run #29 → `HTTP 200 — database queried`. ⚠ Every scheduled ping from 2026-08-10 to 2026-09-04 failed (`HTTP 000`, project unreachable — likely a Free-tier pause; see runbook §Keep-warm). |
| `SUPABASE_DB_URL` | weekly DB backup (**90-day artifacts since 2026-09**, was 35) | ✅ Re-verified 2026-09-06: manual dispatch SUCCESS → artifact `db-backup-34061709481`. ⚠ Scheduled runs failed 2026-08-09 → 2026-09-06 (pooler "tenant not found"); all earlier artifacts expired — this artifact is the oldest surviving backup. |
| `BACKUP_ENCRYPTION_KEY` | weekly DB backup ENCRYPTION (AES-256) | ✅ **Passphrase verified 2026-09-06/07**: the owner decrypted `db-backup-34061709481` locally (`… \| tar -tz` listed both `.sql` files). A full restore drill of an *encrypted* artifact is still pending (the 2026-07-08 drill was plaintext). |
| `SUPABASE_SERVICE_ROLE_KEY` | orphan sweep (**scheduled = report-only since 2026-09**) + photo mirror + B2 purge | ✅ Re-verified 2026-09-06: sweep dry-run #4 → `Scanned 3 object(s); 2 known; 0 orphans`; mirror run #4 → `Source: 3 · mirror: 3 · to upload: 0`. B2 purge not re-run (queue empty; its delete path stays deliberately unexercised). (Supabase key label is `github_orphan_sweep` — underscores; hyphens not allowed) |
| `B2_KEY_ID` / `B2_APP_KEY` / `B2_BUCKET` (+ `B2_ENDPOINT`, unused by the native-API script) | photo mirror + B2 purge (delete-path) | Set 2026-07-06 — reused as-is by `b2-purge.yml` (Read & Write key already grants `deleteFiles`; no new secret) |

## Owner decisions in force (2026-07-06)

Improvement plan **Accepted** as written · registration = **allowlist** (M7) ·
repo → **public** ✅ done · photo backup → **Backblaze B2** ✅ account/bucket/key
created · care dates = plain `date`
([ADR-0012](../decisions/0012-care-dates-are-calendar-dates.md), migrates in
S08.3).

## Supabase Auth config (owner-set)

`{{ .Token }}` added to **both** the Confirm-signup and Magic-Link email
templates — enables the 6-digit **OTP code** fallback for the iPhone
in-app-browser PKCE failure (the magic link opens in a different browser, so the
PKCE verifier cookie is absent). Auth **OTP expiry shortened**. Additive to
[ADR-0010](../decisions/0010-auth-magic-link-first.md) (magic-link-first), not a
replacement. Verified 2026-07-11 (owner, #137).

## Drills & manual cadences

| Item | Last done | Cadence |
|---|---|---|
| Restore drill (backup → scratch project) | **2026-07-08 ✅** — `db-backup-28816036702` restored into a throwaway project via the SQL Editor, ~20 min, no errors; complete round-trip incl. `auth.users`/identity/session + all 15 species (runbook §Backups corrected from the drill) | after any schema overhaul |
| In-app photo-archive export | superseded as a backup by the automated B2 mirror; still the on-demand user copy | on demand |
