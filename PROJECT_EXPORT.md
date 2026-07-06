# Project Export — Bonsai Companion (BonsaiCare)

> **Status:** Living — regenerated at each milestone audit · **This edition:** 2026-07-06, pinned to `main` @ `10e991d` (M5 close / "Phase 1 feature-complete")
>
> Produced by a full multi-perspective repo audit: **10 parallel audit lenses**
> (architecture, security, data model, product, UX flows, design/a11y,
> testing/CI, performance, PWA/offline, ops/docs) + a **toolchain executor**
> that ran the whole verification suite, with every critical/high finding
> **adversarially verified** by an independent agent (24 agents total, 0
> findings refuted), plus **hosted-project checks** via the Supabase advisors
> API. The previous edition is archived at
> [docs/archive/2026-07-05-project-export.md](docs/archive/2026-07-05-project-export.md).
>
> Legend: **VERIFIED** = executed or traced in code/git/hosted project by the
> auditor. **CLAIMED** = stated in docs/config, not independently confirmed.

---

## 1. Snapshot

- **Name:** Bonsai Companion (repo folder: BonsaiCare, `github.com/bzamoraur/BonsaiCare`, private)
- **Date:** 2026-07-06 (repo age: 10 days; **59 commits**, 211 tracked files, ~11.6k LOC — src/ 9,770 + supabase/ 1,847; 8 migrations; 14 runtime deps)
- **One-liner:** A calm, photo-first bonsai care & tracking PWA (Next.js 16 + Supabase) — collection, photos, unified care timeline, recurring tasks with season-aware scheduling, a Today dashboard, full data export, and real account deletion.
- **Stage:** **Working — Phase 1 MVP feature-complete.** All five milestones (M1–M5) shipped through PRs #2–#57 with green CI; deployed on Vercel against a live Supabase project (`Bonsai_App`, eu-west-3, ACTIVE_HEALTHY, Postgres 17 — VERIFIED via API); the owner is a live daily user and has live-tested account deletion. Two honest caveats: **(a)** the friends-release gates (registration control, onboarding, ES/EN) are designed but unbuilt, and **(b)** this audit confirmed **1 critical + 4 high** findings — all scheduled in the [improvement plan](docs/roadmap/improvement-plan.md).

## 2. What this repo contains

**Plain language:** A private web app where users sign in with an email magic
link and run a real bonsai collection: add trees (structured profile, tags,
locations), photograph them (client-compressed WebP into a private bucket,
signed URLs), log every kind of care into one merged per-tree timeline
(waterings, fertilizing, pruning, wiring, repotting… each with typed, validated
details), plan one-off and recurring tasks with hemisphere-aware season windows,
and start each day from a Today dashboard (overdue / due / upcoming + health
triage). Cross-tree schedules ("fertilize these 12 every 14 days, Mar–Oct") are
one form. Settings offers dark mode, full JSON/CSV/photo-zip export, and true
account deletion (every row and photo). An owner-only `/admin` page shows
aggregate usage metrics. Around the code: an unusually complete doc set (ADRs,
roadmap, sprints, runbook, setup guides) and three dormant-until-secret GitHub
Actions (keep-warm, weekly DB backup, storage-orphan sweep).

**Tech stack (VERIFIED):** Next.js 16.2.9 (App Router, RSC + Server Actions,
`proxy.ts` middleware, Turbopack), React 19.2.4, TypeScript strict, Tailwind 4,
minimal shadcn/base-ui, Supabase (Postgres 17 + Auth + Storage, RLS on every
table), Zod 4 (JSONB payloads), fflate (server-side zips), pnpm 11, Vitest 4,
Playwright (authed e2e in CI), pgTAP (7 suites), GitHub Actions, Vercel Hobby.

## 3. What works today

**VERIFIED by execution (2026-07-06, this machine, tree byte-clean throughout):**

- `pnpm typecheck` — 0 errors · `pnpm lint` — 0 errors/warnings
- `pnpm test` — 9 files, **128/128 unit tests pass** (17s)
- `pnpm build` — production build, **20 routes** + middleware, 0 warnings

**VERIFIED by code trace + hosted checks:**

- **The full feature surface is real** — every MVP-scoped feature exists end to
  end (collection, photos, timeline, tasks/recurrence/RPC-atomic completion,
  Today, calendar, cross-tree scheduler, export trio, deletion, dark mode).
  The product lens's verdict: "a rare case where the feature-complete claim
  survives code-level inspection."
- **Security spine:** per-command owner RLS on all 9 user tables with
  *behavioral* pgTAP (~100 assertions, cross-user denial per command, RPC
  denial, full deletion cascade); both SECURITY DEFINER RPCs hardened
  (auth.uid()-only targeting, empty search_path); secrets history forensically
  clean; service-role key confined to Actions.
- **e2e harness:** cookie-capture auth against a real CI Supabase stack; 4
  specs including the M3 log→timeline and M4 daily-loop journeys.
