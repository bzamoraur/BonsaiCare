# Sprint 04 — "A schedule you can trust" (Milestone M4, foundation)

> **Status:** Current · **Updated:** 2026-07-05
>
> First sprint of M4. Correctness before UI: the recurrence/season math is the
> single highest technical risk in the MVP (R7 — the Southern-hemisphere bug
> class that burned Bonsai Empire), so it lands as pure, tested domain code
> before any screen exists.

## Sprint goal

> Tasks exist with **provably correct** recurrence/season math in both
> hemispheres, and completing a task atomically logs an optional care event and
> spawns the next occurrence.

## Definition of done (sprint)

- [ ] `tasks` table live via migration with owner-scoped RLS + a pgTAP isolation
      suite, and the deferred `care_log_entries.task_id → tasks(id)` FK added.
- [ ] `computeNextDueOn` / `isInSeasonWindow` in `src/domain/scheduling.ts` are
      pure and unit-tested — **tests written first**, explicitly covering:
      Northern + Southern hemispheres, season-window wrap across year-end
      (e.g. Nov–Feb), the out-of-season skip, and both anchors
      (`due` vs `completion`).
- [ ] The `recurrence` JSONB is Zod-validated
      ([ADR-0011](../decisions/0011-server-actions-and-validation.md)):
      `interval_days ≥ 1`, months in 1–12, `anchor ∈ {due, completion}`.
- [ ] Completion is **atomic**: mark done → optional care entry (linked via
      `task_id`) → next occurrence, in one Postgres function/RPC — a mid-flight
      crash can never leave a completed task without its successor or duplicate
      entries.
- [ ] One-off and recurring tasks can be created, edited, completed, and
      skipped from the UI.

## Slices (one PR each, in order)

### 1. `tasks` migration + RLS + pgTAP
- Per the [domain model](../architecture/domain-model.md): a dedicated
  `task_type` enum (`watering, fertilizing, pruning, repotting, wiring,
  inspection, photo, custom` — *not* `care_event_type`: tasks like "order
  akadama" (`custom`) or a wiring `inspection` aren't care events), plus
  `title`, `due_on date`, `status (pending|done|skipped)`, `recurrence jsonb`,
  `completed_at`, `notes`, nullable `tree_id` (null = collection-wide).
- Completion maps task type → care-event type where one exists (watering→
  watering, … , inspection→observation, photo/custom→note or none).
- Index `(owner_id, status, due_on)` for the dashboard's range scans.
- Add the `care_log_entries.task_id` FK. Archived-tree tasks auto-`skipped`
  (trigger or app-level — decide in the PR).

### 2. Recurrence/season pure domain *(tests first)*
- Extend `src/domain/scheduling.ts`; no React, no Supabase, no Date.now —
  callers inject "today" and hemisphere.

### 3. Tasks data-access + atomic completion RPC
- `src/server/tasks.ts` CRUD + `completeTask(taskId, {logEvent})` calling a
  `security invoker` Postgres function that performs all writes in one
  transaction under RLS.

### 4. Task create/edit UI
- One-off ↔ recurring toggle; recurrence editor in plain language ("every N
  days, from due date / from when I did it, only Mar–Oct"); season window
  optional.

### 5. Complete / skip flow
- One-tap done from a task card; "also log a care event?" toggle prefilled from
  the task type; recurring → the next occurrence appears immediately.

## Demo at sprint end

Create "fertilize every 14 days, Mar–Oct" → complete it → the next `due_on` is
correct; flip the profile to Southern hemisphere → the window inverts and the
domain tests prove the skip. Kill the request mid-completion → no orphaned or
duplicated rows.

## Explicitly NOT in this sprint

The Today dashboard and calendar views (Sprint 05). Notifications of any kind
(Phase 2, [ADR-0007](../decisions/0007-notifications-strategy.md)).

## Risks to watch

- **R7 is this sprint.** If the season math ships untested, the dashboard's
  trust — the product's core promise — is forfeit. Tests first, both
  hemispheres, wrap-around windows.
- Timezone honesty: overdue compares the user's local calendar day, not UTC
  midnight.
- The RPC is the first Postgres function since the signup trigger — keep it
  `security invoker` so RLS still applies.
