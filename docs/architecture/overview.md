# Architecture Overview

> **Status:** Current · **Updated:** 2026-07-12
>
> The system-level picture. Decisions are recorded as ADRs in
> [`docs/decisions/`](../decisions/); this doc ties them together.

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
  app/              # Next.js routes (App Router): pages, layouts, route handlers,
                    #   Server Actions ((app)/ = the authenticated shell)
  components/       # Presentational + composite UI (shadcn/ui based)
  domain/           # PURE TypeScript: validators, scheduling/season/recurrence/
                    #   overdue logic. No React, no Supabase. Unit-tested.
  lib/              # Cross-cutting: supabase clients, env, labels, utils
  server/           # Server-only: data-access functions, RLS-aware queries
  types/            # Generated Supabase types + shared types
  proxy.ts          # Next 16 proxy: session refresh + route gating
supabase/
  migrations/       # Versioned SQL (schema + RLS policies + seeds). DB source of truth.
  tests/            # pgTAP RLS isolation suites (run by `supabase test db` in CI)
```

**Why `domain/` is isolated:** the season/recurrence/overdue rules are where
correctness matters most (the bug Bonsai Empire shipped) and where a future
native app gets the most reuse. Pure functions are trivial to unit-test.

## The stack, and why

Summary — full rationale in the ADRs.

| Layer | Choice | One-line rationale | ADR |
|---|---|---|---|
| Platform | **PWA (web-first, installable)** | Free, single codebase, fastest to prod, no $99/yr Apple tax; native path preserved. | [0001](../decisions/0001-platform-pwa-first.md) |
| Framework | **Next.js + TypeScript** | Mature, great DX, SSR/RSC, first-class on Vercel, end-to-end types. | [0004](../decisions/0004-frontend-stack.md) |
| UI | **Tailwind + shadcn/ui** | Own-your-components, accessible primitives, calm/custom look (not generic admin). | [0004](../decisions/0004-frontend-stack.md) |
| Data/state | **TanStack Query** + supabase-js | Robust server-state caching, offline-tolerant. *Shipped instead: Server Components + Server Actions — [ADR-0011](../decisions/0011-server-actions-and-validation.md).* | [0004](../decisions/0004-frontend-stack.md) |
| Forms/validation | **react-hook-form + Zod** | Typed, shared validation between client and domain. *Shipped instead: hand-rolled flat-form validation, with Zod scoped to JSONB payloads — [ADR-0011](../decisions/0011-server-actions-and-validation.md).* | [0004](../decisions/0004-frontend-stack.md) |
| Backend | **Supabase (Postgres+Auth+Storage)** | Relational fits the domain; RLS for privacy; generous free tier; less lock-in than Firebase. | [0002](../decisions/0002-backend-supabase.md) |
| Hosting | **Vercel (Hobby, free)** | Best Next.js DX, instant deploys. Commercial → Pro/Cloudflare (documented). | [0003](../decisions/0003-hosting-vercel.md) |
| Tests | **Vitest + Testing Library + Playwright** | Unit for domain, component, e2e for critical flows. | [testing-strategy](../development/testing-strategy.md) |
| CI | **GitHub Actions** | Free quality gate + keep-warm ping. | — |

## Cross-cutting concerns

- **Auth:** Supabase Auth, **email magic-link** — live since M1 (no passwords to
  leak; OAuth remains a Phase 2 option — [ADR-0010](../decisions/0010-auth-magic-link-first.md)).
  Session persisted; no forced re-login (a competitor pain). A **6-digit OTP
  code** is an additive fallback for contexts where the magic link opens in a
  different browser and breaks the PKCE handshake (e.g. iPhone in-app browsers);
  the sign-up/magic-link emails now carry both a link and a code.
- **Internationalization:** the UI ships **bilingual (English + Spanish)** via
  next-intl 4 with a cookie-stored locale (no URL routing); pre-login locale is
  inferred from `Accept-Language`. `messages/en.json` + `messages/es.json` are
  held at parity by a guard test; all friend-facing surfaces (login, settings,
  today, collection, calendar, plan, quick-log, tree/care/task forms,
  tree-detail, error boundaries, enum label maps) are translated.
- **Offline:** installable + offline-*tolerant* (cached app shell via the service
  worker). **Not** offline-first with sync in MVP — a deliberate scope choice
  ([mvp-scope](../product/mvp-scope.md)).
- **Authorization / privacy:** Postgres RLS — every owned row carries `owner_id`;
  policies restrict `select/insert/update/delete` to `auth.uid()`. The client
  *cannot* read another user's data even if the UI has a bug. See
  [data-and-privacy](./data-and-privacy.md).
- **Photos:** private bucket; client compresses/resizes (e.g.
  `browser-image-compression`) to protect the 1 GB free budget; access via
  signed URLs scoped to the owner.
- **Validation & integrity:** validation at the Server Action boundary
  (hand-rolled pure parsers for flat forms; Zod for JSONB payloads —
  [ADR-0011](../decisions/0011-server-actions-and-validation.md)) + DB
  constraints + RLS. Domain invariants (cover photo belongs to tree,
  season-window skips) enforced in `domain/` and tested.
- **Config/secrets:** all via env vars, documented in
  [`.env.example`](../../.env.example) and
  [setup/04](../setup/04-environment-variables.md). Nothing secret in the repo.
- **Data ownership:** CSV/JSON export from early on (anti-lock-in trust feature).
- **Observability (MVP-light):** Vercel logs + Supabase logs, plus a durable,
  PII-poor **`app_errors`** log (client-boundary + server errors) the owner
  reads on `/admin` — the interim record until a hosted tool (e.g. Sentry) is
  worth adding. See [data-and-privacy](./data-and-privacy.md).

## Future-proofing (without over-building now)

- **Native path:** because `domain/` is pure and the backend is plain
  Postgres/REST, a future **Capacitor** wrap (fastest) or **Expo** app can reuse
  the data layer and logic. We do *not* build for this now beyond keeping the
  separation clean.
- **Species-care engine:** the `species` table + `default_care` JSONB is the
  reserved seam; category-level rules ship first.
- **Scale:** Postgres + RLS scales far beyond personal use; the free→paid path is
  documented in [cost-model](../operations/cost-model.md).
