# Roadmap

> **Status:** Living · **Updated:** 2026-07-06
>
> Phased, scope-disciplined. Each phase has an exit criterion. We do not start a
> phase's "nice-to-haves" until its core ships. Estimates are rough effort for a
> solo dev working part-time; treat as relative, not promises. Sprint-level
> detail lives in the sprint docs ([02](./sprint-02.md), [03](./sprint-03.md),
> [04](./sprint-04.md), [05](./sprint-05.md)).

## Where we are (2026-07-06)

| Milestone | State | Proof |
|---|---|---|
| Phase 0 — Foundation | ✅ shipped | Docs, ADRs 0000–0011, CI scaffold |
| M1 — Skeleton & spine | ✅ shipped | PRs #2–#7; [Sprint 01](./sprint-01.md) closed |
| M2 — Trees & photos | ✅ shipped | PRs #8–#16; collection + photos + organize live |
| M3 — Timeline & care logging | ✅ shipped | PRs #17–#24; Sprints [02](./sprint-02.md)/[03](./sprint-03.md) — one deferred DoD (e2e harness) |
| M4 — Tasks & dashboard | ✅ shipped | PRs #26–#36; Sprints [04](./sprint-04.md)/[05](./sprint-05.md) — one deferred DoD (daily-loop e2e) |
| M5 — Trust & production | planned | Sprints 06–07 next |

## Phase 0 — Foundation

Research, product brief, MVP scope, architecture + ADRs, repo structure, docs,
roadmap, risks, setup guides, CI scaffold, GitHub hygiene. **Exit:** the
foundation is reviewed and the stack/scope are agreed. Met 2026-06-26.

## Phase 1 — MVP (the usable product)

Goal: **the owner runs their real collection on it for a season.** Built as
milestones; each is independently demoable and merges behind CI.

### M1 — Skeleton & spine *(infra + auth + schema)* — ✅ shipped

- Next.js + TS (strict) + Tailwind + shadcn/ui + PWA manifest/SW; tooling + CI.
- Supabase (EU): `profiles`, `species`, `locations`, `trees`, `tags/tree_tags`,
  **RLS on all** with a pgTAP isolation suite; seeded species.
- Magic-link auth; protected app shell; 5-tab navigation.
- **Exit (met):** sign in, see an empty Today, RLS isolation test passes, CI
  green, deployed preview works. Closed in [Sprint 01](./sprint-01.md).

### M2 — Trees & photos *(the collection)* — ✅ shipped

- Trees CRUD + archive; structured profile with progressive disclosure.
- Photo-first collection grid; filter/sort/search; tags & locations.
- Photo upload/capture → client WebP compression → private bucket + signed URLs;
  cover photo; grid thumbnails.
- **Exit (met):** owner can add their real trees with photos and organize them.
  Shipped across PRs #8–#16.

### M3 — Timeline & care logging *(history)* — ✅ shipped

Shipped across Sprints [02](./sprint-02.md) (capture) and [03](./sprint-03.md)
(timeline). Built on the `care_log_entries` schema
([ADR-0005](../decisions/0005-unified-timeline-event-model.md)); validated per
type with Zod ([ADR-0011](../decisions/0011-server-actions-and-validation.md)).
The slices, as delivered (one small PR each):

1. **Care domain + per-type Zod schemas** — discriminated union over
   `care_event_type`, pure `parseCareEntry` ([ADR-0011](../decisions/0011-server-actions-and-validation.md)).
2. **Care data-access + Server Actions** (`src/server/care.ts`).
3. **Quick-add from a tree** — "Log care" sheet: type → per-type fields →
   editable `occurred_at`.
4. **Global "+" quick-add** — wires the nav's center action; log from anywhere
   in <10 s.
5. **Per-tree timeline** — SQL union of care entries + photos, date-ordered,
   type icons, batched signed thumbnails.
6. **Timeline filter + edit/backdate/delete** — URL-driven type chips; reuse
   the slice-1 schemas.
7. **Photo ↔ event wiring** — attach a photo while logging; standalone photos
   render as their own timeline items.

- **Exit:** owner logs real care quickly (any type, <10 s, from the global +);
  each tree shows one coherent, filterable, backdate-correct timeline merging
  events + photos; per-type schemas unit-tested; a log→timeline e2e passes.
- **Sprints:** [02 — "Log care, fast"](./sprint-02.md) (slices 1–4) and
  [03 — "The tree's story"](./sprint-03.md) (slices 5–7).

### M4 — Tasks, recurrence & dashboard *(the daily loop)* — ✅ shipped

