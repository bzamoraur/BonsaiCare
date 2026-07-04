# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project will adopt
[Semantic Versioning](https://semver.org/) once it ships.

## [Unreleased]

### Added — Milestone M2: trees & photos
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

_Milestone M1 is complete; Milestone M2 (trees & photos) is in progress._
