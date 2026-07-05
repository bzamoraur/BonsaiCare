# Setup 04 — Environment Variables Reference

> **Status:** Current · **Updated:** 2026-07-05

> The single reference for every env var. Mirrors [`.env.example`](../../.env.example).
> **Secrets never go in the repo** — only in `.env.local` (git-ignored), Vercel
> project settings, and GitHub Action secrets.

## The variables

| Variable | Public? | Where used | Value / source |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Public** (shipped to browser) | client + server | Supabase → **Connect** button (or Settings → Data API) → **Project URL** (`https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Public** | client + server | Supabase → Settings → **API Keys** → **Publishable** key (`sb_publishable_…`). Safe in the browser **because RLS constrains it** — never rely on it being secret. |
| `NEXT_PUBLIC_SITE_URL` | **Public** | auth redirects, absolute URLs | `http://localhost:3000` locally; your prod URL in prod. |
| `SUPABASE_SECRET_KEY` | **SECRET — server only** | server only (avoid unless required) | Supabase → Settings → **API Keys** → **Secret** key (`sb_secret_…`). **Bypasses RLS** — keep out of the browser bundle and out of git. MVP tries to avoid needing it. |
| `SUPABASE_PROJECT_REF` | local/CI only | Supabase CLI, keep-warm | Supabase → Settings → General → **Reference ID**. |
| `SUPABASE_ACCESS_TOKEN` | **SECRET — local/CI** | Supabase CLI auth | Created by `supabase login` / Supabase account tokens. Used for CLI & type-gen in CI. |

> Naming rule: **`NEXT_PUBLIC_` is a promise that the value is public** (Next.js
> inlines it into the client bundle). Never prefix a secret with `NEXT_PUBLIC_`.

## Where each lives

| Location | Which vars | How |
|---|---|---|
| `.env.local` (your machine, git-ignored) | the `NEXT_PUBLIC_*` + any you need locally | `cp .env.example .env.local` then fill in. |
| **Vercel** → Project → Settings → Environment Variables | `NEXT_PUBLIC_*` (+ `SUPABASE_SECRET_KEY` only if used) | set per environment (Prod/Preview). |
| **GitHub** → repo → Settings → Secrets and variables → Actions | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, keep-warm URL + publishable key | used by CI & the keep-warm workflow. |

## Common errors & fixes
- Putting a secret behind `NEXT_PUBLIC_` → it leaks to every visitor. Don't.
- Forgetting to set vars for the **Preview** environment in Vercel → preview
  deploys can't reach Supabase.
- Editing `.env.local` and not restarting `pnpm dev` → changes not picked up.
- Committing `.env.local` → if it happens, **rotate the keys** immediately.

## How to verify success
- `pnpm dev` connects to Supabase (you can sign in and read/write).
- A Vercel preview build succeeds and reaches Supabase.
- No secret value appears in the browser dev-tools "Sources"/network (only the
  publishable key + public URL should be visible client-side).
