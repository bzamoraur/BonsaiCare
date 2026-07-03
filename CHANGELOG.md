# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project will adopt
[Semantic Versioning](https://semver.org/) once it ships.

## [Unreleased]

### Added — Milestone M1: skeleton & data spine
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

_Milestone M1 is in progress: the data spine (schema, RLS, CI) is in place; the
app UI and magic-link auth are being built next._
