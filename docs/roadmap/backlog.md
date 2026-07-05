# Backlog

> **Status:** Living · **Updated:** 2026-07-05
>
> The ordered holding pen for everything not in the current milestone. Items
> graduate into a sprint when their phase is active. Format: concise user
> stories + notable technical items. Priority per item: (P1) next · (P2) later ·
> (P3) maybe. Size: S (≤½ day) · M (1–3 days) · L (a sprint slice or more).

## How this works

- New ideas land here, not in the current milestone (scope discipline).
- Each item should say *who* benefits and *why*; link an ADR if it embodies a
  decision.
- When commercial/multi-user plans firm up, re-prioritize.

## Phase 1 (MVP) — user stories by milestone

These elaborate the [roadmap](./roadmap.md) milestones into reviewable stories.

### M2 — Trees & photos (shipped)

- [x] As the owner, I can add a tree with just a name so capture is instant.
- [x] …edit all structured fields later via progressive disclosure.
- [x] …organize trees by tag, location, and development stage, and search them.
- [x] …set a cover photo and see a photo-first collection grid.
- [x] …archive a tree (sold/died/gifted) without losing its history.

### M3 — Timeline & logging (in progress — [Sprint 02](./sprint-02.md) / [03](./sprint-03.md))

- …log a care event (water/fertilize/prune/wire/repot/pest/observe) in <10 s. (P1)
- …attach a photo to an event or add a standalone progress photo. (P1)
- …see one merged, date-ordered timeline per tree, filterable by type. (P1)
- …backdate an event/photo so history is accurate. (P1)

### M4 — Tasks & dashboard ([Sprint 04](./sprint-04.md) / [05](./sprint-05.md))

- …create one-off and recurring tasks (incl. fertilize every N days in-season). (P1)
- …complete/skip a task, optionally logging a care event, and auto-get the next. (P1)
- …open the app and immediately see overdue / today / upcoming. (P1)
- …edit any schedule's interval and dates freely. (P1)

### M5 — Trust & polish

- …export all my data to CSV/JSON (+ photo archive). (P1)
- …delete my account and have every row and photo actually removed. (P1)
- …use the app comfortably in dark mode and with accessibility needs. (P1)
- …trust the dashboard because the season logic is correct in my hemisphere. (P1)

## MVP-adjacent feature ideas

Small wins that fit alongside M3–M5 without breaking scope discipline — pull
one in only when its milestone's core is on track:

- **Batch "water all" / multi-tree care log** — logging 40 waterings one-by-one
  kills the habit; select-many → one event each. (P1, M — after M3 slice 4)
- **"Last watered / last fertilized" recency chip** on tree cards + detail —
  recency at a glance without opening the timeline. (P1, S — after M3)
- **Repeat-last-event** — one tap re-logs the previous event with a fresh
  timestamp; most logs are identical to the last one. (P1, S)
- **Auto-suggest cover photo** from the latest upload — keeps the grid fresh
  with zero effort. (P2, S)
- **Search within a tree's timeline** — "when did I last repot the juniper?"
  (P2, S–M)
- **Export a single tree** (profile + full timeline) — a portable record;
  trivial extension of [ADR-0008](../decisions/0008-data-ownership-and-export.md).
  (P2, S — with M5)
- **Side-by-side progression compare** (two dated photos of one tree) — the
  payoff of years of photos. (P2, M)