- **Hosted project:** ACTIVE_HEALTHY; all 8 migrations pushed (owner-verified
  2026-07-06); `OWNER_USER_ID` set in Vercel → `/admin` live; account deletion
  live-tested by the owner with a throwaway account.

**CLAIMED / unverified:** Vercel production env parity; keep-warm/backup/sweep
Actions are **dormant until secrets** — arming is in progress (owner runbook v3);
no restore drill has ever been performed.

## 4. In progress / half-built

| Item | State (VERIFIED) | What finishing takes |
|---|---|---|
| **Friends release** | Signup is open to anyone with the URL; no onboarding; UI English-only; no usage analytics | The M7 gate set: allowlist + CAPTCHA, first-run tour, ES/EN i18n, `usage_events` + admin v2 (~2 sprints) |
| **Species intelligence** | Schema fully built & seeded (species table, category enum, `default_care` seam) but **zero UI/scheduling code reads it** — the product's #1 differentiator is dormant | Species combobox on tree forms, then category-level care rules → Today suggestions (M8) |
| **Batch care logging** | Absent — logging is strictly per-tree; the backlog's own P1 ("logging 40 waterings one-by-one kills the habit") | Multi-select log + repeat-last + recency chips (M6, first slice) |
| **Offline** | SW's offline fallback is provably dead code (caches a 307 redirect, which browsers reject); no write queue | Static offline page (S, Sprint 08); care-log outbox + real shell caching (M9) |
| **Archived trees** | One-way door: no archived view, no unarchive (URL-only access) | Archived filter + restore action (M6) |
| **Calendar** | Read-only agenda/grid; docs promise create/complete/skip | Reuse TaskActions in agenda rows (M6) |
| **Sentry** | Deferred — `@sentry/nextjs` uninstallable on Next 16 (broken transitive dep); error boundaries + Vercel logs interim | Revisit when installable; the S08 logging helper is the seam |

## 5. Top risks & debt (worst first)

1. **The orphan sweep will delete real photos once `photos` exceeds 1,000 rows**
   (CONFIRMED critical). `scripts/reconcile-storage.mjs` reads the photos table
   unpaginated; PostgREST caps responses at 1,000 rows silently. Storage listing
   IS paginated — the asymmetry means rows beyond the cap look like orphans and
   the monthly scheduled run deletes their objects (DRY_RUN=false on schedule).
   The project's own budget (~1,500 photos, R4) makes this when-not-if. Fix is
   small and first in Sprint 08; **don't arm the sweep secret until it lands.**
2. **Photo bytes have exactly one copy.** The weekly backup dumps Postgres only;
   the bucket holding the irreplaceable progression photos is never backed up,
   and no restore has ever been drilled. (Backup workflow comment also pointed
   at a moved dashboard page and an IPv6-only connection string GitHub can't
   reach — corrected this edition.)
