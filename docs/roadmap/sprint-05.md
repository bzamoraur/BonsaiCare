# Sprint 05 — "The daily loop" (Milestone M4, dashboard half)

> **Status:** Current · **Updated:** 2026-07-05
>
> Second sprint of M4; closes the milestone. Sprint 04 made schedules correct;
> this sprint makes them **visible** — the dashboard that answers "what needs
> attention today?" the moment the app opens.

## Sprint goal

> Open the app and immediately see a trustworthy **overdue / due today /
> upcoming**, complete tasks with one tap, and see fertilization schedules work
> end-to-end.

## Definition of done (sprint = M4 exit)

- [ ] The Today tab shows overdue / due today / upcoming (next 7 days) across
      the collection, plus a health triage strip (trees marked struggling /
      critical), with one-tap complete on every card.
- [ ] Overdue is **derived at read time** from live task rows — never stored,
      no nightly job ([ADR-0006](../decisions/0006-task-scheduling-and-recurrence.md) /
      [ADR-0007](../decisions/0007-notifications-strategy.md)).
- [ ] Calendar tab: agenda list grouped by day, plus a month grid with
      due-count dots.
- [ ] A one-tap **fertilization template** ("every 14 days, Mar–Oct, these
      trees") creates a real working schedule.
- [ ] E2e covers the daily loop: create recurring → complete from Today →
      next occurrence lands correctly (incl. an out-of-season skip case).
- [ ] M4 exit criteria in the [roadmap](./roadmap.md) all check out.

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
