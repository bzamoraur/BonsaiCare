# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project will adopt
[Semantic Versioning](https://semver.org/) once it ships.

## [Unreleased]

### Fixed — Sprint 08 hardening, one "today" everywhere (S08.9a, 2026-07-07)

- **The overdue boundary is the viewer's local day, everywhere.** The tree-detail
  care-plan "Overdue" badge and the completion/skip default date now resolve
  "today" from the viewer's clock (shared `src/lib/local-day.ts`, the pattern the
  Today dashboard already used) instead of the server's UTC day — so a task no
  longer looks overdue on one screen but not another near midnight.
- **Skip records the local day.** Skipping a task now stamps the viewer's local
  calendar date (submitted by the skip form) rather than the server's UTC day, so
  a recurring task advances from the right day. (The calendar month ring — S08.9b —
  is the remaining server-UTC "today".)

### Fixed — Sprint 08 hardening, honest offline page (S08.6, 2026-07-07)

- **A real offline fallback** — a static `offline.html` is precached and served
  on a failed navigation. The previous cached-`/` fallback was dead: `/`
  redirects (to `/today` or `/login`) and the Cache API refuses to serve a
  redirected response for a navigation. Cache name bumped to invalidate the
  stale entry.
- **The service worker registers reliably** — a `readyState` guard registers
  immediately when the page has already loaded (e.g. after a client-side
  navigation), instead of waiting for a `load` event that already fired.

### Added — Sprint 08 hardening, native controls & theme (S08.5, 2026-07-07)

- **Native controls match the theme** — `color-scheme` (light/dark) so scrollbars
  and form widgets follow the palette, and `accent-color: var(--primary)` so
  checkboxes, radios, range and date pickers pick up the brand green.
- **theme-color follows your actual choice** — the browser status-bar colour now
  tracks the *resolved* theme (synced from the no-flash script and the toggle),
  not just the OS preference, so an explicit light/dark pick no longer leaves the
  status bar showing the wrong colour.

### Changed — ADR-0012: care events are calendar dates (2026-07-06)

- **`care_log_entries.occurred_at` (timestamptz) → `occurred_on` (date)**, default
  `current_date`. Same-day ordering is now deterministic — `created_at desc`
  (newest logged first) as an explicit tiebreaker in the read index and the
  timeline merge — and a dated entry can no longer render one day early in a
  UTC-negative zone. Ships with matching app code + hand-updated types; needs a
  `supabase db push` coordinated with the deploy.

### Added — Sprint 08 hardening, database layer (S08.3, 2026-07-06)

- **Closed the anon-EXECUTE gap** (hosted advisor finding) — Supabase's default
  privileges *explicitly* grant `anon` EXECUTE on every new function, so the
  original migrations' `revoke ... from public` did not actually stop an
  unauthenticated caller. `anon`/`public` EXECUTE is now revoked on
  `owner_metrics`, `delete_my_account`, and `complete_task` (authenticated
  keeps it), and on the trigger-only functions from every role (a trigger fires
  regardless of grants).
- **owner_metrics gated inside the database** — the aggregate counts are now
  returned only to the configured owner (id held in a new `private` schema the
  API never exposes) and `NULL` to anyone else, so the /admin app gate is no
  longer the only line of defense. Signature unchanged; the owner seeds the
  config once post-push (guide provided).
- **Integrity constraints the app honoured but the schema didn't enforce** —
  non-blank names (trees/locations/tags/species/tasks), JSON-object shape for
  `care_log_entries.details` and `tasks.recurrence`, positive photo dimensions
  (the only server-side guard — the upload action trusts client-supplied dims).
- **Owner-consistency composite FKs** — a photo / care entry / task / tree_tag
  can no longer reference a tree or tag owned by a *different* user (a gap RLS
  alone leaves open, since it only proves `owner_id = auth.uid()`). Enforced via
  `(id, owner_id)` unique targets + `(…, owner_id)` composite FKs, `ON DELETE
  CASCADE` to match existing behavior.
