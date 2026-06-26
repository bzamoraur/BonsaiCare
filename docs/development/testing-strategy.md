# Testing Strategy

> Status: v1, 2026-06-26. Pragmatic, not dogmatic. Test where bugs are costly and
> logic is subtle — not for a coverage number. "Production-oriented, not
> demo-oriented" means the risky parts are actually verified.

## The testing pyramid for this app

```
        ▲  few   E2E (Playwright)  — critical user journeys F1–F7
        │        Integration       — data-access + RLS against a real test DB
        ▼  many  Unit (Vitest)     — pure domain logic + components
```

## 1. Unit tests (Vitest) — the priority

The highest-value tests, because the **domain logic is where correctness bites**
(the exact class of bug Bonsai Empire shipped). `src/domain/` is pure and
framework-free specifically so this is easy.

Must-cover domain logic:
- **Overdue calculation** — `pending && due_on < today`, timezone-correct.
- **Recurrence / next occurrence** — interval + `anchor` (completion vs due);
  **season-window skip** (e.g. fertilize Mar–Oct must jump over winter); **both
  hemispheres** ([ADR-0006](../decisions/0006-task-scheduling-and-recurrence.md)).
- **Season derivation** from date + `profile.hemisphere` — the Southern-hemisphere
  case explicitly.
- **Zod schemas** for each care-event `type` — valid/invalid `details` payloads
  ([ADR-0005](../decisions/0005-unified-timeline-event-model.md)).
- **Export** serialization — round-trips the core data
  ([ADR-0008](../decisions/0008-data-ownership-and-export.md)).

Component tests (Testing Library) for tricky UI: quick-add form defaults, the
progressive-disclosure tree form, timeline rendering/sorting.

## 2. Integration tests — RLS is non-negotiable

Against a **local Supabase** test database:
- **RLS isolation test:** seed two users; assert user B **cannot** read/update/
  delete user A's trees/photos/events/tasks. This guards the core privacy
  promise ([data-and-privacy](../architecture/data-and-privacy.md)) and runs in
  CI. Write it **before** building features (Sprint 01 DoD).
- Data-access functions behave (insert→read→update→archive) under RLS with a real
  session.

## 3. E2E tests (Playwright) — the critical journeys only

Keep this set small and stable; cover the flows whose breakage makes the app
unusable ([ux/information-architecture](../ux/information-architecture.md)):
- F1 sign in → empty dashboard.
- F2 add a tree (name + photo) → appears in collection.
- F3 quick-log a care event → shows on the tree timeline.
- F5 create a recurring task → appears on Today when due → complete → next
  occurrence scheduled.
- F7 export → file downloads with the data.

## What we do NOT test (deliberately)
- Third-party internals (Supabase, Next.js) — trust their tests.
- Pixel-perfect snapshots — brittle; we test behavior and a11y, not pixels.
- Exhaustive CRUD permutations — cover representative + edge cases, not every cell.

## CI gate
GitHub Actions runs **typecheck → lint → unit + integration tests → build** on
every PR; merges to `main` require green. E2E runs on PRs (and can be a nightly
job if runtime grows). A red CI blocks merge — no exceptions.

## Definitions
- **Flaky test:** quarantine + fix or delete; never ignore silently (log it in
  the backlog's tech-debt section).
- **Bug found in prod:** add a failing test that reproduces it *before* fixing
  (regression guard).
