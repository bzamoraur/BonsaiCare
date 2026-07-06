# Sprint 07 — "Ready to trust daily" (Milestone M5, second half)

> **Status:** Active · **Updated:** 2026-07-06
>
> The polish-and-production half of M5. Sprint 06 made the app *trustworthy with
> your data* (export + real deletion + the e2e harness); this makes it
> *comfortable, fast, and observable* enough to lean on every day — and ready for
> the eventual friends release. Closes Phase 1.

## Sprint goal

> The owner uses it daily without friction: it's pleasant in light **and** dark,
> accessible, quick, never shows a blank confusing screen, and when something
> breaks the owner finds out.

## Definition of done

- [x] **Dark mode** — System / Light / Dark, no flash, remembered (PR #48).
- [ ] **Empty & loading states** — every list surface (Today, Collection,
      Timeline, Care plan, Calendar, planners) has a helpful empty state and a
      sensible loading state where a slow query would otherwise blank the screen.
- [ ] **Accessibility pass** — keyboard-operable with visible focus, every
      control labelled, async results announced, AA contrast in both themes.
      Audited across lenses and adversarially verified.
- [ ] **Performance pass** — no image layout shift, lazy where appropriate, no
      N+1 across list views, no needless client components.
- [ ] **Production hardening** — error monitoring (Sentry free tier) so silent
      Server-Action failures become visible; verify the keep-warm cron fires
      (closes R1); verify backup/restore (closes R9); a **storage-orphan
      reconciliation** sweep (objects with no `photos` row → deleted past a grace
      window); a critical-flow e2e across F1–F7 on the Sprint-06 harness.

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
