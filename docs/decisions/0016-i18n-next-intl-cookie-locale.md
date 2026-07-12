# ADR-0016: Internationalization via next-intl 4 with a cookie-resolved locale

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Owner + Claude

This records the **as-built** i18n approach. The
[backlog](../roadmap/backlog.md) and the improvement plan repeatedly promised
"a new ADR for the i18n approach and where locale is resolved (cookie vs
profile) — before strings sprawl," but full ES/EN i18n shipped (#109–#132)
before it was written. This closes that gap and notes why the shipped design
diverged from the earlier proposal.

## Context

A P1 friends-release gate: a Spanish-speaking friend needs the app in Spanish,
and the backlog warned to decide the i18n approach *before* strings sprawled.
The earlier plan sketched a **hand-rolled typed dictionary** with the user's
locale persisted on a **`profiles` column**. When it came to build, two
realities pushed a different design: (a) the pre-login surfaces (login, privacy)
must localize with **no session and no DB row**, and (b) reinventing ICU
message formatting, plurals, and rich-text interpolation by hand is exactly the
kind of drift-prone work worth a dependency ([ADR-0004](./0004-frontend-stack.md)
already accepts targeted deps that earn their keep). Stable URLs also matter for
an installed PWA ([ADR-0001](./0001-platform-pwa-first.md)).

## Options considered

1. **Hand-rolled typed dictionary + locale on `profiles` (the earlier plan).**
   Zero runtime deps, fully typed. But it reinvents ICU formatting, and a
   profiles-column locale needs a DB round-trip **and an existing row** before
   pre-login pages can localize — the login and privacy pages have neither.
2. **next-intl with URL-prefixed locale routing** (`/en/today`, `/es/today`).
   Conventional for content sites. But it rewrites every path plus middleware,
   duplicates routes, and puts the locale in the URL — wrong for an installed
   PWA whose paths should stay stable ([ADR-0001](./0001-platform-pwa-first.md)).
3. **next-intl 4 with a cookie-resolved locale, no URL routing.** Chosen.

## Decision

Choose **option 3.**

- **Library & catalogs:** **next-intl 4**, messages in `messages/en.json` +
  `messages/es.json`. **English is the fallback**, so any not-yet-translated
  surface reads in English during an incremental rollout.
- **Resolution (`src/i18n/request.ts`):** an explicit **`NEXT_LOCALE` cookie**
  (set from Settings) always wins. Otherwise — the pre-login / first-visit case
  — the locale is inferred from the browser's **`Accept-Language`** header
  (honouring `q`-weights, matching on the primary subtag so `es-ES` and `es-419`
  both map to `es`), so a Spanish-browser friend lands on a Spanish login and
  privacy page. **No i18n routing:** the locale never appears in the URL; paths
  stay `/today`, not `/en/today`.
- **Locale lives in a cookie, not on `profiles`** — this is the deliberate
  divergence. A cookie localizes pre-login pages with no session or DB row, and
  is one mechanism for signed-in and signed-out alike.
- **Parity guard (`src/i18n/messages.test.ts`):** a unit test fails if the two
  catalogs' key sets drift, and asserts the enum-label namespaces cover **every**
  DB enum value — turning a would-be Spanish-only runtime error into a failing
  test in CI.
- **Coverage:** every friend-facing surface is translated — login, settings,
  today, collection, calendar, plan, quick-log, tree / care / task forms,
  tree-detail, the error boundaries, and the enum label maps.

## Consequences

- **Positive:** standard ICU tooling instead of a hand-rolled dictionary; stable,
  PWA-friendly URLs; pre-login localization with no DB dependency; catalog drift
  caught in CI; adding a third locale is additive (a new messages file plus the
  parity test).
- **Negative / accepted:** diverging from the earlier plan means `profiles` has
  **no locale column**, so a per-device cookie is **not synced across a user's
  devices** — acceptable at 1–3 users, and a `profiles` column can later be
  layered as the cookie's source of truth without changing the resolver. One
  runtime dependency (next-intl 4) is added, consistent with
  [ADR-0004](./0004-frontend-stack.md)'s "deps that earn their keep."
- **Reversal:** contained to the i18n layer — the resolver is a single file
  (`src/i18n/request.ts`); switching to profile-stored locale or adding URL
  routing later touches only it and the middleware wiring.
