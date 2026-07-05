# ADR-0011: Ratify Server Components + Server Actions; scope Zod to JSONB payloads

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Owner + Claude

## Context

[ADR-0004](./0004-frontend-stack.md) selected **TanStack Query + react-hook-form
+ Zod** as the client data/forms/validation triad. The M1–M2 build (PRs #2–#16)
did not adopt them: the shipped app uses **React Server Components** for reads
(typed data-access in `src/server/*.ts`), **Server Actions** for mutations
(`actions.ts` per route, revalidated via `revalidatePath`/`router.refresh()`),
native `<form>` + `useActionState` for forms, and **hand-rolled, zero-dependency
validators** in `src/domain/` (`parseTreeForm`, `parseTagInput` — pure,
unit-tested, enum values sourced from the generated Supabase `Constants`).

This divergence worked — less client JavaScript fits the "calm, photo-first PWA"
principle, and signed-URL pages render server-side anyway — but an Accepted ADR
contradicted by the codebase erodes the decision trail
([ADR-0000](./0000-adr-process.md)).

The decision is now forced by M3/M4: [ADR-0005](./0005-unified-timeline-event-model.md)
requires **per-type validation of `care_log_entries.details`** (10 event types,
a discriminated union), and [ADR-0006](./0006-task-scheduling-and-recurrence.md)
adds a second validated JSONB payload (`tasks.recurrence`). The database cannot
enforce JSONB shape; unvalidated writes silently corrupt years of care history.

## Options considered

1. **Re-adopt the full ADR-0004 triad now.** Pro: honors the original ADR.
   Con: rips out a working, simpler pattern; adds three dependencies and a
   client-cache layer the MVP has no demonstrated need for; `router.refresh()`
   is sufficient at current scale.
2. **Hand-roll everything, including the JSONB payloads.** Pro: zero
   dependencies, one consistent style. Con: a 10-branch discriminated union with
   per-type field validation is exactly where hand-rolling breeds drift — each
   new event type must remember to add checks by hand, and there is no inferred
   type to keep TS and the validator in lockstep.
3. **Ratify the shipped pattern; adopt Zod narrowly for discriminated-union
   JSONB payloads.** Server Components + Server Actions + hand-rolled validators
   stay the rule for flat entity forms (proven in M2). Zod is added as a single
   dependency, used only where its discriminated unions genuinely pay:
   `care_log_entries.details` (M3) and `tasks.recurrence` (M4).

## Decision

Choose **option 3**.

- **Data flow (amends ADR-0004):** Server Components for reads, Server Actions
  for writes, `revalidatePath`/`router.refresh()` for invalidation. TanStack
  Query and react-hook-form are **not adopted for MVP**; re-evaluate (per the
  roadmap's trigger discipline) if timeline/dashboard interactivity outgrows
  full-page revalidation or optimistic UI becomes a real need.
- **Validation:** flat entity forms keep the hand-rolled `src/domain` pattern.
  **Zod validates every JSONB payload** via schemas in `src/domain/` — a
  discriminated union keyed on `care_event_type` for `details` (fulfilling
  ADR-0005's "validated by a Zod schema per type"), and a schema for
  `recurrence`. Validation always runs **at the Server Action boundary**
  (Server Actions are a public HTTP surface), with unit tests per type
  covering valid and invalid payloads.

## Consequences

- **Positive:** the decision trail matches the code again; M3 starts on a
  decided foundation; JSONB integrity gets inferred TS types + tested schemas;
  the app keeps its light client footprint; one new dependency instead of three.
- **Negative / accepted:** two validation styles coexist (hand-rolled for flat
  forms, Zod for JSONB) — mitigated by a bright-line rule: *JSONB ⇒ Zod, flat
  form ⇒ hand-rolled*. If the split grates in practice, migrating the flat
  forms to Zod is cheap and additive.
- [ADR-0004](./0004-frontend-stack.md)'s status is annotated
  `Amended by ADR-0011` (Next.js/Tailwind/shadcn portions unchanged).
- The re-adoption trigger for a client-cache library is recorded in the
  [backlog](../roadmap/backlog.md) tech-debt register, not left implicit.
