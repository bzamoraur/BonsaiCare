# ADR-0013: Durable in-DB `app_errors` log as interim observability (Sentry deferred)

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Owner + Claude

## Context

A friend's crash was effectively invisible. Server-side failures went only to
Vercel's function logs (~1h retention) via `logActionError`, and client-side
crashes — the `error.tsx` / `global-error.tsx` boundaries — reported nothing at
all. The owner learned about bugs by being told, not by seeing them.

The obvious hosted answer is Sentry, but `@sentry/nextjs@10` does not install
cleanly under Next 16 / Turbopack (its transitive `import-in-the-middle` pin
breaks install), so adopting it now is blocked, not merely unchosen. We still
need durable visibility before the friends release — on the free tier (no KV,
no separate log store), and without turning the log into a PII liability.

This extends the observability posture, not a prior ADR's decision:
[ADR-0007](./0007-notifications-strategy.md) already committed us to a
pull-first owner surface (`/admin`), and [ADR-0002](./0002-backend-supabase.md)
gives us Postgres + RLS + `SECURITY DEFINER` RPCs to build on.

## Options considered

1. **Stay on Vercel logs only (status quo).** Zero work. But ~1h retention,
   no client-side crashes captured at all, and nothing the owner can read
   after the fact — the exact gap.
2. **Adopt Sentry now.** Best-in-class stack traces, source maps, alerting.
   But it won't install on Next 16 / Turbopack today, adds a vendor + config,
   and is heavy for a 1–3-user app.
3. **Build a durable, PII-poor `app_errors` table + an `/admin` viewer now.**
   Uses infrastructure we already run, costs nothing extra, and is designed so
   Sentry can still land later as a superset.

## Decision

Choose **option 3** — a durable interim log, with Sentry explicitly deferred.

- **Table:** `public.app_errors` (migration `20260711120000`). RLS **on with no
  policies**, and the default API grants revoked from `anon`/`authenticated`, so
  nothing reaches it except the definer functions below. Columns are PII-poor by
  construction: `source` (`client`|`server`), `context` (a stable machine tag
  like `authCallback.exchange`, never user content), `message`, `digest`
  (matches Next's `error.digest` so a user report correlates to a row), `path`
  (**pathname only, never the query string**), `user_agent`, `release` (the
  deploy's commit SHA), and a **nullable** `owner_id`.
- **Write path:** `record_client_error` (SECURITY DEFINER, empty `search_path`).
  It stamps `owner_id := auth.uid()` **itself** — never from a parameter — so a
  caller can only attribute a row to themselves (or to no one, when signed out).
  It is granted to `anon` on purpose, so an unauthenticated `/login` crash still
  records; every text input is re-truncated with `left()` as defence against a
  hand-crafted call.
- **Client crashes:** `error.tsx` / `global-error.tsx` report via
  `navigator.sendBeacon` to the **public** `/api/log-error` Route Handler (a
  handler, not a Server Action, because `global-error` replaces the whole
  document). The route hard-caps the body at 8 KB, validates and length-bounds
  every field, and always answers `204` best-effort.
- **Server errors:** `logActionError` persists via Next `after()` (the write
  runs after the response — reliable on serverless, zero added latency); the
  `console.error` to Vercel logs stays as the floor if the DB write fails.
- **Read path:** `recent_app_errors` (SECURITY DEFINER) is owner-gated **inside
  the DB** on the `private.app_config` singleton — the same gate as
  `owner_metrics` — returning rows to the configured owner and NULL to everyone
  else, failing **closed** when unseeded, with the limit clamped to `[1, 500]`.
  The owner reads it on **`/admin` → "Recent errors"**, where every field is
  HTML-escaped on render so a crafted `message`/`user_agent` is inert text.
- **Sentry stays deferred** — revisit when `@sentry/nextjs` installs cleanly on
  Next 16 / Turbopack (trigger-gated, not date-gated; see Pending decisions in
  [ADR-0000](./0000-adr-process.md)).

## Consequences

- **Positive:** durable, greppable, owner-readable error history now, with no
  new vendor, secret, or bill; PII-poor by design; the escaped `/admin` render
  keeps hostile input inert. The security model reuses the proven
  `owner_metrics` pattern.
- **Negative / accepted:** `anon` can POST to `/api/log-error` — mitigated by
  the size cap and length bounds, but with **no cross-request rate limit** (no
  KV on the free tier). No stack traces, source maps, or alerting; the owner
  must *look* (pull-first, per [ADR-0007](./0007-notifications-strategy.md)).
- **Reversal:** additive. Adopting Sentry later does not require removing
  `app_errors`; the table can become a secondary sink or be dropped.
