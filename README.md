# 🌳 Bonsai Companion

A calm, photo-first companion for tracking, maintaining, and learning from a real
bonsai collection — built to be genuinely pleasant to use, not a generic CRUD
admin panel.

> **Status: Phase 0 — Foundation.** This repository currently contains the
> product, architecture, and planning foundation (research, decisions, roadmap,
> setup guides). **No application code yet** — by design. Building begins at
> [Sprint 01](docs/roadmap/sprint-01.md) once the foundation is agreed.

## What it is

A personal tool to **add and organize bonsai trees, store structured info and
photos per tree, keep an ordered timeline of each tree's life, log care, and
manage a calendar of tasks (incl. fertilization)** — with a dashboard that tells
you what needs attention. Bonsai-native (species *category* drives scheduling;
first-class wiring, repotting, styling history), reliable (a pull-based dashboard,
not flaky push), and trustworthy (your data exports any time; no lock-in, no dark
patterns).

See the [Product Brief](docs/product/product-brief.md) for the full vision and
[MVP Scope](docs/product/mvp-scope.md) for what's in/out.

## Why it exists

Generic plant apps (Planta, Greg) don't understand bonsai; dedicated bonsai apps
keep getting abandoned, so serious growers fall back to spreadsheets. We aim to
**execute the fundamentals excellently + add bonsai-native depth + never trap your
data.** The reasoning is evidence-based — see the
[Competitive Benchmark](docs/research/benchmark.md).

## Planned stack (free-first)

| | |
|---|---|
| **App** | Next.js (App Router) + TypeScript, PWA — installable, mobile-first |
| **UI** | Tailwind CSS + shadcn/ui |
| **Backend** | Supabase — Postgres + Auth + Storage, Row-Level Security |
| **Hosting** | Vercel (Hobby, free) |
| **Tests/CI** | Vitest + Playwright + GitHub Actions |

All on free tiers (~€0/mo for personal use). Rationale lives in the
[Architecture Overview](docs/architecture/overview.md) and
[ADRs](docs/decisions/).

## Documentation

Start at the **[Documentation Map](docs/README.md)**. Highlights:
- [Product Brief](docs/product/product-brief.md) · [MVP Scope](docs/product/mvp-scope.md) · [Risks & Assumptions](docs/product/risks-and-assumptions.md)
- [Architecture Overview](docs/architecture/overview.md) · [Domain Model](docs/architecture/domain-model.md) · [Data & Privacy](docs/architecture/data-and-privacy.md)
- [Decision Records (ADRs)](docs/decisions/)
- [Roadmap](docs/roadmap/roadmap.md) · [Sprint 01](docs/roadmap/sprint-01.md) · [Backlog](docs/roadmap/backlog.md)
- [Setup guides](docs/setup/) (click-by-click) · [UX principles](docs/ux/principles.md)

## Getting started (from Milestone M1 onward)

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
