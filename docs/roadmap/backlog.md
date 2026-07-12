# Backlog

> **Status:** Living · **Updated:** 2026-07-12
>
> The ordered holding pen for everything not in the current milestone. Items
> graduate into a sprint when their phase is active. Format: concise user
> stories + notable technical items. Priority per item: (P1) next · (P2) later ·
> (P3) maybe. Size: S (≤½ day) · M (1–3 days) · L (a sprint slice or more).
>
> **Post-M5 note:** the 2026-07-06 milestone audit produced a sequenced
> execution plan — many P1 items below now have a concrete slot in the
> [improvement plan](./improvement-plan.md) (batch logging → S09, i18n/allowlist/
> onboarding/analytics → M7, digest/wiring/species rules → M8, …). This file
> remains the holding pen; the plan is the order.

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

### M3 — Timeline & logging (shipped — [Sprint 02](./sprint-02.md) / [03](./sprint-03.md))

- [x] …log a care event (water/fertilize/prune/wire/repot/pest/observe) in <10 s.
- [x] …attach a photo to an event or add a standalone progress photo.
- [x] …see one merged, date-ordered timeline per tree, filterable by type.
- [x] …backdate an event/photo so history is accurate.

### M4 — Tasks & dashboard (shipped — [Sprint 04](./sprint-04.md) / [05](./sprint-05.md))

- [x] …create one-off and recurring tasks (incl. fertilize every N days in-season).
- [x] …complete/skip a task, optionally logging a care event, and auto-get the next.
- [x] …open the app and immediately see overdue / today / upcoming.
- [x] …edit any schedule's interval and dates freely.

### M5 — Trust & polish (shipped — [Sprint 06](./sprint-06.md) / [07](./sprint-07.md))

