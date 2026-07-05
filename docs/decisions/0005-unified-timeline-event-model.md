# ADR-0005: Model care history as one unified timeline event with typed core + validated JSONB

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Owner + Claude

## Context

A tree accumulates many *kinds* of events over years: watering, fertilizing,
pruning, wiring, repotting, pest treatment, styling, defoliation, observations,
notes. The user wants "an ordered history/timeline per tree" and "structured
information." Two failure modes to avoid, both seen in research:
- **Greg's failure:** logging exists but "there's nowhere to review your own
  history" — a fragmented model with no coherent timeline.
- **Over-normalization:** a separate table per event type → 10+ sparse tables,
  painful joins, hard to render a unified timeline, premature complexity.

## Options considered

1. **One table per event type** (waterings, fertilizations, repottings…). Pro:
   fully typed columns. Con: table sprawl, complex timeline assembly, lots of
   migrations, over-engineered for MVP.
2. **One `care_log_entries` table, pure JSONB payload.** Pro: simple, flexible.
   Con: weak integrity, hard to query, easy to corrupt — violates our data-
   integrity principle.
3. **One `care_log_entries` table with typed core columns + a validated JSONB
   `details` per type.** Hybrid.

## Decision

Choose **option 3**: a single `care_log_entries` table with a `type`
discriminator and **typed core columns** (`tree_id`, `occurred_at`, `title`,
`notes`, `task_id`) plus a **`details` JSONB** holding type-specific structured
fields, **validated by a Zod schema per type** at the application layer. The same
unified table also powers the timeline (merged with photos by date).

Rationale: the common, queryable, integrity-critical fields are real columns; the
variable, type-specific bits (fertilizer NPK, repot soil mix, wire branch/date)
live in validated JSON. This gives a coherent, easily-rendered timeline and
strong-enough integrity **without** table sprawl — the pragmatic middle that fits
an MVP yet scales.

## Consequences

- **Positive:** trivial unified timeline (one query, sort by `occurred_at`);
  adding a new event type is additive (new enum value + new Zod schema, no
  migration churn); core fields stay query/index-friendly.
- **Negative / accepted:** JSONB fields aren't enforced by the DB — integrity
  depends on Zod validation at write time (tested). Cross-type queries on
  `details` are less ergonomic than typed columns.
- **Escape hatch:** if a specific type earns heavy, rich, frequently-queried
  structure (likely **repotting** or **wiring** first), promote its hot fields to
  typed columns or a dedicated table later. The enum + JSONB make that a clean,
  incremental migration.
- **Related:** *past* events (this ADR) are deliberately separate from *future*
  tasks ([ADR-0006](./0006-task-scheduling-and-recurrence.md)).
- **Implementation note (2026-07-05):** the per-type validation ships via Zod
  per [ADR-0011](./0011-server-actions-and-validation.md); the shipped enum is
  `pest_treatment` (not `pest_disease`) and standalone photos are
  timeline-unioned `photos` rows rather than a `photo_only` event type.
