# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project will adopt
[Semantic Versioning](https://semver.org/) once it ships.

## [Unreleased]

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

### Added — Milestone M4: tasks, recurrence & the daily loop (foundation)
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

_Milestones M1–M3 are complete (bar M3's deferred log→timeline e2e). Milestone M4's
foundation — the task engine (recurrence/season domain, `tasks` schema, atomic
complete/skip RPC) and the care-plan UI — is shipped; its Today dashboard, calendar,
and fertilization template are next ([Sprint 05](docs/roadmap/sprint-05.md))._
