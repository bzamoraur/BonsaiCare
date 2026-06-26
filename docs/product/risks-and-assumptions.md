# Risks, Assumptions & Open Questions

> Status: living document. Reviewed at each phase boundary. Severity = Impact ×
> Likelihood. "Owner" = the project owner / sole developer initially.

## Risk register

| ID | Risk | Sev | Mitigation | Status |
|---|---|---|---|---|
| R1 | **Supabase free project pauses after ~7 days idle**, breaking a "production" personal app. | High | Free scheduled GitHub Action pings the DB every few days to keep it warm; documented in [operations](../operations/runbook.md). Accept ~seconds cold-start otherwise. Neon is a fallback backend. | Open — verify pause behavior on current free tier during setup. |
| R2 | **iOS PWA push notifications are limited/unreliable** (require Add-to-Home-Screen; historically weak). | Med | Pull-based dashboard is the reliable core ([ADR-0007](../decisions/0007-notifications-strategy.md)); push is best-effort; optional email digest as a robust alternative. | Mitigated by design. |
| R3 | **Scope creep** into deferred "future" features delays a usable MVP. | High | [mvp-scope.md](./mvp-scope.md) is the gate; roadmap is phased; ADRs record deferrals. | Controlled. |
| R4 | **Photo storage exhausts the 1 GB free tier** (photos are the heaviest data). | Med | Client-side compression/resize before upload; document the storage budget and the upgrade trigger in [cost-model](../operations/cost-model.md). | Open — set a target max dimension/quality during build. |
| R5 | **Vercel Hobby is non-commercial use only.** If this goes commercial, the free plan is a licensing violation. | Med | Fine for personal/trusted use now; documented trigger to move to Vercel Pro or Cloudflare Pages before any commercial use. | Documented. |
| R6 | **Supabase MCP prompt-injection** could exfiltrate private data if an AI agent has write/prod access. | High (if misused) | Dev project only, read-only mode, single-project scope; never production write. ([data-and-privacy](../architecture/data-and-privacy.md)) | Policy set. |
| R7 | **Recurrence/season logic bugs** (the exact Southern-hemisphere failure Bonsai Empire shipped). | Med | Explicit `hemisphere` field; pure, unit-tested season/recurrence functions; test the season-window skip case. | Planned in testing strategy. |
| R8 | **Solo-developer bus factor / momentum loss.** | Med | Thorough docs, ADRs, CI, and a backlog so work can pause/resume (or transfer) cleanly. | Ongoing. |
| R9 | **Data loss / no backups** on a free tier. | High | Documented periodic export (the user-facing export doubles as a backup); understand Supabase's free backup limits. | Open — confirm during setup. |
| R10 | **Over-engineering the domain** (premature normalization of pots/species/wiring). | Med | MVP keeps current-state-on-tree + event log; normalize only when a concept earns it. | Controlled by scope. |

## Open questions for the owner

These don't block Phase 0, but the owner's answers will sharpen Phase 1. They are
surfaced in the PR for discussion.

1. **Hosting commerciality:** is a future commercial product likely enough that
   we should start on Cloudflare Pages (commercial-OK free tier) instead of
   Vercel Hobby now? Default: **Vercel now**, document the migration trigger.
2. **Auth method:** email magic-link (simplest, no passwords) vs. also Google
   OAuth? Default: **magic-link first**, OAuth optional later.
3. **Collection size:** roughly how many trees now / in a year? (Sanity-checks
   the free-tier storage budget and any pagination needs.)
4. **Trusted users:** how many, and how soon? (Affects whether we prioritize the
   multi-user polish or keep it single-user-clean for the first cut.)
5. **Offline depth:** is true offline capture (log in the garden with no signal,
   sync later) a must for v1, or is "installable + fast" enough? (Full offline
   sync is a meaningful complexity step.)

## Assumptions ledger

The product-level assumptions (A1–A5) live in the
[product brief](./product-brief.md#key-assumptions-challenge-ready). Technical
assumptions are captured inline in the relevant ADRs. When an assumption is
tested (proven or disproven), note it here with the date.
