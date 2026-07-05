# Setup 03 — Deploy to Vercel

> **Status:** Current · **Updated:** 2026-07-05

> Audience: non-expert owner. This was done at the end of Sprint 01 — the app
> deploys to production from `main` on every merge. Follow these steps only to
> recreate the Vercel project from scratch. Vercel **Hobby** is free for
> non-commercial use ([ADR-0003](../decisions/0003-hosting-vercel.md)).
>
> ⚠️ **UI drift note:** labels may change; match the *values*, not the pixels.

## Purpose
Put the app on the internet (a URL you can install on your phone), with automatic
deploys from GitHub and per-PR preview deployments.

## Steps

1. Go to **https://vercel.com** → **Sign Up / Log In** → **Continue with GitHub**.
2. **Add New… → Project.** Vercel lists your GitHub repos. If `BonsaiCare` isn't
   shown, click **Adjust GitHub App Permissions** / **Import Git Repository** and
   grant Vercel access to the repo.
3. Select **BonsaiCare** → **Import**.
4. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected).
   - **Root Directory:** leave as repo root (unless the app lives in a subfolder).
   - **Build & Output:** defaults are correct for Next.js (`pnpm build`). Vercel
     auto-detects pnpm from the lockfile.
5. **Environment Variables** — add these (from [setup/04](./04-environment-variables.md)):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = your publishable key (`sb_publishable_…`)
   - `NEXT_PUBLIC_SITE_URL` = your production URL (set after first deploy; see
     below)
   - *(only if the server actually needs it)* `SUPABASE_SECRET_KEY` = secret
     (`sb_secret_…`) — add as a **non-`NEXT_PUBLIC`** variable so it stays server-only.
   - Set each for the appropriate environments (Production / Preview / Development).
6. Click **Deploy**. Wait for the build. You'll get a URL like
   `https://bonsai-companion.vercel.app`.
7. **Close the loop on auth + site URL:**
   - Copy your new production URL into `NEXT_PUBLIC_SITE_URL` (Vercel → Project →
     Settings → Environment Variables) and **redeploy**.
   - In **Supabase → Auth → URL Configuration**, set **Site URL** to the
     production URL and add it to **Redirect URLs** (`https://<domain>/**`).
     Otherwise magic-link sign-in will fail in production.
8. *(Optional)* **Custom domain:** Project → **Settings → Domains** → add your
   domain and follow the DNS instructions. Update the Supabase URLs and
   `NEXT_PUBLIC_SITE_URL` to match.

## Automatic deploys (how it works after setup)
- Push to `main` → **production** deploy.
- Open a PR → a **preview** deploy with its own URL (great for reviewing each
  milestone before merge).

## Common errors & fixes

| Symptom | Cause | Fix |
|---|---|---|
| Build fails on Vercel but works locally | Missing env var at build time, or Node version mismatch | Add the env vars (step 5); set Node version via `engines` in `package.json` if needed. |
| App loads but can't reach Supabase | `NEXT_PUBLIC_SUPABASE_*` not set for that environment | Add them for Production **and** Preview; redeploy. |
| Magic link fails only in production | Prod URL not in Supabase redirect URLs / wrong `NEXT_PUBLIC_SITE_URL` | Fix both (step 7). |
| "This deployment is for non-commercial use" concerns | Hobby plan terms | Personal/trusted use is fine; move to **Pro** or **Cloudflare Pages** before any commercial use (R5, [cost-model](../operations/cost-model.md)). |

## How to verify success
- The production URL loads, you can sign in, and data reads/writes work.
- Opening a PR produces a working preview URL.
- Installing the PWA to your phone home screen works (Share → Add to Home Screen).

## Rollback
- Vercel keeps every deployment. Project → **Deployments** → pick a previous good
  one → **Promote to Production** (instant rollback).
- To disconnect: Project → Settings → **Git** → Disconnect, or delete the project
  (the repo is untouched).
