# Setup 01 — Prerequisites & Local Development

> Audience: the owner / a developer setting up from scratch. Written for someone
> who is technical but new to *this* project. Follow top to bottom.
>
> ⚠️ **UI drift note:** Supabase, Vercel, and GitHub change their dashboards
> often. If a button label differs from this guide, look for the nearest
> equivalent — **the values you enter are what matter**, not the exact pixel.

## Purpose
Get the project running on your machine, with all tooling, so you can develop and
test locally before anything is deployed.

## What you need installed

| Tool | Version | Why | Install |
|---|---|---|---|
| **Node.js** | 20 LTS or 22 LTS | Runs Next.js & tooling | https://nodejs.org (or `nvm install --lts`) |
| **pnpm** | 9+ | Package manager (fast, disk-efficient) | `npm install -g pnpm` |
| **Git** | any recent | Version control | https://git-scm.com |
| **Supabase CLI** | latest | Local DB, migrations, type generation | https://supabase.com/docs/guides/cli |
| **GitHub account** | — | Hosts the repo; logs into Supabase/Vercel | https://github.com |

> We standardize on **pnpm**. If you prefer npm/yarn, that's fine, but the docs
> and lockfile assume pnpm.

**Verify each:**
```bash
node -v      # v20.x or v22.x
pnpm -v      # 9.x+
git --version
supabase --version
```

## First-time local setup

> Note: until **Sprint 01 (M1)** scaffolds the app, the `src/` app won't exist
> yet — this section is the steady-state workflow you'll use from M1 onward.

```bash
# 1. Clone (replace with your repo URL)
git clone https://github.com/<you>/BonsaiCare.git
cd BonsaiCare

# 2. Install dependencies
pnpm install

# 3. Create your local env file from the template
cp .env.example .env.local
#    Then fill in the values — see docs/setup/04-environment-variables.md

# 4. (Option A) Run against a hosted Supabase project (simplest)
#    Put your project's URL + anon key in .env.local, then:
pnpm dev
#    App at http://localhost:3000

# 4. (Option B) Run a fully local Supabase stack (no internet needed)
supabase start                 # boots local Postgres/Auth/Storage in Docker
supabase db reset              # applies migrations + seed
#    Copy the printed local API URL + anon key into .env.local, then:
pnpm dev
```

## Everyday commands (available from M1)

```bash
pnpm dev            # run the app locally
pnpm test           # unit tests (Vitest)
pnpm test:e2e       # end-to-end (Playwright)
pnpm lint           # ESLint
pnpm typecheck      # tsc --noEmit
pnpm build          # production build (what CI runs)

supabase migration new <name>   # create a new migration
supabase db reset               # re-apply all migrations + seed locally
supabase gen types typescript --local > src/types/database.ts
```

## Common errors & fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `supabase start` fails | Docker not running | Start Docker Desktop; retry. |
| App loads but auth/db calls 401/empty | Wrong/missing env vars | Re-check `.env.local` against [setup/04](./04-environment-variables.md); restart `pnpm dev` after edits. |
| Types out of date after a migration | Forgot to regenerate | Re-run the `gen types` command above. |
| `pnpm: command not found` | pnpm not installed/PATH | `npm i -g pnpm`, reopen terminal. |

## How to verify success
- `pnpm dev` serves http://localhost:3000 without errors.
- You can sign in (magic link) and reach the empty dashboard.
- `pnpm test` and `pnpm typecheck` pass.

## Rollback / reset
- Local DB wrong? `supabase db reset` rebuilds it from migrations + seed.
- Dependencies broken? delete `node_modules` and `pnpm-lock.yaml`, `pnpm install`.
- Never commit `.env.local` (it's git-ignored). If you accidentally do, rotate the
  keys (see [data-and-privacy](../architecture/data-and-privacy.md)).
