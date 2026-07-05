# Sprint 06 — "Your data, yours" (Milestone M5, first half)

> **Status:** Active · **Updated:** 2026-07-05
>
> Opens Milestone M5 (trust, polish & production). This sprint delivers the
> **data-ownership** promise of [ADR-0008](../decisions/0008-data-ownership-and-export.md):
> full **export** (JSON + CSV + a photo archive) and **real account deletion**
> (rows *and* storage). It also builds the **Playwright authenticated e2e
> harness** that has been blocking two deferred DoDs (M3's log→timeline, M4's
> daily loop) — closing them here, before M5's production hardening (Sprint 07).

## Sprint goal

> The owner can take **all** their data out (portable JSON/CSV + every photo)
> and can **truly delete** their account — every row and every stored object
> gone — and both promises are proven by tests, not asserted.

## Why this first (M5 opens here)

Serious growers distrust bonsai apps because apps die and trap decade-long
records (the ADR-0008 context). Export + real deletion is the single most
trust-defining thing we can ship, and it gates the eventual friends release
(and any future app-store account-deletion requirement). It comes before the
cosmetic polish because trust, not gloss, is what makes this usable as a
*primary* record.

## Definition of done

- [ ] **JSON export** downloads every user-owned table in one file
      (`profiles, species (own), locations, trees, tags, tree_tags, photos,
      care_log_entries, tasks`). A **standing test fails** if a new public table
      is added and not covered (compile-time exhaustiveness + a runtime
      coverage assertion).
- [ ] **CSV export** of the same data (one flattened file per table in a zip, or
      a documented multi-table layout), with the JSONB `details` flattened
      legibly.
- [ ] **Photo archive** — the user can download their photo objects (streamed
      archive if within Vercel Hobby limits, else a signed-path manifest), so the
      visual progression is never trapped. The chosen approach and its limit are
      documented.
- [ ] **Account deletion** removes the auth user (cascading **all** DB rows) and
      **all** storage objects under the user's prefix. Guarded by an explicit
      typed-confirmation UI. Storage bytes are removed *before* the account row,
      via the user's own RLS-scoped Storage client — no service-role secret in
      the app runtime. Proven by a pgTAP test (cascade) + unit tests (flow).
- [ ] **Playwright auth harness** — an authenticated browser context created
      *without* an app-side auth-bypass route: a global-setup mints a confirmed
      test user via the admin key against the **local** Supabase stack and
      injects its `@supabase/ssr` session cookies. A CI e2e job boots Supabase →
      `next build && next start` → runs the specs.
- [ ] The **two deferred e2es** now pass on the harness: M3 *log care → appears
      on the timeline*; M4 *create recurring → complete from Today → next
      occurrence lands (incl. an out-of-season skip)*.
- [ ] Every merge is CI-green; each schema change flags the pending hosted
      `supabase db push` for the owner (with a click-by-click guide).

## Slices (one PR each, in order)

### 1. JSON export
`src/server/export.ts` collects all owned tables via the RLS-scoped client into
a typed bundle; a Route Handler streams it as a dated download. Coverage is
enforced two ways: a `satisfies readonly TableName[]` list (compile-time
exhaustiveness against `Database["public"]["Tables"]`) + a runtime test that the
bundle keys cover every non-exempt table. Own species only (globals are shared
reference data; `trees.species_label` preserves the human-readable name).

### 2. CSV export
Reuse slice 1's collection; serialize each table to CSV with a shared,
injection-safe encoder (guard `=+-@` lead chars, quote/escape correctly),
flattening `details`/recurrence JSONB into readable columns. Delivered as a zip
of per-table CSVs so nothing is lost to a single flattened shape.

### 3. Photo archive
Stream a zip of the user's storage objects built on the fly (Web Streams, no
full-buffer) so it fits Hobby's function limits; for very large collections,
fall back to a signed-path manifest. Decide + document the boundary. Reuse the
photos rows for authoritative paths; RLS keeps it self-scoped.

### 4. Account deletion
A `security definer` RPC `delete_my_account()` (empty search_path, target
derived **only** from `auth.uid()`, never a parameter) deletes the caller's
`auth.users` row → cascades every owned table. The Server Action first removes
all storage objects under `<uid>/` via the user's RLS client (bytes, not just
metadata), then calls the RPC. A typed-confirmation danger-zone UI in Settings
gates it. pgTAP proves the cascade; unit tests prove the flow ordering.

### 5. Playwright auth harness + close the two deferred e2es
Global-setup against the CI Supabase stack: admin-create a confirmed user, sign
in, capture the `@supabase/ssr` cookies, persist as Playwright storage state —
**not** an app auth-bypass route (that would be a prod security footgun). Add a
CI e2e job. Port both deferred flows and leave a seam for M5's critical-flow
e2e (Sprint 07 slice 8).

## Demo at sprint end

Settings → **Export JSON** downloads a complete, readable record → **Export CSV**
opens cleanly in a spreadsheet → **Download photos** gives every image →
**Delete account**, typed-confirm, and a re-login shows the account and every
object are genuinely gone. CI shows a green **e2e** job exercising the daily loop
end to end.

## Explicitly NOT in this sprint

Empty states, dark mode, accessibility pass, performance pass, Sentry,
keep-warm/backup verification, and the storage-orphan reconciliation sweep — all
**Sprint 07** (M5 second half). Data import is Phase 2 (the JSON format is the
future round-trip contract, but no importer ships now).

## Risks to watch

- **Deletion is irreversible.** The RPC derives its target solely from
  `auth.uid()`, so a user can only ever delete themselves; the confirmation UI
  guards accident. The one residual unknown is whether the hosted `postgres`
  role may delete `auth.users` — the CI stack runs as superuser so it can't
  *prove* the hosted grant. Mitigation: the owner's push guide includes a
  throwaway-account end-to-end deletion as the acceptance test; deletion errors
  surface (never silent), so a privilege gap fails loud, and the fallback is the
  service-role admin API.
- **Storage vs. DB ordering.** Remove bytes *first* (RLS client, while paths are
  still readable), then delete the account. A crash between them orphans bytes,
  not rows — and the Sprint-07 orphan sweep is the backstop.
- **Vercel Hobby limits** on the photo archive (function time/memory). Prefer
  streaming; document the size boundary and the manifest fallback.
- **The harness must never become a prod auth-bypass.** Cookies are injected in
  test setup only; there is no app route that issues a session without the real
  magic-link flow.
- **Export completeness drift.** New tables must break the coverage test — that
  guard is itself part of the DoD, not a nicety.
