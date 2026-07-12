# Project Export — Bonsai Companion (BonsaiCare)

> **Status:** Living — regenerated at each milestone audit · **This edition:** 2026-07-06 (M5 close), **refreshed in place 2026-07-12** through `main` @ `05150ff` (#138). Sprint 08 hardening, most of M6 daily-driver, full ES/EN i18n, durable error logging, OTP sign-in, and the B2 mirror/purge have since shipped and are reflected below; a full milestone **regeneration is still due** (the file/LOC/dep counts and the 2026-07-06 execution run below want re-measuring).
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

- **Name:** Bonsai Companion (repo folder: BonsaiCare, `github.com/bzamoraur/BonsaiCare`, **public** — went public in Sprint 08, license stays proprietary)
- **Date:** 2026-07-12 (repo age: 16 days; **132 commits**; **12 migrations** — high-water `20260711130000`; the tracked-file / LOC / runtime-dep counts predate #58 and want re-measuring on a full regeneration)
- **One-liner:** A calm, photo-first bonsai care & tracking PWA (Next.js 16 + Supabase) — collection, photos, unified care timeline, recurring tasks with season-aware scheduling, a Today dashboard, full data export, and real account deletion.
- **Stage:** **Working — Phase 1 MVP shipped; friends-release hardening largely done.** M1–M5 plus Sprint 08 fix-first hardening and most of the M6 daily-driver pass shipped through PRs #2–#138 with green CI; deployed on Vercel against a live Supabase project (`Bonsai_App`, eu-west-3, ACTIVE_HEALTHY, Postgres 17 — VERIFIED via API); the owner is a live daily user and has live-tested account deletion. The ES/EN i18n friends-release gate is now **BUILT** (full Spanish, #109–#132). The 2026-07-06 audit's **1 critical + 4 high** findings are now largely **FIXED**: orphan-sweep pagination (S08), unencrypted backup (#116), anon RPC EXECUTE (S08 grant revokes), silent Server-Action catches (error logging #134/#135), and the iPhone magic-link dead end (OTP #137). Remaining friends-release work, per the [improvement plan](docs/roadmap/improvement-plan.md): registration allowlist + CAPTCHA and onboarding.

## 2. What this repo contains

**Plain language:** A web app where users sign in with an email magic
link (or a 6-digit code fallback) and run a real bonsai collection: add trees (structured profile, tags,
locations), photograph them (client-compressed WebP into a private bucket,
signed URLs), log every kind of care into one merged per-tree timeline
(waterings, fertilizing, pruning, wiring, repotting… each with typed, validated
details), plan one-off and recurring tasks with hemisphere-aware season windows,
and start each day from a Today dashboard (overdue / due / upcoming + health
triage). Cross-tree schedules ("fertilize these 12 every 14 days, Mar–Oct") are
one form. Settings offers dark mode, full JSON/CSV/photo-zip export, and true
account deletion (every row and photo). An owner-only `/admin` page shows
aggregate usage metrics and a durable, PII-poor error log (client-boundary +
server crashes). The whole UI is bilingual (English + Spanish). Around the code:
an unusually complete doc set (ADRs, roadmap, sprints, runbook, setup guides) and
five scheduled GitHub Actions (keep-warm, an AES-256-encrypted weekly DB backup,
a monthly Backblaze B2 photo mirror, a storage-orphan sweep, and a monthly B2
delete-path purge).

**Tech stack (VERIFIED):** Next.js 16.2.9 (App Router, RSC + Server Actions,
`proxy.ts` middleware, Turbopack), React 19.2.4, TypeScript strict, Tailwind 4,
minimal shadcn/base-ui, Supabase (Postgres 17 + Auth + Storage, RLS on every
table), Zod 4 (JSONB payloads), fflate (server-side zips), next-intl 4 (cookie-locale ES/EN i18n), pnpm 11, Vitest 4,
Playwright (authed e2e in CI), pgTAP (7 suites), GitHub Actions, Vercel Hobby.

## 3. What works today

**VERIFIED by execution (2026-07-06, this machine, tree byte-clean throughout):**

- `pnpm typecheck` — 0 errors · `pnpm lint` — 0 errors/warnings
- `pnpm test` — 9 files, **128/128 unit tests pass** (17s)
- `pnpm build` — production build, **20 routes** + middleware, 0 warnings

**VERIFIED by code trace + hosted checks:**

- **The full feature surface is real** — every MVP-scoped feature exists end to
  end (collection, photos, timeline, tasks/recurrence/RPC-atomic completion,
  Today, calendar with inline actions + forward projection, cross-tree scheduler,
  export trio, deletion, dark mode, bilingual EN/ES UI, and a hemisphere-aware
  seasonal-focus card). The product lens's verdict: "a rare case where the
  feature-complete claim survives code-level inspection."
- **Security spine:** per-command owner RLS on all 9 user tables with
  *behavioral* pgTAP (~100 assertions, cross-user denial per command, RPC
  denial, full deletion cascade); both SECURITY DEFINER RPCs hardened
  (auth.uid()-only targeting, empty search_path); secrets history forensically
  clean; service-role key confined to Actions.
- **e2e harness:** cookie-capture auth against a real CI Supabase stack; 4
  specs including the M3 log→timeline and M4 daily-loop journeys.
- **Hosted project:** ACTIVE_HEALTHY; all **12** migrations pushed (owner-verified
  2026-07-11; high-water `20260711130000` — adds `app_errors` + `b2_purge_queue`);
  `OWNER_USER_ID` set in Vercel → `/admin` live (now also the "Recent errors"
  view); account deletion live-tested by the owner with a throwaway account.

**CLAIMED / unverified:** Vercel production env parity. The scheduled Actions are
now **armed** (the weekly DB backup requires `BACKUP_ENCRYPTION_KEY` and fails
loud without it; the B2 mirror/purge reuse the B2 key); the restore drill was
performed 2026-07-08 (against a pre-encryption plaintext dump — the `openssl`
decrypt path is not yet drill-tested).

## 4. In progress / half-built

Most of the 2026-07-06 half-built list has since shipped — batch care logging
(#83), archived view + unarchive (#92), the honest offline page (S08.6),
thumbnails + lightbox (#101/#102), and calendar inline actions + forward
projection (#127) are all done (see CHANGELOG). What remains:

| Item | State (VERIFIED 2026-07-12) | What finishing takes |
|---|---|---|
| **Friends release** | Signup still open to anyone with the URL; no onboarding tour; no usage analytics. **ES/EN i18n, OTP login, and durable error logging have shipped** | The remaining M7 gate: allowlist + CAPTCHA, first-run tour, `usage_events` + admin v2 |
| **Species intelligence** | Schema fully built & seeded (species table, category enum, `default_care` seam) but **no scheduling code reads it yet** — the product's #1 differentiator is still mostly dormant; the seasonal-focus card (#138) is the first M8 slice to read season | Species combobox on tree forms, then category-level care rules → Today suggestions (M8) |
| **Offline (write queue)** | The offline *page* is now honest (S08.6), but there is still no care-log outbox / write queue | Care-log outbox + real shell caching (M9) |
| **Sentry** | Still deferred — `@sentry/nextjs` uninstallable on Next 16 (broken transitive dep). **The durable `app_errors` log + /admin viewer (#134/#135) is now the interim**, not just Vercel logs | Revisit when installable; `app_errors` is the seam |

## 5. Top risks & debt (worst first)

1. **✅ FIXED (Sprint 08 first wave).** The once-critical orphan-sweep bug —
   `reconcile-storage.mjs` read the `photos` table unpaginated while PostgREST
   silently caps responses at 1,000 rows (Storage listing IS paginated), so rows
   beyond the cap looked like orphans and the monthly run would delete their
   objects — is fixed: a keyset-paginated read + a pathological-deletion guard
   shipped (17 unit tests). The sweep is now safe to arm.
2. **✅ FIXED — photo bytes now have an off-site copy, and the backup is encrypted
   + drilled.** A monthly Backblaze B2 mirror (`photo-backup.yml`, incremental,
   never deletes) copies the bucket off-site, and the restore drill was performed
   2026-07-08. The weekly DB dump is now **AES-256-encrypted** (`backup.yml` fails
   loud without `BACKUP_ENCRYPTION_KEY`), closing the beta-readiness CRITICAL that
   a public-repo artifact leaked `auth.users`. (Caveat: the drill used a
   pre-encryption plaintext dump, so the `openssl` decrypt path is not yet
   drill-tested.)
3. **✅ FIXED — write failures are now recorded.** The S08 first wave added
   `logActionError` at 31 server-side sites, and #134/#135 added a durable
   `app_errors` table + `/api/log-error` beacon so client-boundary and server
   errors persist and surface on `/admin` — no longer discarded silently.
4. **✅ PARTLY FIXED — the iPhone login dead end is closed.** A 6-digit OTP code
   entry shipped (#137, `verifyOtp` type `'email'`; the email now also carries
   `{{ .Token }}`), so a magic link that opens in a non-cookie-sharing in-app
   browser can be completed with the code instead. Still open: **open registration
   + an unthrottled OTP sender** — the allowlist + CAPTCHA gate (M7) is the
   remaining friends-release blocker.
5. **⚠ PARTLY ADDRESSED.** Since the repo went **public** in S08, branch
   protection now **enforces** the three CI checks on `main`, `production-state.md`
   records what's armed, and the crons fail loud + auto-file "Ops alert" issues.
   Residual: Vercel still deploys `main` regardless of CI, so a deploy hook / CI
   gate on deploys is the remaining lever.
6. **✅ FIXED (Sprint 08).** The anon/`public` EXECUTE grant on the three SECURITY
   DEFINER functions (`owner_metrics`, `delete_my_account`, `complete_task`) was
   revoked, and `owner_metrics` is additionally gated inside the DB (its counts
   return only to the configured owner, `NULL` to anyone else). The prior gap —
   anyone with the publishable key calling `owner_metrics()` unauthenticated — is
   closed.

## 6. Open product questions (owner decisions)

1. **Registration mode** before inviting: allowlist (recommended) vs open —
   **still open** (the main remaining M7 blocker; OTP login shipped, but the
   allowlist/CAPTCHA gate isn't built).
2. **Make the repo public? — DECIDED: went public** in Sprint 08 (free branch
   protection now enforced; license stays proprietary). App-store publication is
   researched separately in `docs/roadmap/going-public-plan.md`.
3. **Photo-backup destination — DECIDED: Backblaze B2** (`photo-backup.yml` mirror
   + `b2-purge.yml` delete-path; the app runtime holds zero B2 credentials by
   design).
4. **`occurred_at` semantics — DECIDED: calendar `date`** (ADR-0012, with a
   `created_at` ordering tiebreaker).
5. **i18n approach — DECIDED: next-intl 4 with a cookie-resolved locale** (not a
   typed dictionary, not a `profiles` column); English fallback + Accept-Language
   default. ADR still owed (proposed 0016).
6. **Offline scope ADR — still open:** commit to "shell + queued care-log capture,
   nothing more" so Phase 2 never accidentally promises local-first.
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

_Update 2026-07-12: the S08 pagination fix merged, the repo went public, and the
restore drill ran (2026-07-08), so the sweep is safe to arm. Remaining owner
calls: the Vercel function region and the Turnstile CAPTCHA before the first
invite, plus generating + escrowing `BACKUP_ENCRYPTION_KEY` for the encrypted
backup._

## 8. Costs & services

| Service | Tier | Used for | Monthly cost |
|---|---|---|---|
| Supabase | Free | Postgres 17 + Auth + Storage + RLS (eu-west-3) | €0 |
| Vercel | Hobby | Hosting (non-commercial) | €0 |
| GitHub | Free (public) | Repo, CI, 5 scheduled ops crons | €0 |

**Total: €0/month (VERIFIED — no paid dependency).** Watch-items: **GitHub
Actions minutes** — no longer a real risk since the repo went **public** in S08
(unlimited Actions minutes; S08 also added CI caching) — and **Supabase egress**
(5 GB/mo; the M6 service-worker photo cache keyed by the token-stripped path
(#111) now spares repeat photo views, leaving only first-view / server-side
signed-URL churn as a small tens-of-MB/month residual).

## 9. Security check

- **Secrets committed: NO** — re-verified by git-history forensics this audit.
- **RLS: exemplary** — per-command owner policies on all 9 tables, behaviorally
  pgTAP-tested in CI; both definer RPCs textbook-hardened *in the migrations*.
- **Hosted advisor findings (2026-07-06 edition):** anon EXECUTE on the 3 definer
  functions (default-privileges gap — **fixed in S08** by explicit revokes + an
  in-DB owner gate); leaked-password protection off (moot — passwordless app); 7
  unused indexes (expected at this scale, deliberately kept for the query patterns
  they serve).
- **Gaps, addressed in S08 (✅):** security headers now set (CSP with
  `frame-ancestors 'none'`, nosniff, Referrer-/Permissions-Policy); owner-
  consistency composite FKs block cross-owner references; all Actions are
  SHA-pinned; and the auth-callback `next` param is guarded. (Storage policies
  remain tested existence-only.)
- **Alarming: nothing.** The one data-loss-class item is the sweep bug (risk #1),
  an automation bug rather than an attack surface.

## 10. Recommended next work

The full sequenced plan lives in
[docs/roadmap/improvement-plan.md](docs/roadmap/improvement-plan.md). Shape (as of
2026-07-12, item 1 and most of item 2 have shipped, plus the ES/EN i18n and OTP
slices of item 3; the list below is the original sequence):

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
