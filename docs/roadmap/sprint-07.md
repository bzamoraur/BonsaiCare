# Sprint 07 — "Ready to trust daily" (Milestone M5, second half)

> **Status:** Historical · **Updated:** 2026-07-06
>
> **Outcome: shipped (PRs #48–#56).** The polish-and-production half of M5, driven
> by an adversarial **a11y/perf/UX audit** (8 findings, each verified): **dark
> mode**, an **accessibility pass** (focus management, live-region announcements,
> AA input contrast, reduced-motion), a **perf** fix (image CLS), and app-shell
> **error boundaries**. Plus **production hardening**: an automated **weekly DB
> backup** (free-tier has none — R9), the **storage-orphan sweep**, and keep-warm
> — dormant-until-secret GitHub Actions. Two honest deviations: the broad
> `loading.tsx` was **removed** (it hung Server-Action form submits — the e2e
> caught it), so route-level loading is deferred; and **Sentry is deferred**
> (`@sentry/nextjs` won't install on Next 16), with Vercel's error logging + the
> new boundaries as the interim. Closes M5 — Phase 1's MVP is feature-complete;
> its exit ("lived-in, no data loss") is now the ongoing real-use test.

## Sprint goal

> The owner uses it daily without friction: it's pleasant in light **and** dark,
> accessible, quick, never shows a blank confusing screen, and when something
> breaks the owner finds out.

## Definition of done

- [x] **Dark mode** — System / Light / Dark, no flash, remembered (PR #48).
- [x] **Graceful screens** — empty states already existed; added `(app)/error.tsx`
      + `global-error.tsx` so no failure lands on Next's unstyled default. *Route-
      level loading deferred:* a broad `loading.tsx` hung Server-Action form
      submits (the e2e caught it) and was removed; targeted per-route loading is a
      future item.
- [x] **Accessibility pass** (#51) — focus managed on every reveal/collapse
      control, success announced via live regions, light-theme input borders
      raised to WCAG AA, reduced-motion guard. Audited + adversarially verified.
- [x] **Performance pass** (#52) — fixed standalone-photo CLS; the audit found no
      N+1 and the raw `<img>` tags are the intentional signed-URL case.
- [x] **Production hardening** — keep-warm (R1) + an automated **weekly DB backup**
      (R9 — free tier has none) + the **storage-orphan sweep**, all
      dormant-until-secret GitHub Actions (#54, #56); error boundaries + Vercel's
      built-in logging as interim monitoring. **Sentry deferred** (`@sentry/nextjs`
      won't install on Next 16). Critical flows are covered by the Sprint-06
      harness (M3 log→timeline, M4 daily loop); a broader F1–F7 e2e can extend it.

## Slices (one PR each, in order)

### 5. Empty & loading states  *(dark mode shipped in #48)*
Fill the gaps the audit finds: friendly empty states, `loading.tsx`/Suspense
where a query could blank a screen, recoverable error states.

### 6. Accessibility pass
Fix the confirmed a11y findings (focus, labels, live regions, contrast,
reduced-motion). Driven by the audit workflow + adversarial verification.

### 7. Performance pass
Responsive/dimensioned images (no CLS), lazy loading, prune client boundaries,
kill any N+1 on list reads.

### 8. Production hardening
Sentry at the deploy (needs an owner-provisioned DSN — a click-by-click guide
will follow); confirm keep-warm + backup/restore; the storage-orphan sweep
(pg_cron or a Vercel cron hitting a protected route); the F1–F7 critical e2e.

## Explicitly NOT in this sprint

The **friends-release** items (owner metrics view, usage analytics, gated
registration, onboarding tutorial) — those follow M5, per the
[roadmap](./roadmap.md#getting-to-a-friends-release). Sprint 07 is about making
the *owner's* daily use solid first.

## Risks to watch

- **Dark-mode contrast regressions** — the audit checks token pairs in both
  themes; don't let a "polish" pass ship a AA failure.
- **Hardening needs owner setup** (Sentry DSN, cron secrets) — flag each as a
  guide, never block a merge on it; ship the code path guarded so a missing DSN
  is a no-op, not a crash.
- **Scope**: resist pulling friends-release features forward (R3) — they have a
  home in Phase 2 and their own decisions.