- **Bulk task creation across selected trees** ("fertilize these 12 every 14
  days") — how schedules are really set up. (P1, M — lands as the Sprint-05
  fertilization template's multi-tree mode)

## Phase 2 — enhancements

Prioritized by expected lived friction (see the [roadmap](./roadmap.md) Phase-2
list for the reasoning). Re-order from real usage evidence.

- **Scheduled email digest** of what's due — the robust proactive reminder a
  pull dashboard can't give; cron + Resend, no schema change. (P1, M)
- **Wiring tracker** — apply→remove window + recurring inspection + close-out;
  the ADR-0005 promotion path; new ADR required. (P1, L)
- **Species-care category rules** via `species.default_care` (the reserved
  seam) → suggested tasks/windows; new ADR for the JSONB shape. (P2, L)
- **Data import** — JSON round-trip first, then a CSV mapper; new ADR for
  merge/conflict semantics. (P2, M–L)
- **Best-effort web push** — `push_subscriptions` + VAPID + SW handler; short
  implementing-ADR under [ADR-0007](../decisions/0007-notifications-strategy.md).
  (P2, M)
- **Decandling/defoliation window helpers + "don't stack heavy work"
  guardrails** — depends on species-care rules. (P2, M)
- **Locations as care context** — sun/shade, winter-protection attributes →
  seasonal prompts ("frost forecast → move tender trees"). (P2, S–M)
- **Trusted-user invites & polish** for 1→3 users. (P2, M)
- **Google OAuth** — additive per [ADR-0010](../decisions/0010-auth-magic-link-first.md). (P3, S)

## Phase 3 — optional commercial (P3)

- Public landing page; transparent monetization; native shell (Capacitor/Expo);
  read-only shareable progression link per tree; AI species-ID/diagnosis (only
  if accuracy/cost justify); analytics. Move off Vercel Hobby first (R5).

## Technical debt & hardening register

Logged per the quality protocol; scheduled, not aspirational:

- **Storage-orphan reconciliation** — upload is storage-first/DB-second with
  client-side best-effort cleanup only; a closed tab strands objects. Add a
  scheduled sweep (objects without a `photos.storage_path` row → delete past a
  grace window) and fold object deletion into account deletion. *(Due: M5
  slice 8; flagged in the PR #12 security review.)*
- **Playwright e2e auth harness** — there's no way yet to run an authenticated
  end-to-end test (magic-link auth blocks it). Build a test-auth path (a seeded
  user + a session bypass, or Supabase admin sign-in) so critical flows can be
  covered — starting with M3's *log care → appears on timeline* (a deferred DoD),
  and feeding M5's critical-flow e2e. *(Due: before M5; unblocks the M3 e2e.)*
- **Timeline read is a JS merge** — `listTreeTimeline` fetches a tree's care
  entries + photos and merges/sorts them in app code (right for a personal
  collection's volume). If a single tree's timeline grows large, swap the seam for
  a SQL `union`/view (`security_invoker` so RLS still applies) with keyset
  pagination — the UI consumes `TimelineItem[]` either way. *(Trigger-gated.)*
- **Signed-URL TTL centralization** — a 1-hour TTL (`60 * 60`) is duplicated as
  separate constants (`SIGNED_URL_TTL_SECONDS` in `src/server/photos.ts`,
  `COVER_URL_TTL_SECONDS` in `src/server/trees.ts`); centralize one constant and
  decide TTL against the caching strategy. *(Due: with M5's performance pass.)*
- **RLS-test coverage rule** — every new table ships with isolation assertions
  (M4 `tasks`, Phase-2 `push_subscriptions`); this is a Definition-of-Done
  checkbox, not an option. *(Standing.)*
- **Error monitoring** — Server Actions currently swallow failures into
  user-facing strings; add Sentry (free tier) at the M5 production deploy so
  silent failures are observable. *(Due: M5 slice 8.)*
- **Client-cache re-evaluation trigger** — `router.refresh()` is the only
  invalidation mechanism (per [ADR-0011](../decisions/0011-server-actions-and-validation.md));
  if timeline/dashboard interactions feel laggy or optimistic UI becomes a real
  need, revisit TanStack Query. *(Trigger-gated.)*
- **`supabase db push` discipline** — hosted migrations lag the repo until the
  owner pushes; every schema PR must flag it. *(Standing; two migrations
  currently pending push: bucket limits + care log.)*

## Parking lot (unvetted ideas)

- Weather-aware watering prompts (needs a free weather API — evaluate
  cost/lock-in first).
- Same-angle photo guide (ghost overlay of the last photo while shooting).
- Timeline "year in review" auto-summary per tree.
