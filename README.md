# 🌳 Bonsai Companion

A calm, photo-first companion for tracking, maintaining, and learning from a real
bonsai collection — built to be genuinely pleasant to use, not a generic CRUD
admin panel.

> **Status: Phase 1 (MVP) shipped; friends-release hardening largely done**
> *(updated 2026-07-12)*. On top of M1–M5, the post-audit
> [improvement plan](docs/roadmap/improvement-plan.md) has largely landed: Sprint
> 08 fix-first hardening (encrypted DB backup, RPC-grant revokes, honest offline
> page, restore drill), most of the M6 daily-driver pass (batch care, recency
> chips + repeat-last, thumbnails + lightbox, archived view/unarchive, inline
> calendar actions), full ES/EN Spanish i18n across every friend-facing surface
> (next-intl 4, cookie locale, Accept-Language default), durable error logging
> (`app_errors` + `/admin`), a 6-digit OTP sign-in fallback, and an off-site B2
> photo mirror with delete-path purge — PRs #2–#138 (132 commits). Next: the
> remaining friends-release gates (registration allowlist + CAPTCHA, onboarding),
> then the invite. Current audit snapshot:
> [PROJECT_EXPORT.md](PROJECT_EXPORT.md) — stale (2026-07-06), regenerate.

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
