# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project will adopt
[Semantic Versioning](https://semver.org/) once it ships.

## [Unreleased]

### Added — Phase 0: Foundation
- Project foundation: product brief, MVP scope, risks & assumptions.
- Evidence-based competitive benchmark (Bonsai Empire, Mirai, Appy Bonsai, Bonsai
  Album, Jooni, Planta, Greg, PictureThis, Pl@ntNet, Vera) and tooling/accelerator
  evaluation (incl. `obra/superpowers`).
- Architecture overview, domain model, and data/security/privacy model.
- Architecture Decision Records 0000–0009 (ADR process, PWA-first platform,
  Supabase, Vercel, frontend stack, unified timeline event model, task
  scheduling/recurrence, notifications strategy, data ownership/export,
  licensing).
- UX principles & visual direction; information architecture & key flows.
- Phased roadmap, Sprint 01 plan, and backlog.
- Click-by-click setup guides (local dev, Supabase, Vercel, env vars, Claude Code
  accelerators); cost model and operations runbook.
- Development workflow/conventions and testing strategy.
- Repo hygiene: `.gitignore`, `.env.example`, `CLAUDE.md`, documentation map,
  CI scaffold.

### Changed — owner decisions folded in (2026-06-26)
- Resolved Phase-0 open questions: **Vercel** confirmed for hosting (ADR-0003
  reaffirmed); **email magic-link** chosen for auth (new **ADR-0010**); collection
  sized at ~40–50 trees (storage budget made concrete); trusted users 1→3;
  **offline-first sync explicitly out of MVP** ("installable + fast" is enough).
- Added **Setup 00 — Developer Onboarding & Handover (VS Code + Claude Code)**:
  click-by-click local setup and the session-handover kickoff prompt for building
  Sprint 01 locally.
- Updated MVP scope, cost model, architecture overview, and risk register to match.

_No application code yet — this release is the foundation only (by design)._
