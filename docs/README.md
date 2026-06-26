# Documentation Map

Everything that explains *what* we're building, *why*, and *how*. New
significant decisions get an ADR; new scope gets reflected in the product docs;
manual steps get a click-by-click setup guide.

## 🧭 Start here
1. [Product Brief](product/product-brief.md) — vision, users, value, principles.
2. [MVP Scope](product/mvp-scope.md) — what's in / out and why.
3. [Architecture Overview](architecture/overview.md) — the system at a glance.
4. [Roadmap](roadmap/roadmap.md) — the phased plan.

## 📦 Product
- [Product Brief](product/product-brief.md)
- [MVP Scope](product/mvp-scope.md)
- [Risks, Assumptions & Open Questions](product/risks-and-assumptions.md)

## 🔬 Research
- [Competitive & Product Benchmark](research/benchmark.md)
- [Tooling & Accelerator Evaluation](research/accelerators-evaluation.md)

## 🏗️ Architecture
- [Overview](architecture/overview.md)
- [Domain Model](architecture/domain-model.md)
- [Data, Security & Privacy](architecture/data-and-privacy.md)

## 🧾 Decisions (ADRs)
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

## 🎨 UX
- [Principles & Visual Direction](ux/principles.md)
- [Information Architecture & Key Flows](ux/information-architecture.md)

## 🗺️ Roadmap
- [Roadmap (phased)](roadmap/roadmap.md)
- [Sprint 01 — Skeleton & Spine](roadmap/sprint-01.md)
- [Backlog](roadmap/backlog.md)

## 🛠️ Setup (click-by-click)
- [00 — Developer Onboarding & Handover (VS Code + Claude Code)](setup/00-developer-onboarding-and-handover.md) ⭐ start here to build locally
- [01 — Prerequisites & Local Dev](setup/01-prerequisites-and-local-dev.md)
- [02 — Supabase Project (DB, auth, storage, migrations)](setup/02-supabase-project.md)
- [03 — Deploy to Vercel](setup/03-vercel-deploy.md)
- [04 — Environment Variables Reference](setup/04-environment-variables.md)
- [05 — Claude Code Accelerators](setup/05-claude-code-accelerators.md)

## ⚙️ Operations
- [Cost Model](operations/cost-model.md)
- [Runbook](operations/runbook.md)

## 👩‍💻 Development
- [Workflow & Conventions](development/workflow.md)
- [Testing Strategy](development/testing-strategy.md)

---
*Conventions for these docs: prefer primary sources; separate facts from
assumptions; keep ADRs immutable once accepted (supersede, don't rewrite).*
