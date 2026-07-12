# Documentation Map

Everything that explains *what* we're building, *why*, and *how*. New
significant decisions get an ADR; new scope gets reflected in the product docs;
manual steps get a click-by-click setup guide. All docs follow the
[Style Guide](STYLE-GUIDE.md).

## Start here

1. [Product Brief](product/product-brief.md) — vision, users, value, principles.
2. [MVP Scope](product/mvp-scope.md) — what's in / out and why.
3. [Architecture Overview](architecture/overview.md) — the system at a glance.
4. [Roadmap](roadmap/roadmap.md) — the phased plan and where we are.

## Product

- [Product Brief](product/product-brief.md)
- [MVP Scope](product/mvp-scope.md)
- [Risks, Assumptions & Open Questions](product/risks-and-assumptions.md)

## Research

- [Competitive & Product Benchmark](research/benchmark.md)
- [Tooling & Accelerator Evaluation](research/accelerators-evaluation.md)

## Architecture

- [Overview](architecture/overview.md)
- [Domain Model](architecture/domain-model.md)
- [Data, Security & Privacy](architecture/data-and-privacy.md)

## Decisions (ADRs)

- [0000 — ADR process](decisions/0000-adr-process.md)
- [0001 — PWA-first platform](decisions/0001-platform-pwa-first.md)
- [0002 — Supabase backend](decisions/0002-backend-supabase.md)
- [0003 — Vercel hosting](decisions/0003-hosting-vercel.md)
- [0004 — Frontend stack](decisions/0004-frontend-stack.md)
- [0005 — Unified timeline event model](decisions/0005-unified-timeline-event-model.md)
- [0006 — Task scheduling & recurrence](decisions/0006-task-scheduling-and-recurrence.md)
- [0007 — Notifications strategy](decisions/0007-notifications-strategy.md)
- [0008 — Data ownership & export](decisions/0008-data-ownership-and-export.md)
- [0009 — Licensing (proprietary for now)](decisions/0009-licensing-proprietary-for-now.md)
- [0010 — Auth via email magic-link first](decisions/0010-auth-magic-link-first.md)
- [0011 — Server Actions & validation scope](decisions/0011-server-actions-and-validation.md)
- [0012 — Care events are calendar dates](decisions/0012-care-dates-are-calendar-dates.md)
- [0013 — Error observability (interim in-DB log)](decisions/0013-error-observability-interim.md)
- [0014 — Off-site delete purge queue](decisions/0014-offsite-delete-purge-queue.md)
- [0015 — OTP code sign-in fallback (amends ADR-0010)](decisions/0015-otp-code-sign-in-fallback.md)
- [0016 — Internationalization (next-intl 4, cookie locale)](decisions/0016-i18n-next-intl-cookie-locale.md)

## UX

- [Principles & Visual Direction](ux/principles.md)
- [Information Architecture & Key Flows](ux/information-architecture.md)

## Roadmap & sprints

- [Roadmap (phased, with current status)](roadmap/roadmap.md)
- [Improvement plan (post-M5 execution order, from the milestone audit)](roadmap/improvement-plan.md)
- [Backlog (stories, features, tech-debt register)](roadmap/backlog.md)
- [Going-public plan (app-store publication, security, monetization research)](roadmap/going-public-plan.md)
- [Knowledge & collection modules plan](roadmap/knowledge-and-collection-plan.md)
- [Scaling-readiness (indexing / cache / async ground-truth)](roadmap/scaling-readiness.md)
- Sprints (all shipped ✅): [01 — Skeleton & Spine](roadmap/sprint-01.md) ·
  [02 — Log care, fast](roadmap/sprint-02.md) ·
  [03 — The tree's story](roadmap/sprint-03.md) ·
  [04 — A schedule you can trust](roadmap/sprint-04.md) ·
  [05 — The daily loop](roadmap/sprint-05.md) ·
  [06 — Own your data](roadmap/sprint-06.md) ·
  [07 — Ready to trust daily](roadmap/sprint-07.md)
- Audit snapshot: [PROJECT_EXPORT.md](../PROJECT_EXPORT.md) (regenerated each
  milestone; previous editions in [archive/](archive/))

## Setup (click-by-click)

- [00 — Developer Onboarding & Handover](setup/00-developer-onboarding-and-handover.md) *(historical — the handover is complete)*
- [01 — Prerequisites & Local Dev](setup/01-prerequisites-and-local-dev.md)
- [02 — Supabase Project (DB, auth, storage, migrations)](setup/02-supabase-project.md)
- [03 — Deploy to Vercel](setup/03-vercel-deploy.md)
- [04 — Environment Variables Reference](setup/04-environment-variables.md)
- [05 — Claude Code Accelerators](setup/05-claude-code-accelerators.md)

## Operations

- [Cost Model](operations/cost-model.md)
- [Runbook](operations/runbook.md)

## Development

- [Workflow & Conventions](development/workflow.md)
- [Testing Strategy](development/testing-strategy.md)
- [Documentation Style Guide](STYLE-GUIDE.md)

## Archive

- [2026-07-05 — Project export / repo audit snapshot](archive/2026-07-05-project-export.md)

## Conventions for these docs

Prefer primary sources; separate facts from assumptions; keep ADRs immutable
once accepted (supersede, don't rewrite); update status lines in the same PR
that changes the status. Full rules: the [Style Guide](STYLE-GUIDE.md).
