# Improvement Plan — from "feature-complete" to "loved" (post-M5)

> **Status:** Accepted (owner, 2026-07-06) · **Updated:** 2026-07-08 (Sprint 08 complete)
>
> **Owner decisions recorded (2026-07-06):** ① plan order approved as written;
> ② registration = **allowlist**; ③ repo goes **public** (branch protection +
> unlimited Actions minutes; license stays proprietary); ④ photo backup =
> free object storage (R2/B2 — final pick during account setup, both free at
> our size); ⑤ care dates = **plain calendar dates**
> ([ADR-0012](../decisions/0012-care-dates-are-calendar-dates.md)).
> Execution started the same day: S08.8 (PR #59), S08.1 (PR #60), S08.2 (PR #61).
>
> The execution plan produced by the 2026-07-06 milestone audit
> ([PROJECT_EXPORT.md](../../PROJECT_EXPORT.md) — 10 audit lenses, 24 agents,
> 13 adversarially-confirmed serious findings, 0 refuted, plus hosted Supabase
> advisor checks). It sequences **every confirmed finding** and the strongest
> opportunities into one hardening sprint + four milestones. Once the owner
> signs off, this document is the source of execution order; the
> [roadmap](./roadmap.md) keeps the phase-level view and the
> [backlog](./backlog.md) keeps everything not yet scheduled.

## Planning principles

1. **Fix before build.** Confirmed defects (one of them data-loss-class) land
   before any new feature. Nothing in Sprint 08 is optional polish.
2. **€0/month stays the ceiling.** Every item below runs on the current free
   tiers. The two budget watch-items (GitHub Actions minutes, Supabase egress)
   get explicit mitigations.
3. **Friends gates before invites.** No URL is shared until M7's exit criteria
   pass — that ordering is a safety property (open signup + unthrottled OTP +
   iOS login dead end), not just polish.
4. **Evidence re-orders the tail.** M8/M9 ordering is a hypothesis; once usage
   analytics (M7) exist, lived friction re-prioritizes them — per the roadmap's
   standing rule.
5. **Same operating model.** Small PRs, full gate (typecheck/lint/test/build +
   CI pgTAP + e2e), schema changes flagged for the owner's
   `pnpm exec supabase db push` with click-by-click guides.

## The map

| When | Goal | Exit criterion |
|---|---|---|
| **Sprint 08 — "Nothing silent, nothing lost"** | Every confirmed defect fixed; automations trustworthy | All 13 audit findings closed or explicitly deferred with reason; one restore drill performed |
| **M6 — "A daily driver at 40 trees"** (Sprints 09–10) | Capture speed at collection scale + the photo payoff + perceived speed | Owner logs a full watering/feeding round in <1 min; photos load instantly from cache; lightbox/compare shipped |
| **M7 — "Safe to hand to a friend"** (Sprints 11–12) | Identity, language, onboarding, gating, analytics | A cold Spanish-speaking iPhone user signs up (allowlisted), installs, completes the tour, logs care — unaided; owner sees it in /admin |
| **M8 — "It knows bonsai"** (Sprints 13–14) | The differentiator: species/season intelligence + proactive reach | Category-aware suggestions on Today; weekly email digest; wiring tracker live |
| **M9 — "Anywhere, beautifully"** (Sprints 15–16) | Offline capture, photo-bucket backup, sharing, desktop | Care logging works with no signal; photos have a second copy; a tree can be shared read-only |

---

## Sprint 08 — "Nothing silent, nothing lost" (fix-first hardening)

> ✅ **COMPLETE — 2026-07-08.** The 10 code slices (S08.1–8.10) merged as PRs
> #59–#81, ADR-0012 landed, and S08.11's restore drill passed: `db-backup-28816036702`
> restored into a throwaway project via the SQL Editor in ~20 min with a complete
> round-trip (login identity + all data), and the runbook's restore section is
> corrected from the drill. Details in the [CHANGELOG](../../CHANGELOG.md); live
> state in [production-state](../operations/production-state.md).

Slices, in merge order (one PR each unless noted):

1. **fix(ops): orphan-sweep pagination + sanity guard** — paginate the photos
   read with `.range()` exactly like the storage walk; abort non-zero if the
   read hits the PostgREST cap; refuse to delete when orphans exceed 20% of
   scanned objects; test with a seeded >1,000-row case. *Unblocks arming the
   sweep (owner task 5).* 【audit: critical #1】
2. **feat(obs): action-error logging** — one `logActionError(context, error)`
   helper applied to all 18 silent catches + the two swallowed errors in
   `coverUrlMap`; surface `error.digest` in both error boundaries ("quote this
   code"); helper body is the future Sentry seam. 【high #2】
3. **Schema PR (owner push + guide): DB hardening migration** —
   `revoke execute … from anon` on `delete_my_account()`, `owner_metrics()`,
   `handle_new_user()` (hosted advisors confirmed anon can execute all three —
   Supabase default privileges grant EXECUTE explicitly; revoking `PUBLIC` was
   not enough); in-function owner gate for `owner_metrics` (private config
   row); CHECK constraints (non-empty names, `jsonb_typeof` on details/
   recurrence, positive photo dims); composite-FK owner consistency
   (`(tree_id, owner_id) references trees (id, owner_id)`); `created_at desc`
   tiebreaker in timeline reads. pgTAP: behavioral storage.objects assertions
   (cross-user insert/select/delete), anon-RPC denial, adversarial
   complete_task args. 【advisors; security/data-model lens】
4. **feat(sec): web-layer hardening** — `headers()` in next.config.ts (CSP with
   `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy);
   auth-callback `next`-param guard; SHA-pin the 4 GitHub Actions + Dependabot
   for the actions ecosystem. 【security lens】
5. **fix(ui): native controls + tokens** — `color-scheme` light/dark +
   `accent-color: var(--primary)`; darken light `--input` to a true 3:1; sync
   `meta[name=theme-color]` from the theme toggle. 【medium #7】
6. **feat(pwa): honest offline page + SW registration fix** — static
   `offline.html` precached and served on failed navigations (the cached-"/"
   fallback is provably dead — redirected responses are rejected); cache-name
   bump; `readyState` guard on SW registration. 【medium #10; pwa lens】
7. **ci: gates + budget** — types-freshness check in the db-test job
   (`gen types --local` + `git diff --exit-code`); `format:check`; Playwright
   browser cache; single Supabase stack boot per pipeline. 【medium #8; Actions-minutes budget】
8. **fix(ops): fail-loud crons + alerting** — keep-warm fails on curl error/
   non-2xx; missing-secret branches exit 1 *once armed*; shared `if: failure()`
   step files a GitHub issue on any cron failure; backup content floor (size +
   COPY-block check). 【medium #13】
9. **fix(ux): the "today" split-brain** — client-set `completedOn` on skip;
   local-day for tree-detail overdue badges and the calendar ring (reuse the
   dashboard's `useSyncExternalStore` pattern, extracted to `src/lib`). 【architecture lens】
10. **test(e2e): the two missing critical journeys** — F2 add-tree-with-photo,
    F7 export download (pins the already-shipped PWA regression), + axe smoke
    on the four core screens, + PWA manifest/sw smoke. 【testing lens】
11. **Owner, guided:** one **restore drill** into a scratch Supabase project
    from a real backup artifact; the runbook's new Backups & restore section
    gets corrected from the transcript; log the date in
    [production-state](../operations/production-state.md).

*Docs truth-sweep (CLAUDE.md/README status, roadmap/backlog/CHANGELOG/risk
register, runbook, env reference) ships with this plan's own PR — already done.*

## M6 — "A daily driver at 40 trees" (Sprints 09–10)

**Sprint 09 — "Log 40 trees in 40 seconds"** (capture at scale):

1. **Batch care logging** — multi-select trees (reuse the plan/schedule picker)
   → one form → N entries in one action. The backlog's own "kills the habit" P1. 【high #3】
2. **Repeat-last-event** — one-tap re-log with fresh timestamp, on tree page
   and collection cards.
3. **Recency chips** — "watered 2d ago · fed 12d ago" on cards + detail facts
   (one aggregate query).
4. **Quick-log lands on the form** — scroll + focus on `?log=1` (S now); then a
   proper bottom-sheet quick-add (care **or photo** — photo capture currently
   has no global path) that never loads the full profile. 【medium #5; ux lens】
5. **Post-create flow** — redirect new tree → its detail page (the empty-state
   invites photo/first log); last-used details pre-fill per care type.
6. **Archived trees** — "Archived" filter + Unarchive button + honest confirm
   copy. 【medium #6】
7. **Calendar acts** — TaskActions in agenda rows; day cells anchor to their
   agenda section.

**Sprint 10 — "The photo payoff, instantly"** (perf + the emotional core):

1. **Thumbnails** — second client-side rendition at upload (~320px, ~20 KB);
   grid/triage/picker/timeline use it (grids currently download 10× the pixels
   they show).
2. **Stable signed URLs + SW photo cache** — server-side cached path→URL
   resolution (TTL 24h / revalidate 12h) + SW cache-first for storage responses
   keyed by token-stripped path. Kills the egress churn (Cost is priority #1)
   and makes repeat visits instant. 【medium #9】
3. **Lightbox + compare** — full-screen swipeable viewer; two-up "then vs now".
4. **Loading skeletons** — per-route `loading.tsx` on the four read-heavy routes
   (section-level, avoiding the Sprint-07 Server-Action hang) + `useLinkStatus`
   pending indicator in the nav; fold `getLocationName` into the tree select.
5. **UI primitives + touch** — Input/Select/Textarea/Label/Badge/EmptyState
   primitives (11 files have drifted to 3 input heights); default button h-10;
   the "craft pass" serif for headings/tree names (`--font-heading` already
   exists).
6. **Export robustness** — photo-zip: concurrency 3–4, time-based bail-out,
   lower streaming threshold (the 500-photo cap can't finish inside
   maxDuration=60 today); deferred `revokeObjectURL`.
7. **listTreeOptions()** for the plan pages; owner sets Vercel function region
   next to eu-west-3.

## M7 — "Safe to hand to a friend" (Sprints 11–12)

**Sprint 11 — "Speak their language, guard the door":**

1. **OTP code sign-in** — `{{ .Token }}` in the email template + 6-digit input
   on the "check your email" screen (`verifyOtp`). Fixes the iOS installed-PWA
   dead end AND link-scanner failures; additive per ADR-0010. 【high #4】
2. **Registration gate** — `allowed_emails` + before-user-created auth hook
   (owner decision: default gated), warm "ask for an invite" login state,
   pgTAP for the rejection; **Turnstile CAPTCHA** on OTP (protects the email
   quota — the owner's own login). 【security lens】
3. **i18n ES/EN** — the promised ADR (proposal: typed dictionary, locale on
   `profiles`, cookie fallback), scaffold, Spanish translations, locale-driven
   Intl formats. Before more strings sprawl — the backlog's own warning.
4. **Hemisphere onboarding** — one-time prompt (locale-guessed default) —
   southern users currently get inverted seasons silently.
5. **Species combobox** — activate the dormant seeded lookup on tree forms
   (sets `species_id` + category; free-text fallback). Prerequisite for M8.

**Sprint 12 — "Welcome, and watch":**

1. **First-run tour** — skippable 3-step (add tree → log care → plan), profile
   flag, re-openable from Settings; tree-aware Today empty-state CTAs.
2. **Usage analytics** — ADR + `usage_events` table (event, user, ts; RLS;
   aggregate reads only) + key-action instrumentation; **admin v2**: per-feature
   counts, last-active, signups sparkline; Vercel Web Analytics on.
3. **Install promotion** — `beforeinstallprompt` card + iOS add-to-home hint;
   manifest `id`/shortcuts/screenshots; iOS splash screens (generation script
   exists).
4. **Friends-release checklist run** → **invite the first 2–3 colleagues.**

## M8 — "It knows bonsai" (Sprints 13–14)

1. **Species-category care intelligence** — populate `species.default_care`
   (category-level seasonal rules: repot windows, decandling, defoliation,
   protection thresholds; ADR for the JSONB shape) → suggestion cards on Today
   ("3 deciduous trees are entering their repotting window"), one tap → task.
   Suggestions never impose (ADR-0007 spirit).
2. **Email digest** — weekly due/overdue summary via Resend free tier + a
   scheduled Action hitting a protected route (the dormant-until-secret pattern
   already exists); opt-in on Settings.
3. **Weather-aware prompts** — Open-Meteo (free, keyless) + lat/lon per
   location → frost/heat banners tied to category ("Frost tonight: 4 tropical
   trees on the Terrace"). Graduates the parking-lot item.
4. **Wiring tracker** — its own ADR; wire-on opens a tracked state (badge:
   "wired 6 weeks"), auto-inspection task (category-aware), wire-off closes it.
   The sharpest bonsai-specific pain.
5. **"Don't stack heavy work" guardrails** — pure rules over care history +
   season (depends on 1).

## M9 — "Anywhere, beautifully" (Sprints 15–16)

1. **Offline care-log outbox** — IndexedDB queue + replay, client UUIDs for
   idempotency, "pending sync" chips; scoped to care logs only (the offline-ADR
   boundary). The garden-with-no-signal moment the product exists for.
2. **Real shell caching** — Serwist (or grown sw.js): static assets SWR,
   recently-viewed trees readable offline.
3. **Photo-bucket backup — ✅ pulled forward, DONE 2026-07-06** (the owner had
   the B2 account ready, so this data-safety item didn't wait for M9):
   `photo-backup.yml` mirrors `tree-photos` to Backblaze B2 monthly,
   incrementally, never deleting on the mirror side.
4. **Read-only share link per tree** — revocable token → minimal public
   progression page. The first organic growth loop.
5. **Desktop layout** — side rail + two-column tree detail; **year-in-review**
   photo strip; optional "large controls" outdoor mode.

**Phase 3 (unchanged, evidence-gated):** landing page, native shell,
monetization — each behind demand and its own ADR.

---

## Vision expansion — inspired by the Bonsai Empire app (proposed, 2026-07-07)

> **Status:** Proposed — owner triage pending. **Source:** analysis of the
> "Bonsai Care App" (Bonsai Empire) from the owner's walkthrough + screenshots,
> 2026-07-07 (3-lens ideation grounded in this plan). Nothing here is scheduled
> until the owner picks what to pull forward; it is captured, not locked.

**Finding:** the inspiration app **validates ~70% of this plan** — batch logging
(S09.1), species intelligence (M8.1), onboarding tour (S12.1), OTP (S11.1),
hemisphere (S11.4), read-only share (M9.4), weather prompts (M8.3), archived
filter (S09.6), calendar (S09.7). The one structural gap it exposes:
`trees.species_id` is **never set today** (the tree form writes only free-text
`species_label`), so the seeded `species` table and `species.default_care` are
dormant — **activating that link is the unlock** for everything below.

### Keystone — a category care-knowledge layer (reprioritizes M8.1)

Author `species.default_care` at the **category** level (5 rows: conifer /
deciduous / broadleaf-evergreen / tropical / other) as bundled, Zod-validated,
i18n-ready content in `src/domain` (unit-tested like `scheduling.ts`):
sunlight/location, watering rhythm, feed/repot/prune windows, winter-protection
threshold, and a plain-language guidelines paragraph. This pulls the **data**
half out of M8.1 as a prerequisite slice; M8.1's Today suggestion cards become
one of several readers of the same seam.

### Net-new slices (all €0, no heavy deps)

**Knowledge (M8, after the keystone + `species_id`):**
- **Care-guidelines block on tree detail** (M) — their "Pautas para el cuidado",
  collapsible, hemisphere-phrased; needs a `species_id` join added to the detail
  read (renders nothing when only free-text species exists — never blocks capture).
- **In-context micro-tips** (S) — one authored line by care-type × category under
  the log form and on task rows; dismissible / first-use.
- **"This month" seasonal calendar** (M) — a category × month matrix from the
  model + the existing season/hemisphere logic; on the Calendar tab + a Today teaser.
- **`/learn` primers + curated links** (M, M8→M9) — 4–6 bundled how-to primers +
  a tiny curated external list, reached from **Settings, not a 5th nav tab**
  (mobile nav is at its slot ceiling). Lowest-priority Learn item — the in-context
  surfaces already do most of the teaching.

**Daily-driver (M6):**
- **Grouped reminders + "mark all done"** (M) — sub-group Today's tasks by care
  type + a new `completeManyTasks` action; explicit group confirm + "log events"
  toggle. Sibling of S09.1 batch logging.
- **"Next care" summary cards on tree detail** (S) — forward-looking per-type
  cards ("Water · due today", "Feed · in 12 days") derived from already-loaded tasks.
- **Least-watered sort + due dots** (S) — sort the collection by longest-since-
  watered; due/overdue dot on tree cards + a count on the Today nav item. Extends S09.3.

**Identity & data:**
- **Activate `species_id`: guided category → species picker** (M, M7) — grows
  S11.5 from a combobox into a guided picker that actually sets `species_id`. The unlock.
- **Sun-exposure + environment enums on `locations`** (S, M8) — full/partial/shade;
  outdoor/greenhouse/cold-frame/indoor. Feeds care advice + sharpens M8.3.
- **Estimated-age tracking on trees** (S, M6) — optional "≈ N years" live fact
  (their "Edad: 88 años" touch); rides the species-form pass.
- **Tree status: sold/dead/gifted + "graveyard" filter** (M, M6) — extends S09.6
  archive into a reason (the Planta pattern the domain model already admires); one
  small schema add.

### Explicitly rejected (reinforces "What we deliberately do NOT do")

Pro paywall / tiers; a **global** social network (a revocable read-only share
link, M9.4, is the right dose); a collectibles/pots upsell; course ads / discount
codes — all commercial-product patterns misaligned with a €0 personal→friends tool.

---

## Traceability — audit finding → plan slot

| # | Finding (confirmed severity) | Where fixed |
|---|---|---|
| 1 | Orphan sweep deletes real photos past 1,000 rows (**critical**) | S08.1 |
| 2 | Server Actions swallow every error (**high**) | S08.2 |
| 3 | No batch logging / repeat-last (**high**) | S09.1–2 |
| 4 | iOS installed-PWA magic-link dead end (**high**) | S11.1 |
| 5 | Quick-log lands off-screen (medium) | S09.4 |
| 6 | Archive is a one-way door (medium) | S09.6 |
| 7 | No color-scheme/accent-color (medium) | S08.5 |
| 8 | No types-freshness gate (medium) | S08.7 |
| 9 | Signed-URL churn defeats caching (medium) | S10.2 |
| 10 | Offline fallback provably dead (medium) | S08.6 |
| 11 | CLAUDE.md/README two milestones stale (medium) | this PR (+ DoD checkbox) |
| 12 | Runbook missing backups/restore (medium) | this PR + S08.11 drill |
| 13 | Keep-warm can never fail (medium) | S08.8 |
| — | Hosted: anon EXECUTE on 3 definer fns (advisors) | S08.3 |
| — | Photo bytes single copy (data-model) | ✅ done early — B2 mirror workflow (2026-07-06) |
| — | Open registration + unthrottled OTP (security) | S11.2 |
| — | Hemisphere silently 'northern' (data-model/ux) | S11.4 |
| — | Security headers absent (security) | S08.4 |
| — | occurred_at mixed semantics (data-model) | S08.3 tiebreaker + owner ADR decision |
| — | CI advisory-only / no branch protection (testing) | owner decision (repo public vs deploy hook) |
| — | Missing e2e journeys F2/F7 (testing) | S08.10 |
| — | 1600px images as thumbnails (perf) | S10.1 |
| — | No loading feedback anywhere (ux/perf) | S10.4 |
| — | Field-primitive drift, touch targets (design) | S10.5 |
| — | Species subsystem dormant (product/data-model) | S11.5 + M8.1 |

## Decisions the owner is asked to make now

1. **Approve/adjust this plan's order** (especially: agree M7 = invite gate).
2. **Registration mode** (recommended: allowlist).
3. **Repo public vs private** (branch protection + unlimited CI minutes vs privacy).
4. **Photo-backup home** (R2 vs B2 — both free at our size).
5. **`occurred_at` semantics** (recommended: migrate to `date` in S08.3's ADR).

## What we deliberately do NOT do

No TanStack/RHF adoption (ADR-0011 stands until lived friction triggers it); no
paid tier of anything; no push notifications before email proves insufficient
(ADR-0007); no Phase-3 features smuggled forward; no new heavy dependencies —
the 14-dep footprint is a feature.