3. **Production write failures are undiagnosable.** All 18 Server Action catch
   blocks discard the error (against the repo's own "no silent catches" rule);
   Vercel logging cannot see caught exceptions, so the documented interim
   monitoring doesn't cover the entire write surface.
4. **The first iPhone friend can get stranded at login.** Magic-link-only auth
   cannot complete inside an installed iOS PWA (isolated storage; links open in
   Safari; PKCE makes even that first attempt fail). Paired with **open
   registration + an unthrottled OTP sender**, auth is the biggest friends-release
   blocker. Fix: 6-digit OTP entry + allowlist + CAPTCHA (M7).
5. **Green ≠ armed, and CI is advisory.** Keep-warm is structurally incapable of
   failing; all three ops workflows no-op silently without secrets; nothing
   records what's armed. Branch protection is unavailable (private GitHub Free)
   and Vercel deploys `main` regardless of CI. Discipline is currently the only
   gate.
6. **Hosted RPC grants are wider than the migrations intended** (VERIFIED via
   Supabase advisors): `anon` can EXECUTE all three SECURITY DEFINER functions —
   Supabase's default privileges grant EXECUTE to anon/authenticated explicitly,
   and the migrations only revoked `PUBLIC`. Consequence: anyone with the
   (public) publishable key can call `owner_metrics()` unauthenticated
   (aggregate, non-PII counts — embarrassing, not catastrophic). One revoke
   migration fixes it (Sprint 08).

## 6. Open product questions (owner decisions)

1. **Registration mode** before inviting: allowlist (recommended) vs open.
2. **Make the repo public?** Unlocks free branch protection + unlimited Actions
   minutes; the license stays proprietary. Alternative: gate Vercel deploys on
   CI via a deploy hook.
3. **Photo-backup destination:** Cloudflare R2 (10 GB free) vs Backblaze B2 —
   one new free account either way.
4. **`occurred_at` semantics:** migrate to `date` (matches the UI) vs true
   timestamps — decide once, in an ADR (S08 adds the ordering tiebreaker either way).
5. **i18n approach** (next-intl vs typed dictionary; locale on profile vs
   cookie) — ADR before M7.
6. **Offline scope ADR:** commit to "shell + queued care-log capture, nothing
   more" so Phase 2 never accidentally promises local-first.
7. (Phase 3, unchanged: monetization, native shell, share links — gated on evidence.)

## 7. Human tasks discovered

```markdown
### BonsaiCare (Bonsai Companion)
- [ ] Finish owner runbook v3 (https://claude.ai/code/artifact/e3612628-95ed-4811-8cc7-719447410f59):
      task 3 keep-warm test run · task 4 SUPABASE_DB_URL (Session-pooler URI —
      NOT the direct connection) · task 5 sweep secret — WAIT for the S08
      pagination fix to merge first — 10 min
- [ ] Vercel → Project → Settings → Functions: set the function region to match
      Supabase (eu-west-3 → Paris/cdg1 or closest) — one dropdown, biggest free
      latency win — 2 min
- [ ] Decide: repo public (branch protection + minutes) vs stay private — 0 min, a call
- [ ] Before first invite: enable Turnstile CAPTCHA on Supabase Auth (free) — 5 min
- [ ] When S08 lands: one restore drill into a scratch Supabase project following
      the new runbook section (guided, click-by-click, ~30 min)
```

## 8. Costs & services

| Service | Tier | Used for | Monthly cost |
|---|---|---|---|
| Supabase | Free | Postgres 17 + Auth + Storage + RLS (eu-west-3) | €0 |
| Vercel | Hobby | Hosting (non-commercial) | €0 |
| GitHub | Free (private) | Repo, CI, 3 ops crons | €0 |

**Total: €0/month (VERIFIED — no paid dependency).** Watch-items: **GitHub
Actions minutes** (2,000/mo on private Free; ~57 PRs in 10 days at ~8–10 min of
CI each makes minutes the most plausible first breach — S08 adds caching/stack
dedup; going public removes the cap entirely) and **Supabase egress** (5 GB/mo;
signed-URL churn currently defeats all image caching — M6 fixes).

## 9. Security check

- **Secrets committed: NO** — re-verified by git-history forensics this audit.
- **RLS: exemplary** — per-command owner policies on all 9 tables, behaviorally
  pgTAP-tested in CI; both definer RPCs textbook-hardened *in the migrations*.
- **Hosted advisor findings (new this edition):** anon EXECUTE on the 3 definer
  functions (default-privileges gap — revoke migration in S08); leaked-password
  protection off (moot — passwordless app); 7 unused indexes (expected at this
  scale, deliberately kept for the query patterns they serve).
- **Gaps, all scheduled S08:** zero security headers (no CSP/frame-ancestors/
  nosniff), storage policies tested existence-only, cross-owner FK references
  possible via direct PostgREST (pollution, not leakage), Actions pinned by tag
  not SHA while holding total-compromise secrets, auth-callback `next` param
  unvalidated (not currently exploitable).
- **Alarming: nothing.** The one data-loss-class item is the sweep bug (risk #1),
  an automation bug rather than an attack surface.

## 10. Recommended next work

The full sequenced plan lives in
[docs/roadmap/improvement-plan.md](docs/roadmap/improvement-plan.md). Shape:

1. **Sprint 08 — "Nothing silent, nothing lost"** (fix-first hardening): the
   sweep bug, action-error logging, RPC grant revokes + DB hardening migration,
   security headers, native-control theming, offline page, types-freshness CI
   gate, fail-loud crons + alerting, restore drill + runbook. ~9 small PRs, 1
   owner push.
2. **M6 — "A daily driver at 40 trees"**: batch logging, repeat-last, recency
   chips, quick-log fix, unarchive, thumbnails + SW photo cache + stable signed
   URLs, lightbox/compare, UI primitives + touch targets.
3. **M7 — "Safe to hand to a friend"**: OTP code login, allowlist + CAPTCHA,
   onboarding tour, hemisphere prompt, ES/EN i18n, usage analytics + admin v2 →
   **invite**.
4. **M8 — "It knows bonsai"**: species-category care intelligence, wiring
   tracker, weather prompts, email digest.
5. **M9 — "Anywhere, beautifully"**: offline outbox, photo-bucket backup,
   share links, desktop layout, year-in-review.

## 11. Health scores (1–5)

- **Clarity: 4** — vision, scope and 11 ADRs remain exceptionally sharp; docked
  because the always-loaded status files (CLAUDE.md/README) went two milestones
  stale *again* — the same defect the last audit flagged (fixed this edition,
  plus a DoD checkbox to keep it fixed).
- **Code quality: 4** — high-craft, strictly layered, compile-time-guarded;
  docked for the systemic silent catches, the sweep bug, and small duplication
  drift (form-field classes, CARE_FIELDS mirror).
- **Docs: 4** — enormous, honest, CHANGELOG↔git verifiably consistent; docked
  for the stale-status cluster and a runbook that didn't know two of the three
  shipped automations existed (fixed this edition).
- **Momentum: 5** — M1→M5 in 10 days / 59 commits with CI green throughout, the
  two long-deferred e2e DoDs actually closed rather than quietly dropped, and a
  live production user. The cadence question now is sustaining, not starting.
