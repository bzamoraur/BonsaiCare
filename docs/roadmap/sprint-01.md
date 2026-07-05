# Sprint 01 — Skeleton & Spine (Milestone M1)

> **Status:** Historical · **Updated:** 2026-07-05
>
> **Outcome: shipped in full (PRs #2–#7, merged by 2026-07-03).** Magic-link
> auth, the gated app shell with 5-tab navigation, the core schema with
> owner-scoped RLS proven by a 29-assertion pgTAP suite, CI (typecheck / lint /
> unit tests / build + a real-Postgres RLS job), and production deploys on
> Vercel. Deviations from plan: the service worker is a small hand-rolled
> `sw.js` (Serwist deferred — not yet needed); 15 species seeded instead of ~10;
> Settings shipped with display name in addition to hemisphere + units.

## Sprint goal

> Sign in with a magic link, land on an empty "Today" dashboard, with the core
> schema + RLS live in Supabase, CI green, and a working Vercel preview — proving
> the whole stack end-to-end before building features.

## Definition of done (sprint)

- [x] CI (typecheck, lint, unit test, build) green on `main`.
- [x] App deploys to a Vercel preview from a PR and to production from `main`.
- [x] A user can sign in (magic link) and is gated out of the app shell otherwise.
- [x] Core tables exist via migrations with **RLS enabled and a test proving user
      B cannot read user A's rows**.
- [x] `.env.example` complete; setup docs followed start-to-finish once, fixing
      any gaps found.

## Tasks (as executed)

### Scaffolding
- [x] `create-next-app` (App Router, TS strict, ESLint). Add Prettier,
      lint-staged + Husky pre-commit.
- [x] Tailwind + shadcn/ui init; base theme tokens (light/dark) per
      [ux/principles](../ux/principles.md).
- [x] PWA: manifest + service worker (hand-rolled `sw.js`); installable; app icons.
- [x] Vitest + Testing Library + Playwright configured with one trivial test each.
- [x] `.github/workflows/ci.yml`: install → typecheck → lint → test → build.

### Backend (Supabase)
- [x] Create Supabase project (**EU region**) — followed
      [setup/02](../setup/02-supabase-project.md).
- [x] Supabase CLI; `supabase/migrations/…_init.sql`: `profiles`, `species`,
      `locations`, `trees`, `tags`, `tree_tags`.
- [x] Enable **RLS** + owner policies on every owned table
      ([data-and-privacy](../architecture/data-and-privacy.md)).
- [x] Trigger to auto-create a `profiles` row on new `auth.users`.
- [x] Seed 15 common bonsai species (global rows).
- [x] Generate typed client (`supabase gen types typescript`) into `src/types`.

### App shell & auth
- [x] supabase-js client (browser + server helpers); env wiring via `lib/env`.
- [x] Magic-link sign-in + callback; session persistence; protected layout
      (Next 16 `proxy.ts`).
- [x] 5-destination navigation skeleton (Today, Collection, Calendar, +, Settings)
      with empty states.
- [x] Settings: hemisphere + units (+ display name) form writing to `profiles`.

### Quality gates
- [x] RLS isolation test (two users, cross-read denied) — 29 pgTAP assertions.
- [x] Domain package bootstrapped (`src/domain`) with the first pure function +
      unit test (`isOverdue(task, today)`).

## Explicitly NOT in this sprint
Trees CRUD UI, photos, timeline, tasks UI, dashboard logic — those are M2–M4.
This sprint only proved the spine.

## Risks watched this sprint
- Supabase free-tier **pause** (R1) — keep-warm ping set up (`keep-warm.yml`);
  live firing still to be verified in M5.
- Getting RLS right is subtle — the isolation test was written alongside the
  schema and runs against real Postgres in CI.
- EU region chosen at creation ✓.