Recurrence per [ADR-0006](../decisions/0006-task-scheduling-and-recurrence.md);
dashboard per [ADR-0007](../decisions/0007-notifications-strategy.md). Slices
1–5 shipped in [Sprint 04](./sprint-04.md) (PRs #26–#31); 6–8 in
[Sprint 05](./sprint-05.md) (PRs #34–#36):

1. ✅ **`tasks` migration** + RLS + pgTAP; add the deferred
   `care_log_entries.task_id` FK.
2. ✅ **Recurrence/season pure domain** — `computeNextDueOn` + `isInSeasonWindow`
   in `src/domain/scheduling.ts`, **tests first**, covering both hemispheres and
   the season-skip (the marquee correctness risk, R7).
3. ✅ **Tasks data-access + atomic completion** — complete/skip → optional care
   entry + next occurrence in **one transaction** (RPC).
4. ✅ **Task create/edit UI** — one-off + recurring; legible recurrence editor
   (interval, anchor, season window).
5. ✅ **Complete/skip flow** — one tap, "also log a care event?" prefilled.
6. ✅ **Today dashboard** — overdue / due today / upcoming + health triage; the
   app's daily home (bucketed by the viewer's local today).
7. ✅ **Calendar** — day-grouped agenda + a month grid with due-count dots.
8. ✅ **Fertilization template** — one-tap multi-tree "every 14 days, Mar–Oct".
   The full-loop **e2e is deferred** to the Playwright auth harness (backlog);
   the loop is covered by unit tests + the `complete_task` pgTAP suite.

- **Exit (met, bar the deferred e2e):** the dashboard is trustworthy (correct in
  both hemispheres, proven by unit tests written first); every interval/date
  editable; fertilization schedules work end-to-end; completion is atomic.
- **Sprints:** [04 — "A schedule you can trust"](./sprint-04.md) (slices 1–5)
  and [05 — "The daily loop"](./sprint-05.md) (slices 6–8).

### M5 — Trust, polish & production — planned

Export per [ADR-0008](../decisions/0008-data-ownership-and-export.md). Slices:

1. **JSON export** (all core tables; a standing test fails if a new table isn't
   covered) → 2. **CSV export** (flattened `details`) → 3. **Photo archive**
   (streamed, or signed-path manifest — mind Vercel Hobby limits) →
4. **Account deletion** (cascades rows **and** storage objects) →
5. **Empty states + dark mode** → 6. **Accessibility pass** →
7. **Performance pass** (responsive images, lazy loading) →
8. **Production hardening** — verify keep-warm fires (closes R1), verify
   backup/restore (closes R9), error monitoring (Sentry free), full e2e of
   F1–F7, storage-orphan reconciliation job.

- **Exit (Phase 1 done):** deployed, stable, the owner uses it as the primary
  record with no data loss. This is the **success definition**.
- **Sprints:** 06 (export + deletion) and 07 (polish + hardening) — sprint docs
  written when M4 closes.

## Phase 2 — Enhancements (only after MVP is loved)

Prioritized by the owner's lived friction during a real season — re-order from
evidence, not speculation:

1. **Scheduled email digest** *(P1 of Phase 2)* — the one thing a pull dashboard
   can't do: reach you when you're not in the app. Cron + Resend over the same
   overdue/upcoming logic as the dashboard; **no schema change** (the ADR-0007
   payoff). Trigger: the owner misses due care because they didn't open the app.
2. **Wiring tracker** — apply date → removal window → recurring inspection →
   "remove" closes it. The sharpest bonsai-specific pain (wire bites in weeks).
   Uses [ADR-0005](../decisions/0005-unified-timeline-event-model.md)'s
   promotion escape hatch; needs its own ADR.
3. **Species-care category rules** — populate `species.default_care` (the
   reserved seam) at category level to *suggest* tasks/windows, never impose.
   Needs an ADR for the JSONB shape.
4. **Data import** — JSON round-trip first (guaranteed by the export format),
   then a guided CSV mapper. Needs an ADR for merge semantics.
5. **Best-effort web push** — `push_subscriptions` + VAPID + SW handler; short
   implementing-ADR. After email, because email is reliable and push is not.
6. **Decandling/defoliation window helpers + "don't stack heavy work"
   guardrails** — pure rules over care history + season; depends on (3).
7. **Locations as care context** — sun/shade + winter-protection attributes
   driving seasonal prompts.
8. **Trusted-user polish** — invites for the 1→3 users; RLS already holds.
9. **Google OAuth** — additive per
   [ADR-0010](../decisions/0010-auth-magic-link-first.md), if magic-link
   round-trips grate.

## Phase 3 — Optional commercial (only if pursued)

Public landing page, monetization (transparent, no dark patterns), native shell
(Capacitor/Expo — the pure `src/domain/` survives the move), read-only share
links, AI assists — each gated by a real decision and its own ADR. Hosting moves
off Vercel Hobby before any commercial launch (R5).

## Guiding rule

If a proposed task isn't in the current phase's exit criteria, it goes to the
[backlog](./backlog.md) — not into the current milestone. Scope discipline is how
this avoids becoming "a tool that technically exists but isn't pleasant enough to
use."
