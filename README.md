# 🌳 Bonsai Companion

A calm, photo-first companion for tracking, maintaining, and learning from a real
bonsai collection — built to be genuinely pleasant to use, not a generic CRUD
admin panel.

> **Status: MVP feature-complete + Sprint 08 hardening + most of M6 daily-driver
> shipped** *(updated 2026-07-11; PRs #2–#113)*. Collection + photos, unified care
> timeline, season-aware recurring tasks, the Today dashboard, batch care,
> quick-add, thumbnails + lightbox, calendar actions, archive/unarchive, full
> JSON/CSV/photo export, real account deletion, dark mode, an authenticated e2e
> harness, production hardening, and an EN/ES i18n foundation all shipped. **Not
> yet open to friends:** the M7 friends-release gate is still open (see
> [ROADMAP.md](ROADMAP.md) Tier 1 for the exact blockers). Current audit snapshot:
> [PROJECT_EXPORT.md](PROJECT_EXPORT.md).

## What it is

A personal tool to **add and organize bonsai trees, store structured info and
photos per tree, keep an ordered timeline of each tree's life, log care, and
manage a calendar of tasks (incl. fertilization)** — with a dashboard that tells
you what needs attention. Designed to be bonsai-native (species *category* is
the intended scheduling driver — **built into the schema but not yet wired into
the app**; that's the headline M8 feature), with first-class wiring, repotting,
and styling history; reliable (a pull-based dashboard, not flaky push); and
trustworthy (your data exports any time; no lock-in, no dark patterns).

See the [Product Brief](docs/product/product-brief.md) for the full vision and
[MVP Scope](docs/product/mvp-scope.md) for what's in/out.

## Why it exists

Generic plant apps (Planta, Greg) don't understand bonsai; dedicated bonsai apps
keep getting abandoned, so serious growers fall back to spreadsheets. We aim to
**execute the fundamentals excellently + add bonsai-native depth + never trap your
data.** The reasoning is evidence-based — see the
[Competitive Benchmark](docs/research/benchmark.md).

## Stack (free-first)

| Layer | Choice |
|---|---|
| **App** | Next.js (App Router) + TypeScript, PWA — installable, mobile-first |
| **UI** | Tailwind CSS + shadcn/ui |
| **Backend** | Supabase — Postgres + Auth + Storage, Row-Level Security |
| **Hosting** | Vercel (Hobby, free) |
| **Tests/CI** | Vitest + Playwright + pgTAP + GitHub Actions |

All on free tiers (~€0/mo for personal use). Rationale lives in the
[Architecture Overview](docs/architecture/overview.md) and
[ADRs](docs/decisions/).

## Documentation

Start at the **[Documentation Map](docs/README.md)**. Highlights:
- [Product Brief](docs/product/product-brief.md) · [MVP Scope](docs/product/mvp-scope.md) · [Risks & Assumptions](docs/product/risks-and-assumptions.md)
- [Architecture Overview](docs/architecture/overview.md) · [Domain Model](docs/architecture/domain-model.md) · [Data & Privacy](docs/architecture/data-and-privacy.md)
- [Decision Records (ADRs)](docs/decisions/)
- [Roadmap](docs/roadmap/roadmap.md) · [Sprint plans](docs/roadmap/) · [Backlog](docs/roadmap/backlog.md)
- [Setup guides](docs/setup/) (click-by-click) · [UX principles](docs/ux/principles.md) · [Docs style guide](docs/STYLE-GUIDE.md)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase values — see docs/setup/04
pnpm dev                     # http://localhost:3000
```

Full instructions: [setup/01](docs/setup/01-prerequisites-and-local-dev.md).

## Contributing & development

See [Development Workflow](docs/development/workflow.md) and
[Testing Strategy](docs/development/testing-strategy.md).

## License

**© The project owner. All rights reserved.** This project is **proprietary** and
not licensed for redistribution — see
[ADR-0009](docs/decisions/0009-licensing-proprietary-for-now.md). Third-party
dependencies retain their own licenses.
