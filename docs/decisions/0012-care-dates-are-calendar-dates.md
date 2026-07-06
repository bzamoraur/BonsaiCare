# ADR-0012: Care events happen on calendar dates, not instants

- **Status:** Accepted
- **Date:** 2026-07-06
- **Deciders:** Owner + Claude

## Context

`care_log_entries.occurred_at` is a `timestamptz`, but the app never captures a
time of day: the log form collects `<input type="date">` and the value is
stored as midnight UTC, while an omitted value falls back to the column default
`now()` — a true instant. The 2026-07-06 milestone audit confirmed the
consequences of this mixed semantic:

- Same-day entries tie at `00:00:00Z` and render in **nondeterministic
  relative order** (no secondary sort anywhere on the read path).
- Rendering is only correct because `Intl.DateTimeFormat` happens to run in a
  UTC Server Component today; any future client-side rendering (or non-UTC
  runtime) would show dated entries **one day early** for UTC-negative viewers.
- The domain model doc described `occurred_at` as an editable *instant*, which
  no longer matches what the product captures.

Bonsai care is day-granular by nature ("watered on the 6th", "repotted in
March"); nothing in the product needs minutes.

## Decision

1. **`occurred_at` becomes a Postgres `date`** (rename to `occurred_on` to make
   the semantic explicit), migrated with `occurred_at::date`; the default
   becomes `current_date`.
2. **Same-day ordering is defined as `created_at desc` (newest logged first)**
   — an explicit tiebreaker on every timeline read, so order is deterministic
   and stable.
3. The complete-task RPC already passes a `date` (`p_completed_on`); its cast
   simply becomes a direct assignment.
4. If a time-of-day ever matters for a future event type, it gets its **own
   column** (or a details field) — we do not re-overload the date.

## Consequences

- Matches the UI exactly: what the user picks is what is stored — the timezone
  fragility class disappears rather than being patched.
- One migration + hand-regenerated types (no local Docker) + mechanical updates
  to `src/server/care.ts` / timeline merge / form parsing. Scheduled as part of
  the Sprint 08 **DB-hardening migration PR** (improvement plan S08.3) so the
  owner pushes once.
- Loses the (never-captured) ability to distinguish two waterings on the same
  day by time; the `created_at` tiebreaker preserves logging order, which is
  what the timeline actually shows today.
- `docs/architecture/domain-model.md` will be updated to the `date` semantic in
  the same PR (it currently documents the instant).
