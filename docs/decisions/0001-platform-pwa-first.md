# ADR-0001: Build a PWA (web-first, installable) before any native app

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Owner + Claude

## Context

The product must be **usable daily in the garden on a phone**, feel premium, and
reach production fast and cheaply. The decision principles rank **cost first**,
then UX, maintainability, correctness, security, speed, and (last) scalability.
Initial audience is the owner + a few trusted users; commercial is optional/future.

Constraints / facts:
- Apple Developer Program is **$99/yr** to distribute an iOS app (incl. TestFlight
  to trusted users); Google Play is a $25 one-time fee.
- Native means a second codebase/toolchain and app-store review latency.
- Modern PWAs install to the home screen, work offline-ish, and access the
  camera; **iOS supports web push since 16.4** but only for installed PWAs and
  less reliably than native.
- Research finding: **notification reliability is the #1 complaint across every
  competitor** — so we are *not* betting the core experience on push anyway
  (see [ADR-0007](./0007-notifications-strategy.md)).

## Options considered

1. **Next.js PWA (web-first, installable).** One TS codebase; free hosting; no
   app-store tax or review; instant updates; works on phone + desktop. Cons: iOS
   push weaker; no app-store discoverability; some native polish missing.
2. **React Native / Expo (cross-platform native).** Native feel + reliable push;
   app-store presence (good for future commercial). Cons: **$99/yr** to keep it
   installed on real devices via TestFlight; second codebase; review friction;
   slower iteration; more infra.
3. **Local-first native (SQLite + sync).** Great offline + data ownership. Cons:
   sync is genuinely complex; overkill for MVP; slows delivery most.

## Decision

Build a **Next.js PWA first.** It wins decisively on cost (free), speed of
delivery, maintainability (one codebase, end-to-end TypeScript), and is "native
enough" for the actual job — capture a photo, log care, check what's due. We keep
the **domain logic and backend clean and framework-agnostic** so a native shell
(**Capacitor**, fastest) or **Expo** app can be added later without a rewrite.

## Consequences

- **Positive:** zero platform cost; ship in weeks not months; updates are instant
  (no review); the web client is itself a differentiator (no major bonsai app has
  one); a single skill set to maintain.
- **Negative / accepted risks:** iOS push is limited (mitigated by pull-first
  dashboard + optional email digest); no App Store presence (irrelevant for
  personal/trusted use); we must consciously preserve the native migration path
  (kept in [overview](../architecture/overview.md) via the `domain/` split).
- **Reversal:** if daily use exposes unacceptable native gaps, wrap the same app
  in Capacitor (days of work) before considering a full Expo rebuild. Revisit if
  the product goes commercial and app-store presence becomes valuable.
