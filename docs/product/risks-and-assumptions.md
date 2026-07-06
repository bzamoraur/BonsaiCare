# Risks, Assumptions & Open Questions

> **Status:** Living · **Updated:** 2026-07-05
>
> Reviewed at each phase boundary. Severity = Impact × Likelihood. "Owner" =
> the project owner / sole developer initially.

## Risk register

| ID | Risk | Sev | Mitigation | Status |
|---|---|---|---|---|
| R1 | **Supabase free project pauses after ~7 days idle**, breaking a "production" personal app. | High | Keep-warm GitHub Action shipped (Sprint 07) and hardened (S08.8): pings a real table read, **fails loud** on missing secrets or a bad response, and auto-files an ops-alert issue. Secrets armed 2026-07-06 ([production-state](../operations/production-state.md)). Residual: GitHub disables crons after ~60 days of repo inactivity (runbook note). Neon is a fallback backend. | Mitigated. |
| R2 | **iOS PWA push notifications are limited/unreliable** (require Add-to-Home-Screen; historically weak). | Med | Pull-based dashboard is the reliable core ([ADR-0007](../decisions/0007-notifications-strategy.md)); push is best-effort; optional email digest as a robust alternative. | Mitigated by design. |
| R3 | **Scope creep** into deferred "future" features delays a usable MVP. | High | [mvp-scope.md](./mvp-scope.md) is the gate; roadmap is phased; ADRs record deferrals. | Controlled. |
| R4 | **Photo storage exhausts the 1 GB free tier** (photos are the heaviest data). | Low–Med | Client-side compression/resize before upload. **Concrete budget:** ~50 trees × ~30 photos ≈ 1,500 photos × ~300 KB ≈ **~450 MB** — well within 1 GB; compression enforced from day one. Upgrade trigger in [cost-model](../operations/cost-model.md). | Mitigated — set target max dimension/quality during build. |
| R5 | **Vercel Hobby is non-commercial use only.** If this goes commercial, the free plan is a licensing violation. | Med | Fine for personal/trusted use now; documented trigger to move to Vercel Pro or Cloudflare Pages before any commercial use. | Documented. |
| R6 | **Supabase MCP prompt-injection** could exfiltrate private data if an AI agent has write/prod access. | High (if misused) | Dev project only, read-only mode, single-project scope; never production write. ([data-and-privacy](../architecture/data-and-privacy.md)) | Policy set. |
| R7 | **Recurrence/season logic bugs** (the exact Southern-hemisphere failure Bonsai Empire shipped). | Med | Explicit `hemisphere` field; pure, unit-tested season/recurrence functions; test the season-window skip case. | Planned in testing strategy. |
| R8 | **Solo-developer bus factor / momentum loss.** | Med | Thorough docs, ADRs, CI, and a backlog so work can pause/resume (or transfer) cleanly. | Ongoing. |
| R9 | **Data loss / no backups** on a free tier. | High | Owner-confirmed 2026-07-06: the free tier has **no managed backups**. Weekly automated DB dump shipped (`backup.yml`, 90-day artifacts; arm via the Session-pooler `SUPABASE_DB_URL`). Remaining gaps, scheduled in the [improvement plan](../roadmap/improvement-plan.md): a restore drill (S08.11 — a backup is a hope until restored once) and **photo bytes** (DB dumps exclude the bucket; monthly manual photo-archive export until the M9.3 bucket mirror). In-app export stays the on-demand copy. | Mitigated — drill + photo backup pending. |
| R10 | **Over-engineering the domain** (premature normalization of pots/species/wiring). | Med | MVP keeps current-state-on-tree + event log; normalize only when a concept earns it. | Controlled by scope. |

## Resolved decisions (owner-confirmed 2026-06-26)

The Phase-0 open questions are now answered:

1. **Hosting → Vercel now.** Hosting is the most reversible part of the stack;
   we optimize it for present-day build/preview velocity and keep the app
   portable. Flip to Cloudflare only if/when commercial becomes real
   ([ADR-0003](../decisions/0003-hosting-vercel.md), reaffirmed).
2. **Auth → email magic-link only** for the MVP; Google OAuth deferred to Phase 2
   ([ADR-0010](../decisions/0010-auth-magic-link-first.md)).
3. **Collection size → ~40–50 trees.** Comfortably within free-tier storage with
   compression (see R4 and [cost-model](../operations/cost-model.md)); small
   enough that pagination/performance is a non-issue for the MVP.
4. **Trusted users → 1 now, ~3 when testing with friends.** Build single-user
   clean and correct; keep the multi-user separation (RLS) honest, but don't
   over-invest in invites/admin polish for the MVP.
5. **Offline → "installable + fast" is enough for v1.** The PWA is installable and
   offline-*tolerant* (cached app shell, graceful when briefly offline), but
   **full offline-first capture + sync is OUT of MVP** — a deliberate, large
   complexity saving ([mvp-scope](./mvp-scope.md)).

## Assumptions ledger

The product-level assumptions (A1–A5) live in the
[product brief](./product-brief.md#key-assumptions-challenge-ready). Technical
assumptions are captured inline in the relevant ADRs. When an assumption is
tested (proven or disproven), note it here with the date.

## Open questions

None currently — the Phase-0 questions were resolved 2026-06-26 (see "Resolved
decisions" above); new ones land here.
