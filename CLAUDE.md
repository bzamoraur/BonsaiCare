# CLAUDE.md — working agreement for this repo

Guidance for Claude Code (and humans) working in Bonsai Companion. Keep this lean
and high-signal; detailed reasoning lives in `docs/`.

## What this is
A personal, production-grade **bonsai care & tracking PWA**. Currently in
**Phase 0 (foundation)** — docs only, **no app code yet**. Building starts at
`docs/roadmap/sprint-01.md`. Read `docs/product/product-brief.md` and
`docs/architecture/overview.md` before non-trivial work.

## Golden rules (don't violate without an ADR)
1. **Scope discipline.** Build only what's in `docs/product/mvp-scope.md`. New
   ideas → `docs/roadmap/backlog.md`, not into the current milestone.
2. **Free-first.** Default to free tiers and local dev. Any paid choice needs
   justification + an ADR (`docs/decisions/`) per the cost policy.
3. **Privacy by construction.** Every user-owned table has `owner_id` + **RLS
   enabled with tested policies**. A user must never read another's data. The
   `sb_secret_` (secret) key is server-only, never in the client bundle or git.
4. **Domain logic is pure and isolated** in `src/domain/` (no React/Supabase) and
   **unit-tested** — especially season/recurrence/overdue logic. Data access
   lives in `src/server/` (RLS-aware), not in components.
5. **No secrets in the repo.** Env vars only; documented in `.env.example` +
   `docs/setup/04-environment-variables.md`. `NEXT_PUBLIC_` = public by promise.
6. **Reliability over cleverness.** The pull-based dashboard is the source of
   truth, not notifications (see ADR-0007).
7. **Never trap the user's data.** Export must keep working (ADR-0008). No dark
   patterns, ever.

## Architecture in one breath
Next.js (App Router, TS strict) PWA → Supabase (Postgres + Auth + Storage, RLS) →
Vercel (Hobby). Tailwind + shadcn/ui, TanStack Query, react-hook-form + Zod.
Photos: private bucket, client-compressed, signed URLs. Full picture:
`docs/architecture/overview.md`. Data model: `docs/architecture/domain-model.md`.

## Where things live (from M1)
```
src/app/        routes (App Router)        src/domain/   PURE logic + Zod + tests
src/components/ shared UI (shadcn-based)    src/server/   RLS-aware data access
src/features/   feature modules            src/lib/      supabase client, env, utils
src/types/      generated DB types         supabase/     migrations/ + seed/
```

## Core domain concepts (use this language)
- **Tree** (central aggregate), organized by `development_stage`, `location`, tags.
- **Species *category*** (conifer/deciduous/tropical/broadleaf-evergreen) is the
  master variable that drives scheduling — not a big species DB.
- **care_log_entry** = unified *past* timeline event (typed core + validated JSONB
  `details`), ADR-0005. **task** = *future* intention with simple editable
  recurrence (interval + season window), ADR-0006. Keep past/future separate.
- **photo** belongs to a tree, optionally to an event; timeline merges them by date.

## Conventions
- TS strict; no `any` without a reason. Zod at boundaries; infer types from it.
- Small, single-purpose files & PRs. Conventional commits. No giant files.
- Make failure modes explicit; validate inputs; no silent catches.
- Significant decision → write an ADR (`docs/decisions/`, template in ADR-0000).
- Follow `docs/development/workflow.md` (Definition of Done) and
  `docs/development/testing-strategy.md` (test the risky domain logic + RLS).
- UX bar: calm, photo-first, low-friction, accessible — `docs/ux/principles.md`.

## Before declaring a task done
typecheck + lint + tests pass · tests added for non-trivial logic · docs/ADRs
updated · no secrets · tech debt logged in backlog · production-oriented not demo.

## AI/MCP safety
The Supabase MCP has a prompt-injection/exfiltration risk: **dev project,
read-only, single-project scope only — never production write.** Prefer CLI
migrations over agent-driven DB changes. See
`docs/architecture/data-and-privacy.md`.
