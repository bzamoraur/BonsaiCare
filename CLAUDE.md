# CLAUDE.md — working agreement for this repo

Guidance for Claude Code (and humans) working in Bonsai Companion. Keep this lean
and high-signal; detailed reasoning lives in `docs/`.

## What this is
A personal, production-grade **bonsai care & tracking PWA**. **Phase 1 (MVP) is
shipped and live**; post-audit execution is well underway. Done since the
2026-07-06 audit: Sprint 08 fix-first hardening (S08.1–8.11: encrypted DB backup,
RPC-grant revokes, restore drill), most of M6 daily-driver (batch care,
recency/repeat-last, thumbnails + lightbox, archived view/unarchive, calendar
actions), and the M7 i18n gate — full ES/EN across every friend-facing surface
(next-intl 4, cookie locale, Accept-Language default) — plus durable error
logging (`app_errors` + `/admin`), a 6-digit OTP sign-in fallback, and a B2
off-site photo mirror + delete-path purge. PRs #2–#138 (132 commits). Remaining
before invite: registration allowlist + CAPTCHA and onboarding (M7); then M8
intelligence, M9 offline/sharing. Order still from
`docs/roadmap/improvement-plan.md`; current audit snapshot: `PROJECT_EXPORT.md`
(stale — 2026-07-06); what's armed in prod:
`docs/operations/production-state.md`. Keep this status line current — update it
in the same PR that changes it (this is a Definition-of-Done item for every
milestone-closing PR). Read `docs/product/product-brief.md` and
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
Vercel (Hobby). Tailwind + shadcn/ui. **Reads = Server Components; writes =
Server Actions** (revalidate, no client cache). Validation: hand-rolled pure
parsers for flat forms; **Zod for JSONB payloads** (care `details`, task
`recurrence`) — see ADR-0011. Photos: private bucket, client-compressed WebP,
signed URLs. Full picture: `docs/architecture/overview.md`. Data model:
`docs/architecture/domain-model.md`.

## Where things live
```
src/app/        routes (App Router; (app)/ = authed shell)
src/components/ shared UI (shadcn-based; components/ui/ = primitives)
src/domain/     PURE logic + validators + tests (no React/Supabase)
src/server/     RLS-aware data access (server-only)
src/lib/        supabase clients, env, labels, utils
src/types/      generated DB types (`pnpm gen:types`; CI fails on drift)
src/proxy.ts    Next 16 proxy (session refresh + route gating)
supabase/       migrations/ + tests/ (pgTAP RLS suites)
e2e/            Playwright specs + cookie-capture auth harness (CI-only)
scripts/        ops/utility scripts (icon generation, storage reconcile)
.github/        CI + ops crons (keep-warm, backup [encrypted], photo-backup, sweep, b2-purge)
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
- TS strict; no `any` without a reason. Validate at the Server Action boundary
  (public HTTP surface); Zod for JSONB payloads per ADR-0011.
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