- pgTAP: new `integrity_hardening_test.sql` (anon-execute denial, private-schema
  isolation, every CHECK, every composite FK) + `owner_metrics_test.sql` updated
  for the gate. Needs `supabase db push` + a one-time config seed.

### Added — Sprint 08 hardening, first wave (2026-07-06)

- **Automated photo backup** — `photo-backup.yml` mirrors the private
  `tree-photos` bucket to the owner's Backblaze B2 bucket monthly (incremental,
  never deletes on the mirror side, zero new dependencies — B2 native API via
  fetch). Photo bytes previously had exactly one copy; pulled forward from M9.3.
- **Orphan sweep made safe** (audit critical #1) — keyset-paginated DB read
  (immune to offset-shift skips *and* server row caps) + a guard refusing
  pathological deletions; 17 unit tests over the sweep/mirror library.
- **No silent failures** (audit high #2) — `logActionError` at 31 server-side
  sites; error boundaries show the report-this `digest`; all ops crons fail
  loud and auto-file "Ops alert" issues; keep-warm pings a real table read (the
  bare REST root 401s publishable keys under the 2026 key system).
- **Web-layer hardening** (S08.4) — CSP (`frame-ancestors 'none'`, Supabase-only
  connect/img) + nosniff/Referrer-Policy/Permissions-Policy; auth-callback
  `next`-param guard; all Actions SHA-pinned; Dependabot config + the flagged
  `postcss` advisory fixed via override.
- **Repo went public** (owner decision) — branch protection now *enforces* the
  three CI checks on `main`; secret scanning push protection + Dependabot
  alerts on. Decisions recorded: plan Accepted, allowlist registration,
  calendar-date care events (**ADR-0012**).

### Added — Milestone audit & improvement plan (2026-07-06)
- **Full multi-perspective audit at the M5/Phase-1 milestone** — 10 lenses
  (architecture, security, data model, product, UX, design/a11y, testing/CI,
  performance, PWA/offline, ops/docs) + toolchain execution + hosted Supabase
  advisor checks; every critical/high finding adversarially verified (13
  confirmed, 0 refuted). Snapshot: [PROJECT_EXPORT.md](PROJECT_EXPORT.md)
  (now a living root doc, regenerated per milestone; the 2026-07-05 edition
  stays archived).
- **[Improvement plan](docs/roadmap/improvement-plan.md)** — Sprint 08
  fix-first hardening → M6 daily-driver → M7 friends release → M8 bonsai
  intelligence → M9 offline & sharing, with finding→fix traceability and the
  owner-decision list.
- **[Production-state record](docs/operations/production-state.md)** — what's
  live and armed in production (migrations, env, Action secrets, drills).

### Fixed — documentation truth sweep (2026-07-06, from audit findings)
- CLAUDE.md + README status lines were two milestones stale (said "M3 next");
  both now state Phase 1 feature-complete and point at the plan. CLAUDE.md's
  directory map gained `e2e/`, `scripts/`, `.github/`.
- Runbook: documented all three ops automations + a real **backups & restore**
  section (the backup workflow's own comment pointed at a moved dashboard page
  and an IPv6-only connection string GitHub's runners can't reach — the correct
  value is the **Session-pooler URI**); risk register R1/R9 closed out;
  roadmap/backlog/CHANGELOG stale-status cluster fixed; env reference now
  covers `OWNER_USER_ID`, `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
  the keep-warm secret pair.

### Added — Milestone M5 (Sprint 07): polish, hardening & owner metrics (2026-07-06)
- **Dark mode** — System / Light / Dark, applied before first paint (no flash) and
  remembered; toggle in Settings → Appearance.
- **Accessibility pass** (from an adversarial audit) — keyboard focus is moved into
  and back out of every inline reveal/collapse control instead of being lost;
  form success is announced via live regions and focused; the tree-picker group is
  properly named; light-theme input borders raised to WCAG AA; a global
  reduced-motion guard.
- **Graceful failure** — `(app)/error.tsx` + `global-error.tsx` mean a transient
  error shows a calm, recoverable screen instead of Next's unstyled default.
- **Owner metrics** — an owner-only `/admin` page (gated by an `OWNER_USER_ID` env
  value; a 404 for everyone else) showing aggregate, non-PII reach & engagement
  (registered count, signups, active users, totals) via a `security definer` RPC.
- **Production hardening (GitHub Actions, dormant until their secrets are set)** —
  an automated **weekly database backup** (free-tier Supabase has none), a monthly
  **storage-orphan reconciliation** sweep (service-role key kept out of the app
  runtime), and the existing keep-warm ping.
- **Schedule care across trees** — a `/plan/schedule` flow generalizing the
  fertilizing template to any care type across all/selected trees, one-off or
  recurring.
- **In-app downloads** — exports now download without navigating (fixes a PWA
  stuck-page bug), and the app icon was redrawn as a recognizable bonsai.

### Changed / deferred
- Removed a broad `(app)/loading.tsx` — it hung Server-Action form submits (caught
  by the e2e). Route-level loading is deferred to targeted per-route states.
- **Sentry deferred** — `@sentry/nextjs@10` won't install on Next 16 (a broken
  transitive dependency); interim error monitoring is Vercel's built-in logging
  plus the new error boundaries.

### Added — Milestone M5 (Sprint 06): data ownership & the e2e harness (2026-07-05)
- **Full-account export** ([ADR-0008](docs/decisions/0008-data-ownership-and-export.md)) —
  Settings exports a complete, portable copy of every user-owned table as **JSON**
  (lossless) or **CSV** (a zip of one spreadsheet-friendly file per table, UTF-8
  BOM for Excel, CSV/formula-injection-safe), plus a **photo archive** (a streamed
  store-method zip, memory-bounded to fit Vercel Hobby, with a signed-URL manifest
  fallback for very large libraries). Coverage is guarded both at compile time
  (exhaustiveness against the table types) and at run time, so a new table can
  never silently drop out of the export.
- **Real account deletion** — the Settings danger zone (type `DELETE` to confirm)
  erases the account and **all** data: a `security definer` RPC deletes the auth
  user (cascading every owned row) after the app removes all storage objects
  under the user's prefix; a `role="status"` login banner confirms the closure.
  No service-role secret in the app runtime. Proven by a 14-assertion pgTAP
  cascade/isolation suite + orchestration unit tests, and hardened by a four-lens
  adversarial review (security / data-loss / SQL / UX).
- **Authenticated e2e harness** — a Playwright global-setup mints a confirmed user
  against the local CI Supabase stack and injects a real `@supabase/ssr` session
  (no app-side auth-bypass route); a new CI **`e2e` job** runs it against
  `next build && next start`. This **closes the two long-deferred DoDs**: M3's
  *log care → appears on the timeline* and M4's *recurring task → complete from
  Today → next occurrence lands*.

### Changed
- Added the `fflate` dependency (tiny, zero-dependency) for the export zips.
- Split the login page into a Server Component (reads the post-deletion `deleted`
  flag) and a client form.

### Changed — documentation standardization & forward planning (2026-07-05)
- **Standardized every doc** against a new [Style Guide](docs/STYLE-GUIDE.md):
  uniform status headers (`Status · Updated`), heading/link conventions, shared
  setup-guide section names, and fixed broken links. Corrected all stale status
  claims — `CLAUDE.md` and `README.md` no longer describe the project as
  pre-code Phase 0.
- **[ADR-0011](docs/decisions/0011-server-actions-and-validation.md)** — ratified
  the shipped Server Components + Server Actions architecture (amending ADR-0004)
  and scoped Zod to JSONB payloads (care `details`, task `recurrence`),
  fulfilling ADR-0005's validation requirement.
- **Forward plan designed**: the [roadmap](docs/roadmap/roadmap.md) now carries
  per-milestone vertical slices for M3–M5 and a prioritized Phase 2; new sprint
  plans [02](docs/roadmap/sprint-02.md)–[05](docs/roadmap/sprint-05.md) map the
  slices to a 2-week cadence; the [backlog](docs/roadmap/backlog.md) gains sized
  feature ideas and a real tech-debt register. Sprint 01 closed out as shipped.
- Reconciled the domain-model enum with the shipped migration
  (`pest_treatment`; standalone photos are timeline-unioned rows, not a
  `photo_only` event type). Archived the point-in-time repo audit to
  `docs/archive/`.

### Added — Milestone M4: tasks, recurrence & the daily loop
- **Fertilization template** — a `/plan/fertilize` flow multi-selects trees and
  creates the canonical "every 14 days through the growing season" schedule across
  all of them at once (one bulk insert), editable per tree afterward. Reached from
  the Collection header.
- **Calendar** — a month grid with per-day due-count dots (URL-driven month
  navigation, year-rollover safe) plus a day-grouped agenda of the month's tasks,
  each linking to its tree. Read-only; reuses the task queries, no new schema.
- **Today dashboard** — the app's daily home: overdue / due today / next-7-days
  across the whole collection (one indexed range scan, **bucketed by the viewer's
  local today** so "overdue" reflects their clock, not the server's), plus a
  struggling/critical health-triage strip with cover thumbnails, and one-tap
  Done / Skip on every card (Done can log a linked care event). Calm by design —
  no guilt-trip walls; empty is "enjoy your trees."
- **Complete & skip tasks** — every pending task has **Done / Skip**. "Done" logs
  an optional linked care event (backdatable) and, if recurring, spawns the next
  occurrence; "Skip" advances the series without a care event. All in one atomic
  Postgres transaction (`complete_task` RPC) so a mid-flight failure never orphans
  a completed task or duplicates a successor (an idempotent `pending` guard).
- **Care plan per tree** — a section on the tree detail lists pending tasks (type,
  schedule, an **Overdue** badge derived at read time) with create / edit / delete.
  A plain-language recurrence editor: every N days, counting from when you do it or
  the due date, with an optional season window.
- **Recurrence & season domain** (`src/domain/scheduling.ts`) — pure, **tests-first**
  `computeNextDueOn` + `isInSeasonWindow`: season months are stored northern-
  canonical and inverted by the profile's hemisphere (the fix for the
  Bonsai-Empire southern-hemisphere bug, R7), handling year-end-wrapping windows
  and the out-of-season skip. Adversarially verified (zero confirmed defects).
  `parseRecurrence` Zod-validates the recurrence JSONB
  ([ADR-0011](docs/decisions/0011-server-actions-and-validation.md)).
- **Tasks schema** (`supabase/migrations`) — a `tasks` table (`task_type` +
  `task_status` enums, nullable tree for collection-wide tasks, JSONB recurrence),
  owner-scoped RLS proven by pgTAP, the `care_log_entries.task_id` FK, and a
  trigger that auto-skips an archived tree's pending tasks. The atomic
  `complete_task` RPC has its own 21-assertion pgTAP suite. Overdue is derived,
  never stored ([ADR-0006](docs/decisions/0006-task-scheduling-and-recurrence.md)).
- **Pending hosted push:** the `tasks` and `complete_task` migrations need
  `supabase db push` to the hosted database before tasks work in production.

### Added — Milestone M3: timeline & care logging
- **Attach photos to a care event** — "Add photo" on a timeline entry attaches the
  photo to that event (it shows inline under it, RLS-checked to the same tree); the
  tree-level "Add photo" still adds a standalone timeline photo. Completes M3's
  features (one DoD item — the log→timeline e2e — deferred to the auth harness).
- **Manage the timeline** — filter it by care type (URL-driven chips), **edit** any
  care entry, and **delete** entries behind a confirm. Logging and editing now share
  one `CareEntryFields` component; the occurred date is day-granular (which keeps it
  timezone-simple).
- **Per-tree timeline** — the tree detail now shows one merged, newest-first
  timeline of care events **and** photos (per-type icons, inline photo thumbnails),
  replacing the separate care-log list and photos grid. Read via a single
  `listTreeTimeline` seam (a JS merge for now; the SQL-union scale path is logged in
  the backlog). Photos attached to an event already fold into that event's item.
- **Global "+" quick-add** — the nav's centre action now opens a `/log` tree
  picker (skipping straight to the tree when you only have one); picking a tree
  lands on its detail with the Log care form already open. Log from anywhere in a
  couple of taps. Closes Sprint 02.
- **Log care from a tree** — a "Log care" form on the tree detail: pick a type,
  fill the per-type detail fields (fertilizer NPK, repot soil mix, pruning
  intensity…), optionally backdate (timezone-correct), add notes. Backed by a
  care data-access layer (`src/server/care.ts`) and an owner-scoped Server Action
  that validates with `parseCareEntry`; logged entries appear in a Care log list.
- **Care validation domain** — `src/domain/care.ts`: a Zod schema per
  `care_event_type` for the `details` JSONB (per
  [ADR-0011](docs/decisions/0011-server-actions-and-validation.md), exhaustive so
  a new enum value fails the build until it gets a schema), plus a pure
  `parseCareEntry` validator (12 unit tests). Adds `zod`; regenerated the DB types
  to include `care_log_entries`.
- **Care log schema** (`supabase/migrations`) — a `care_log_entries` table (per
  [ADR-0005](docs/decisions/0005-unified-timeline-event-model.md)): a `type`
  discriminator + typed core columns (`occurred_at`, `title`, `notes`, `task_id`) and
  a validated `details` JSONB per event type, with owner-scoped RLS proven by a
  9-assertion pgTAP suite. Also wires `photos.care_log_entry_id` so a photo can
  document an event.

### Added — Milestone M2: trees & photos
- **Filter, sort & search the collection** — search by name/species, filter by
  location, tag, development stage, or health, and sort (newest / oldest / name). All
  URL-driven, so a filtered view is shareable and survives refresh; search is
  debounced and the search term is sanitised before it reaches the query.
- **Tags** — attach freeform tags to a tree from the edit form (comma-separated,
  type-to-create, case-insensitively de-duplicated). Shown as chips on the detail.
  A pure, unit-tested `parseTagInput` normalises the input; `syncTreeTags` resolves
  names to ids (creating new ones) and replaces the join rows, all owner-scoped.
- **Locations** — assign where a tree lives from the edit form: a type-to-create field
  that autocompletes your existing locations (case-insensitive, so they don't split
  into near-duplicates) and creates new ones on save. Shown on the tree's detail.
- **Photos** — add a photo to any tree (downscaled and re-encoded to **WebP in the
  browser** before upload, so storage stays tiny), browse them in a gallery, **set a
  cover** (shown as the detail hero), and delete. Files live in the private
  `tree-photos` bucket and are served via short-lived **signed URLs**; uploads go
  browser → Storage directly (Storage RLS enforces the owner's folder), then a Server
  Action records the row. The bucket also carries a 5 MB size cap and an image-only
  MIME allowlist as a server-side guardrail. Cover thumbnails appear on the collection
  grid too (signed URLs batched into one Storage call per page).
- **Tree detail, edit & archive** — tapping a card opens a detail screen with the
  tree's facts and notes; a full **edit** form (species, development stage, health,
  origin, style, pot, substrate, acquired date/source, notes); and a confirm-guarded
  **archive** (soft delete that hides the tree from the collection but preserves its
  history). Data-access grows `getTree` / `updateTree` / `archiveTree`, and the add +
  edit forms now share one validated `parseTreeForm`.
- **Collection — list & add trees** — the Collection tab lists your (non-archived)
  trees in a photo-first grid with a friendly empty state, plus an **Add a tree** form
  (name required; species, development stage, and health status optional). Backed by a
  typed `src/server` data-access layer, owner-scoped Server Action inserts, and a pure,
  unit-tested `parseNewTree` validator.
- **Photos table & private Storage** (`supabase/migrations`) — a `photos` table tied to
  trees with `trees.cover_photo_id`, plus a private `tree-photos` bucket. Owner-scoped
  RLS on both the table and Storage objects (object path prefixed by the owner's user
  id), proven by an **11-assertion pgTAP isolation suite**.

### Changed
- **Refined the installable app icon** — a redesigned bonsai mark (gradient tile,
  layered canopy, curved trunk, clay pot) rasterised to every PWA size via a committed
  Playwright generator (`pnpm icons`), adding a safe-zone **maskable** variant and a
  dedicated **180×180 iOS apple-touch-icon**.

### Added — Milestone M1: skeleton, spine & auth
- **Email magic-link authentication** — passwordless sign-in (Supabase OTP with a PKCE
  `/auth/callback`), a session-refreshing proxy (`src/proxy.ts`) that gates every
  non-public route, and sign-out.
- **Installed app shell** — an authenticated layout with a mobile-first bottom tab bar
  (Today, Collection, Calendar, Settings) and a **Settings** screen to edit display
  name, hemisphere, and units (owner-scoped Server Action).
- **Next.js 16 (App Router) + TypeScript PWA skeleton** with tooling — Tailwind v4,
  shadcn/ui, ESLint, Prettier, Husky + lint-staged pre-commit, Vitest + Playwright,
  an installable web manifest and service worker, and the first pure-domain unit
  test (`isOverdue` scheduling logic). *(M1 PR1)*
- **Database schema & Row-Level Security** (`supabase/migrations`) — `profiles`,
  `species`, `locations`, `trees`, `tags`, `tree_tags` with enums, indexes, a
  `SECURITY DEFINER` signup trigger, and ~15 seeded global species; per-command
  owner-scoped RLS on every user table, proven by a **29-assertion pgTAP
  cross-user isolation suite**. *(M1 PR2)*
- **Continuous Integration** (`.github/workflows/ci.yml`) — typecheck, lint, unit
  tests, and production build on every PR, plus a database job that boots a local
  Supabase stack and runs the pgTAP isolation tests; free-tier **keep-warm** cron
  (`keep-warm.yml`).
- Documentation aligned to the **2026 Supabase API key names** (publishable /
  secret), replacing the legacy `anon` / `service_role` naming.

### Added — Phase 0: Foundation
- Project foundation: product brief, MVP scope, risks & assumptions.
- Evidence-based competitive benchmark (Bonsai Empire, Mirai, Appy Bonsai, Bonsai
  Album, Jooni, Planta, Greg, PictureThis, Pl@ntNet, Vera) and tooling/accelerator
  evaluation (incl. `obra/superpowers`).
- Architecture overview, domain model, and data/security/privacy model.
- Architecture Decision Records 0000–0010 (ADR process, PWA-first platform,
  Supabase, Vercel, frontend stack, unified timeline event model, task
  scheduling/recurrence, notifications strategy, data ownership/export,
  licensing, and email magic-link auth).
- UX principles & visual direction; information architecture & key flows.
- Phased roadmap, Sprint 01 plan, and backlog.
- Click-by-click setup guides (local dev, Supabase, Vercel, env vars, Claude Code
  accelerators); cost model and operations runbook.
- Development workflow/conventions and testing strategy.
- Repo hygiene: `.gitignore`, `.env.example`, `CLAUDE.md`, documentation map.

### Changed — owner decisions folded in (2026-06-26)
- Resolved Phase-0 open questions: **Vercel** confirmed for hosting (ADR-0003
  reaffirmed); **email magic-link** chosen for auth (new **ADR-0010**); collection
  sized at ~40–50 trees (storage budget made concrete); trusted users 1→3;
  **offline-first sync explicitly out of MVP** ("installable + fast" is enough).
- Added **Setup 00 — Developer Onboarding & Handover (VS Code + Claude Code)**:
  click-by-click local setup and the session-handover kickoff prompt for building
  Sprint 01 locally.
- Updated MVP scope, cost model, architecture overview, and risk register to match.

_**Phase 1 (MVP) is feature-complete — Milestones M1–M5 all shipped** (PRs
#2–#57), including the once-deferred e2e flows, which the Sprint-06 Playwright
auth harness closed for real. The 2026-07-06 milestone audit
([PROJECT_EXPORT.md](PROJECT_EXPORT.md)) confirmed the claim and produced the
sequenced next steps: the
[improvement plan](docs/roadmap/improvement-plan.md) — Sprint 08 fix-first
hardening, then M6 daily-driver, M7 friends release, M8 bonsai intelligence,
M9 offline & sharing._
