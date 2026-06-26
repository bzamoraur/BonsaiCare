# ADR-0006: Simple, editable, interval-with-season recurrence (not full RRULE)

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Owner + Claude

## Context

The MVP needs a calendar of tasks and **fertilization schedules**, surfacing
upcoming/pending/overdue actions. Research is unambiguous about how to *not* do
scheduling:
- **Planta:** "rigid schedules you can't easily edit / can't backdate" — the #2
  complaint in the category.
- **Bonsai Empire:** Southern-hemisphere users got the **wrong season** with no
  fix — a seasonality bug.
- **Bonsai domain truth:** care is **season- and signal-driven**, not fixed
  intervals; fertilizing runs ~every 1–2 weeks in the growing season then stops
  for dormancy; repotting is a multi-year, species/season-gated window.

## Options considered

1. **Full iCalendar RRULE engine.** Maximal flexibility. Con: heavy, error-prone,
   overkill; hard to make editable/legible for a hobbyist.
2. **Materialize a long series of task rows** up front. Con: editing the schedule
   means rewriting many rows; drift; clutter.
3. **Lazy next-occurrence generation from a simple, editable rule.** Store one
   `recurrence` rule on the task; generate the *next* task when one is completed.

## Decision

Choose **option 3** with a deliberately small rule shape:

```ts
recurrence: {
  interval_days: number,            // e.g. 14
  anchor: 'completion' | 'due',     // recompute next from when you DID it, or from due date
  season_start_month?: number,      // 1–12, optional active window…
  season_end_month?: number         // …e.g. Mar–Oct fertilizing; skip out-of-season
} | null                            // null = one-off
```

Plus these **non-negotiable behaviors** (each a direct answer to a competitor
failure):
- **Every due date and interval is editable**, any time (vs Planta rigidity).
- **You can log/complete early or late**, and choose whether the next occurrence
  anchors to the completion date or the due date (bonsai: fertilizing usually
  anchors to completion; a spring repot anchors to a fixed window).
- **Free-form logging is never gated by a task** — you can always just log a care
  event ([ADR-0005](./0005-unified-timeline-event-model.md)).
- **Season window is honored**: computing the next `due_on` **skips out-of-season
  months** (the exact bug Bonsai Empire shipped), using
  `profile.hemisphere` to interpret seasons. This logic is **pure and unit-
  tested**, including the hemisphere and season-skip cases.
- **Overdue is derived**, never stored: `pending AND due_on < today`.

## Consequences

- **Positive:** legible to a hobbyist; trivially editable; no row-sprawl; covers
  the real bonsai cases (every-N-days-in-season fertilizing; multi-year repot
  reminders) without RRULE weight; correctness is testable in isolation.
- **Negative / accepted:** cannot express exotic rules (e.g. "2nd Tuesday
  monthly") — not needed for bonsai care. Multi-flush, narrow-window tasks (pine
  decandling ~Jun 1–10) are modeled as a dated one-off reminder in MVP; a
  species-aware window engine is a deferred Phase-2 enhancement.
- **Escape hatch:** if richer recurrence is ever needed, the rule is JSON on the
  task and the generator is one pure function — extend without schema churn.
