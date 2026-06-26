# ADR-0003: Host on Vercel (Hobby) for the MVP

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Owner + Claude

## Context

We need to host a Next.js PWA, free, with great DX and instant deploys from
GitHub. The only nuance is Vercel's **Hobby plan is for non-commercial use**.

## Options considered

1. **Vercel Hobby (free)** — best-in-class Next.js DX (same vendor), zero-config
   deploys, preview deployments per PR, edge CDN. Con: **non-commercial use
   only**; commercial requires **Pro ($20/mo)**.
2. **Cloudflare Pages (free)** — generous, **commercial use allowed** on free,
   excellent edge. Con: Next.js support needs an adapter (`@cloudflare/next-on-
   pages` / OpenNext) — slightly more setup friction, occasional feature gaps.
3. **Netlify (free)** — solid; similar to Vercel but marginally less seamless for
   Next.js App Router.
4. **Self-host (VPS)** — full control. Con: ops burden, not free, against speed
   principle.

## Decision

Use **Vercel Hobby** for the MVP. For a personal/trusted-user app it is free,
fastest to deploy, and gives the smoothest Next.js experience and per-PR preview
deploys (great for review). The non-commercial restriction is **not violated** by
personal/trusted use.

## Consequences

- **Positive:** zero-config, instant deploys, preview URLs per PR, best Next.js
  DX, free.
- **Negative / accepted risk (R5):** if the product ever goes **commercial**, the
  Hobby plan would be a licensing violation — we must move to **Vercel Pro** or
  **Cloudflare Pages** *before* commercial launch. This trigger is documented in
  [cost-model](../operations/cost-model.md) and the
  [risk register](../product/risks-and-assumptions.md).
- **Reversal:** the app is standard Next.js; moving to Cloudflare Pages or
  Netlify is a config/adapter change, not a rewrite. We avoid Vercel-proprietary
  features without a fallback to keep this cheap.
