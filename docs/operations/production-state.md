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
| `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` | keep-warm | Set 2026-07-06 · test run pending (runbook v3, task 3) |
| `SUPABASE_DB_URL` | weekly DB backup | **Not set** — use the **Session-pooler URI** (runbook v3, task 4) |
| `SUPABASE_SERVICE_ROLE_KEY` | orphan sweep | **Hold** until the S08.1 pagination fix merges, then set (task 5) |

## Drills & manual cadences

| Item | Last done | Cadence |
|---|---|---|
| Restore drill (backup → scratch project) | **Never** | once at S08, then after any schema overhaul |
| In-app photo-archive export (photo bytes have no automated backup until M9.3) | — | monthly, owner |
