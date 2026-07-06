# Production State

> **Status:** Living · **Updated:** 2026-07-06
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
| Known grant gap | `anon` can EXECUTE the 3 SECURITY DEFINER fns (advisors) | fix scheduled — [improvement plan](../roadmap/improvement-plan.md) S08.3 |

## Vercel

| Item | State | Verified |
|---|---|---|
| `NEXT_PUBLIC_*` env vars (3) | Set (Production) | earlier setup |
| `OWNER_USER_ID` | Set → /admin live for the owner | 2026-07-06 |
| Function region colocated with eu-west-3 | **Not yet** — owner task | — |

## GitHub Actions secrets (dormant-until-secret automations)

| Secret | Arms | State |
|---|---|---|
| `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` | keep-warm | Set + verified correct 2026-07-06 (the owner's 401 was the workflow pinging the secret-key-only `/rest/v1/` root — fixed in S08.8; re-run the test after that merge) |
| `SUPABASE_DB_URL` | weekly DB backup | Set 2026-07-06 but **malformed** — the CLI can't parse the URI (password contains special characters or leftover `[brackets]`); owner to reset the DB password and re-save (runbook v4, task 4) |
| `SUPABASE_SERVICE_ROLE_KEY` | orphan sweep | **Hold lifted** once S08.1 merges — safe to set (runbook v4, task 5) |

## Owner decisions in force (2026-07-06)

Improvement plan **Accepted** as written · registration = **allowlist** (M7) ·
repo → **public** (pending the visibility flip + branch protection, runbook
v4) · photo backup → free object storage (account setup pending) · care dates
= plain `date` ([ADR-0012](../decisions/0012-care-dates-are-calendar-dates.md),
migrates in S08.3).

## Drills & manual cadences

| Item | Last done | Cadence |
|---|---|---|
| Restore drill (backup → scratch project) | **Never** | once at S08, then after any schema overhaul |
| In-app photo-archive export (photo bytes have no automated backup until M9.3) | — | monthly, owner |
