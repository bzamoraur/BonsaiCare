# Sprint 01 — Skeleton & Spine (Milestone M1)

> Status: planned. The first concrete build sprint, executed **after** Phase 0
> foundation is agreed. Goal: a deployed, authenticated, empty-but-correct app
> with the database schema, RLS, and CI in place — the spine everything hangs on.

## Sprint goal

> Sign in with a magic link, land on an empty "Today" dashboard, with the core
> schema + RLS live in Supabase, CI green, and a working Vercel preview — proving
> the whole stack end-to-end before building features.

## Definition of done (sprint)

- [ ] CI (typecheck, lint, unit test, build) green on `main`.
- [ ] App deploys to a Vercel preview from a PR and to production from `main`.
- [ ] A user can sign in (magic link) and is gated out of the app shell otherwise.
- [ ] Core tables exist via migrations with **RLS enabled and a test proving user
      B cannot read user A's rows**.
- [ ] `.env.example` complete; setup docs followed start-to-finish once, fixing
      any gaps found.

## Tasks (suggested issue breakdown)

### Scaffolding
- [ ] `create-next-app` (App Router, TS strict, ESLint). Add Prettier,
      lint-staged + Husky pre-commit.
- [ ] Tailwind + shadcn/ui init; base theme tokens (light/dark) per
      [ux/principles](../ux/principles.md).
- [ ] PWA: manifest + service worker (Serwist/next-pwa); installable; app icons.
- [ ] Vitest + Testing Library + Playwright configured with one trivial test each.
- [ ] `.github/workflows/ci.yml`: install → typecheck → lint → test → build.

### Backend (Supabase)
- [ ] Create Supabase project (**EU region**) — follow
      [setup/02](../setup/02-supabase-project.md).
- [ ] Supabase CLI; `supabase/migrations/0001_init.sql`: `profiles`, `species`,
      `locations`, `trees`, `tags`, `tree_tags`.
- [ ] Enable **RLS** + owner policies on every owned table
      ([data-and-privacy](../architecture/data-and-privacy.md)).
- [ ] Trigger to auto-create a `profiles` row on new `auth.users`.
- [ ] Seed ~10 common bonsai species (global rows).
- [ ] Generate typed client (`supabase gen types typescript`) into `src/types`.

### App shell & auth
- [ ] supabase-js client (browser + server helpers); env wiring via `lib/env`.
- [ ] Magic-link sign-in + callback; session persistence; protected layout.
- [ ] 5-destination navigation skeleton (Today, Collection, Calendar, +, Settings)
      with empty states.
- [ ] Settings: hemisphere + units form writing to `profiles`.

### Quality gates
- [ ] RLS isolation test (two users, cross-read denied).
- [ ] Domain package bootstrapped (`src/domain`) with the first pure function +
      unit test (e.g. `isOverdue(task, today)`).

## Explicitly NOT in this sprint
Trees CRUD UI, photos, timeline, tasks UI, dashboard logic — those are M2–M4.
This sprint only proves the spine.

## Risks to watch this sprint
- Supabase free-tier **pause** (R1) — set up the keep-warm ping early.
- Getting RLS right is subtle — write the isolation test *first*.
- EU region must be chosen at creation (can't be changed later).
