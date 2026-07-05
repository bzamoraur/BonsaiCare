# Sprint 05 — "The daily loop" (Milestone M4, dashboard half)

> **Status:** Historical · **Updated:** 2026-07-06
>
> **Outcome: shipped (PRs #34–#36).** Closes M4. The **Today dashboard**
> (overdue / due today / next-7 + a struggling/critical triage strip, bucketed by
> the viewer's *local* today, one-tap Done/Skip), the **Calendar** (month grid
> with due-count dots + a day-grouped agenda, URL-driven month nav), and the
> one-tap **fertilization template** (multi-tree bulk-create of the canonical
> "every 14 days, Mar–Oct" schedule). All feature DoD met. **One DoD deferred:**
> the automated daily-loop **e2e** waits on the Playwright auth harness (backlog)
> — the same blocker as M3's e2e; the loop is meanwhile proven by the Sprint-04
> unit tests + the `complete_task` pgTAP suite. Phase 1's feature work is complete;
> next is M5 (trust, export & production hardening).

## Sprint goal

> Open the app and immediately see a trustworthy **overdue / due today /
> upcoming**, complete tasks with one tap, and see fertilization schedules work
> end-to-end.

## Definition of done (sprint = M4 exit)

- [x] The Today tab shows overdue / due today / upcoming (next 7 days) across
      the collection, plus a health triage strip (trees marked struggling /
      critical), with one-tap complete on every card.
- [x] Overdue is **derived at read time** from live task rows — never stored,
      no nightly job ([ADR-0006](../decisions/0006-task-scheduling-and-recurrence.md) /
      [ADR-0007](../decisions/0007-notifications-strategy.md)). Bucketed by the
      viewer's local today (client-side), not the server's UTC day.
- [x] Calendar tab: agenda list grouped by day, plus a month grid with
      due-count dots.
- [x] A one-tap **fertilization template** ("every 14 days, Mar–Oct, these
      trees") creates a real working schedule.
- [ ] E2e covers the daily loop: create recurring → complete from Today →
      next occurrence lands correctly (incl. an out-of-season skip case).
      **Deferred** — needs the Playwright auth harness (backlog); the loop is
      proven by unit tests + the `complete_task` pgTAP suite meanwhile.
- [x] M4 exit criteria in the [roadmap](./roadmap.md) all check out (bar the
      deferred e2e).

## Slices (one PR each, in order)

### 6. Today dashboard
- One indexed query bucketed in SQL by `due_on` vs the user's local today;
  sections render calm and empty-state-friendly (the UX bar: no guilt-tripping
  red walls — [ux/principles](../ux/principles.md)).
- Health triage: trees with `health_status ∈ {struggling, critical}` surface
  with their cover thumbnails.

### 7. Calendar views
- Agenda list first (grouped by day, infinite-ish scroll window), then the
  month grid. Both read the same task queries; no new data model.

### 8. Fertilization template + daily-loop e2e
- Template picker on task creation (the canonical bonsai case pre-filled);
  multi-tree selection creates one task per tree.
- Playwright e2e of the full loop; unit coverage already exists from Sprint 04.

## Demo at sprint end

Land on Today → overdue/today/upcoming + health at a glance → one-tap "done"
on a watering → it logs the event and schedules the next → Calendar shows the
month ahead → the "every 14 days Mar–Oct" template just works.

## Explicitly NOT in this sprint

Email digest / push (Phase 2 — the dashboard must prove itself pull-first
per [ADR-0007](../decisions/0007-notifications-strategy.md)). Export and
production hardening (M5, Sprints 06–07).

## Risks to watch

- **Trust is the exit bar**: a single wrong "overdue" poisons the dashboard's
  credibility. Every bucket boundary (local midnight, hemisphere season edges)
  is unit-tested from Sprint 04.
- Dashboard queries span the whole collection — keep them on the
  `(owner_id, status, due_on)` index; no N+1 per tree.
- This sprint ends Phase 1's feature work: resist pulling M5 or Phase-2 items
  forward (R3, scope creep).
