# Architecture Overview

> Status: v1, 2026-06-26. The system-level picture. Decisions are recorded as
> ADRs in [`docs/decisions/`](../decisions/); this doc ties them together.

## Shape in one paragraph

A **Next.js (App Router) PWA in TypeScript**, deployed on **Vercel**, talking to
**Supabase** (Postgres + Auth + Storage) with **Row-Level Security** enforcing
per-user data isolation. Photos live in a **private Supabase Storage bucket**,
compressed client-side before upload and served via short-lived signed URLs. The
domain logic (scheduling, season/recurrence, overdue calculation) is **pure,
typed, and unit-tested**, deliberately decoupled from React and Supabase so it
can be reused by a future native client. Everything runs on **free tiers**.

## System context

```
   ┌──────────────────────────────────────────────────────────┐
   │  User devices: phone (installed PWA) + desktop browser     │
   └───────────────┬──────────────────────────────────────────┘
                   │ HTTPS
        ┌──────────▼───────────┐        Static + SSR/RSC + API routes
        │   Next.js on Vercel  │  ◀── edge/CDN, instant deploys, free Hobby
        │  (App Router, PWA)   │
        └──────────┬───────────┘
                   │ supabase-js (typed) + RLS-scoped JWT
        ┌──────────▼───────────────────────────────────────────┐
        │                     Supabase                          │
        │  ┌─────────┐  ┌───────────┐  ┌──────────────────────┐ │
        │  │ Postgres│  │   Auth    │  │  Storage (private)   │ │
        │  │  + RLS  │  │ (JWT)     │  │  tree photos         │ │
        │  └─────────┘  └───────────┘  └──────────────────────┘ │
        └───────────────────────────────────────────────────────┘
                   ▲
        ┌──────────┴───────────┐
        │  GitHub Actions CI    │  typecheck · lint · test · build · keep-warm ping
        └───────────────────────┘
```

## Layered structure (inside the app)

We keep a clean separation so the valuable, testable logic doesn't rot inside UI
components or get tied to Supabase.

```
src/
  app/              # Next.js routes (App Router): pages, layouts, route handlers
  components/       # Presentational + composite UI (shadcn/ui based)
  features/         # Feature modules (trees, timeline, tasks, dashboard) —
                    #   UI + hooks + feature-local logic
  domain/           # PURE TypeScript: entities, zod schemas, scheduling/season/
                    #   recurrence/overdue logic. No React, no Supabase. Unit-tested.
  lib/              # Cross-cutting: supabase client, query client, utils, env
  server/           # Server-only: data-access functions, RLS-aware queries
  types/            # Generated Supabase types + shared types
supabase/
  migrations/       # Versioned SQL (schema + RLS policies). Source of truth for DB.
  seed/             # Seed data (a handful of common bonsai species, dev fixtures)
```

**Why `domain/` is isolated:** the season/recurrence/overdue rules are where
correctness matters most (the bug Bonsai Empire shipped) and where a future
native app gets the most reuse. Pure functions are trivial to unit-test.

## The stack, and why (summary — full rationale in ADRs)

| Layer | Choice | One-line rationale | ADR |
|---|---|---|---|
| Platform | **PWA (web-first, installable)** | Free, single codebase, fastest to prod, no $99/yr Apple tax; native path preserved. | [0001](../decisions/0001-platform-pwa-first.md) |
| Framework | **Next.js + TypeScript** | Mature, great DX, SSR/RSC, first-class on Vercel, end-to-end types. | [0004](../decisions/0004-frontend-stack.md) |
| UI | **Tailwind + shadcn/ui** | Own-your-components, accessible primitives, calm/custom look (not generic admin). | [0004](../decisions/0004-frontend-stack.md) |
| Data/state | **TanStack Query** + supabase-js | Robust server-state caching, offline-tolerant. | [0004](../decisions/0004-frontend-stack.md) |
| Forms/validation | **react-hook-form + Zod** | Typed, shared validation between client and domain. | [0004](../decisions/0004-frontend-stack.md) |
| Backend | **Supabase (Postgres+Auth+Storage)** | Relational fits the domain; RLS for privacy; generous free tier; less lock-in than Firebase. | [0002](../decisions/0002-backend-supabase.md) |
| Hosting | **Vercel (Hobby, free)** | Best Next.js DX, instant deploys. Commercial → Pro/Cloudflare (documented). | [0003](../decisions/0003-hosting-vercel.md) |
| Tests | **Vitest + Testing Library + Playwright** | Unit for domain, component, e2e for critical flows. | [testing-strategy](../development/testing-strategy.md) |
| CI | **GitHub Actions** | Free quality gate + keep-warm ping. | — |

## Cross-cutting concerns

- **Auth:** Supabase Auth, email magic-link first (no passwords to leak), OAuth
  optional later. Session persisted; no forced re-login (a competitor pain).
- **Authorization / privacy:** Postgres RLS — every owned row carries `owner_id`;
  policies restrict `select/insert/update/delete` to `auth.uid()`. The client
  *cannot* read another user's data even if the UI has a bug. See
  [data-and-privacy](./data-and-privacy.md).
- **Photos:** private bucket; client compresses/resizes (e.g.
  `browser-image-compression`) to protect the 1 GB free budget; access via
  signed URLs scoped to the owner.
- **Validation & integrity:** Zod at the edges + DB constraints + RLS. Domain
  invariants (cover photo belongs to tree, season-window skips) enforced in
  `domain/` and tested.
- **Config/secrets:** all via env vars, documented in
  [`.env.example`](../../.env.example) and
  [setup/05](../setup/05-environment-variables.md). Nothing secret in the repo.
- **Data ownership:** CSV/JSON export from early on (anti-lock-in trust feature).
- **Observability (MVP-light):** Vercel logs + Supabase logs; add lightweight
  error reporting (e.g. Sentry free) only if needed.

## Future-proofing (without over-building now)

- **Native path:** because `domain/` is pure and the backend is plain
  Postgres/REST, a future **Capacitor** wrap (fastest) or **Expo** app can reuse
  the data layer and logic. We do *not* build for this now beyond keeping the
  separation clean.
- **Species-care engine:** the `species` table + `default_care` JSONB is the
  reserved seam; category-level rules ship first.
- **Scale:** Postgres + RLS scales far beyond personal use; the free→paid path is
  documented in [cost-model](../operations/cost-model.md).