- [x] …export all my data to CSV/JSON (+ photo archive). (Sprint 06)
- [x] …delete my account and have every row and photo actually removed. (Sprint 06)
- [x] …use the app comfortably in dark mode and with accessibility needs. (Sprint 07)
- [x] …trust the dashboard because the season logic is correct in my hemisphere.
  (season domain shipped in M4; the daily loop is now e2e-proven, Sprint 06)

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
- [x] **Owner metrics view (friends-release) — ✅ shipped early (PR #53).**
  `/admin`, env-gated (`OWNER_USER_ID`, 404 otherwise), aggregate-only
  `owner_metrics()` RPC. Remaining: v2 with per-feature counts + last-active,
  fed by `usage_events` (improvement plan S12.2), and the S08.3 hardening
  (revoke anon EXECUTE + in-DB owner gate — hosted advisors found Supabase's
  default privileges leave `anon` able to call the RPC).
- **Usage analytics (privacy-first, friends-release)** — "data will be key":
  see *which* features get used so development is evidence-led. Start with Vercel
  Web Analytics (routes, cookieless) + a small `usage_events` table for key
  actions (logged care, created/completed task) that feeds the owner metrics
  view; consider PostHog/Plausible only if richer funnels are needed. New ADR for
  the events shape + retention. No PII beyond the user id already held. (P1 for
  the friends stage, M)
- **Gated registration / email allowlist (friends-release decision)** — signup is
  **open** today (anyone with the URL can register). For a controlled colleague
  rollout, restrict signup to invited emails via a Supabase auth hook or an
  `allowed_emails` check. Owner decides open vs. gated before inviting. (P1 for
  the friends stage, S)
- **First-run tutorial / onboarding tour** — the moment a friend opens the app
  cold, a short guided walk-through (add a tree → log care → read the timeline)
  turns "empty app" into "I get it." Skippable, re-openable from Settings, and
  never shown twice unless asked. State lives in a `profiles` flag so it's
  per-user, not per-device. Gate the *friends* release on this. (P1 for the
  friends stage, M)
- [x] **Language switch (ES / EN) — ✅ shipped (PRs #109–#132).** Full Spanish
  across every friend-facing surface (login, settings, today, collection, calendar,
  plan, quick-log, care/task/tree forms, tree-detail, error boundaries, enum label
  maps) on **next-intl 4** with a **cookie-resolved locale** (no URL routing),
  English fallback, and an en/es parity guard; pre-login locale defaults from
  **Accept-Language** (#126). This was the P1 "i18n before the friends release"
  gate — now met. (Follow-up: the promised i18n ADR was never written — capture the
  as-built approach.)
- **Google OAuth** — additive per [ADR-0010](../decisions/0010-auth-magic-link-first.md). (P3, S)

## Phase 3 — optional commercial (P3)

Only after the app is genuinely *done* and has survived real self-use +
friends-testing. Sequence and gate every step behind evidence of demand — don't
build a store presence for an app nobody has asked to pay for.

- Public landing page; native shell (Capacitor/Expo — reuse the PWA);
  read-only shareable progression link per tree; AI species-ID/diagnosis (only
  if accuracy/cost justify); analytics. Move off Vercel Hobby first (R5).
- **Monetization (only when the app is finished and wanted).** Options, roughly
  in order of least-to-most intrusive:
  - **App-store publication** — ship the native shell to the Apple App Store /
    Google Play. Requires developer accounts (annual fee), store-review
    compliance, privacy-nutrition labels, and account-deletion parity (already
    an M5 promise — good).
  - **Freemium with Pro features** — the core stays free; a subscription unlocks
    Pro (candidate gates: unlimited trees beyond a free cap, advanced
    scheduling/season templates, data-export automation, AI diagnosis, cross-tree
    analytics). Needs a billing provider (Stripe / RevenueCat for stores), an
    entitlements model on `profiles`, and server-side feature-gating — never
    trust the client. New ADR for the billing + entitlement architecture.
  - **Ads** — lowest-effort revenue but highest UX cost for a calm, personal
    care app; if ever used, keep them out of the core loop (never on the Today
    dashboard or logging flow). Evaluate against the product's whole "calm tool,
    not attention casino" premise before committing. (P3, last resort.)

## Technical debt & hardening register

Logged per the quality protocol; scheduled, not aspirational:

- **Storage-orphan reconciliation — ✅ DONE (Sprint 07, PR #56; hardened S08.1, PR #60)**
  as `scripts/reconcile-storage.mjs` + a monthly dormant-until-secret workflow
  (dry-run default on manual dispatch; 24h grace window). The unpaginated-read
  bug (past PostgREST's 1,000-row cap real photos could be classified as orphans)
  is **fixed in S08.1** — the DB read is now keyset-paginated with a sanity guard
  that refuses to delete when orphans exceed 20% of scanned objects. The sweep
  secret is **armed and dry-run-verified** (see
  [production-state](../operations/production-state.md)).
- **Encrypted backups + off-site delete-purge — ✅ DONE.** The weekly DB backup is
  now **AES-256-encrypted** before upload and **fails loud** (uploads nothing) if
  `BACKUP_ENCRYPTION_KEY` is missing (PR #116 — closed the beta-readiness CRITICAL
  that a public-repo artifact leaked `auth.users`; restore drill 2026-07-08). And
  account deletion now reaches the off-site B2 mirror: `delete_my_account()`
  enqueues the user's prefix in `b2_purge_queue`, drained monthly by `b2-purge.yml`
  + `scripts/purge-b2.mjs` (PR #136) — closing the
  [ADR-0008](../decisions/0008-data-ownership-and-export.md) delete-path off-site
  gap.
- **Playwright e2e auth harness — ✅ DONE (Sprint 06, PRs #42–#43).** Shipped as
  designed: a global-setup mints a confirmed user against the CI Supabase stack
  and injects a real `@supabase/ssr` session (produced by the library itself, not
  hand-crafted) into the browser context — no app-side auth-bypass route — with a
  new CI `e2e` job (`supabase start` → export keys → `next build && next start` →
  `playwright test`). **Both deferred DoDs closed**: M3's *log care → timeline*
  and M4's *recurring → complete from Today → next occurrence lands*. It authored
  green from CI without local Docker after all (the library-produced cookie was
  the key). The out-of-season **skip** stays unit/pgTAP-covered by choice. Any
  future critical-flow e2es (M5 slice 8) extend this same harness.
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
- **Error monitoring** — interim **upgraded to a durable log (PRs #134–#135)**: client crashes
  (`error.tsx`/`global-error.tsx` `sendBeacon` → the public `/api/log-error` path)
  and server errors (persisted via Next `after()`) now write to an `app_errors`
  table (RLS on, owner-stamped) and surface in `/admin`'s "Recent errors" section —
  not just Vercel's ephemeral logs. `(app)/error.tsx` + `global-error.tsx` continue
  to degrade gracefully (Sprint 07). **Sentry is deferred**: `@sentry/nextjs@10` currently
  fails to install (its transitive `import-in-the-middle` pins
  `es-module-lexer@^2.2.0`, which isn't published), and Next 16 + Turbopack
  support is unproven. Revisit once it installs cleanly, then forward errors to a
  free Sentry project (DSN via env, guarded so a missing DSN is a no-op). *(Due:
  when the SDK is installable; interim monitoring is live.)*
- **Client-cache re-evaluation trigger** — `router.refresh()` is the only
  invalidation mechanism (per [ADR-0011](../decisions/0011-server-actions-and-validation.md));
  if timeline/dashboard interactions feel laggy or optimistic UI becomes a real
  need, revisit TanStack Query. *(Trigger-gated.)*
- **`supabase db push` discipline** — hosted migrations lag the repo until the
  owner pushes; every schema PR must flag it. *(Standing. As of 2026-07-06 the
  hosted DB is fully caught up — as of 2026-07-11 **all 12 migrations** are pushed and
  owner-verified (high-water `20260711130000`; the `app_errors` + `b2_purge_queue`
  pair from PR #134 is live). Current state is tracked in
  [operations/production-state.md](../operations/production-state.md); a weekly
  drift check reusing `SUPABASE_DB_URL` is proposed in the improvement plan.)*

## Parking lot (unvetted ideas)

- Weather-aware watering prompts (needs a free weather API — evaluate
  cost/lock-in first).
- Same-angle photo guide (ghost overlay of the last photo while shooting).
- Timeline "year in review" auto-summary per tree.
