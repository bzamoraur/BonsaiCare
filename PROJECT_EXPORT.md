# Project Export — Bonsai Companion (BonsaiCare)

> **Status:** Living — regenerated at each audit · **This edition:** 2026-07-11
> beta-readiness review, pinned to `origin/main` @ `4eb8cf3` ("Today summary +
> recent-photos", PR #113)
>
> Produced by a **10-lens multi-agent review** (core value, onboarding/i18n,
> content correctness, security/RLS, reliability/ops, data & code health, docs
> truth, toolchain execution, ambitious features) with **every critical/high
> finding adversarially re-verified at HEAD by an independent agent**, plus
> **first-party live-database checks** (RLS simulated as a stranger, FK
> constraints, function ACLs, storage policies, advisors) and **live GitHub
> checks** (branch protection, workflow runs, artifact visibility). The previous
> edition (2026-07-06, pinned to `10e991d`) is superseded by this one.
>
> Legend: **VERIFIED** = executed or traced in code/git/live-project by the
> reviewer. **CLAIMED** = stated in docs/config, not independently confirmed.

---

## 0. The five questions the control center needs (read this first)

**1. Which features work end-to-end vs are stubs?**
The core loop is **real, end-to-end, and tested** (VERIFIED): add a tree → log
care (4 ways: per-tree form, one-tap repeat-last, global quick-add sheet, batch
across many trees) → recurring tasks with hemisphere-correct season windows →
Today dashboard (overdue / due / next-7) → atomic RPC completion that spawns the
next occurrence. Also real: photos with thumbnails + lightbox + SW cache,
per-tree timeline, calendar (now with inline actions), archive/unarchive, full
JSON/CSV/photo export, true account deletion, dark mode, owner `/admin` metrics.
**The one advertised capability that is a stub: "species drives the care
schedule."** The `species` table and `default_care` seam exist and are seeded,
but **no runtime code reads them** — `species_id` is never written; trees carry a
free-text label for display only. **i18n is half-built:** nav/Today/Collection/
Settings + enum labels are translated ES/EN; login, calendar, plan, forms, tree
detail, and all error copy are still English-only.

**2. Where does species/care content come from, how much, accuracy control?**
Almost none ships, which is the safety story: the app is a **tracker, not an
advisor**. Content at HEAD = 15 seeded species rows carrying only a name + a
(horticulturally correct) category; **`default_care` is null by design**; one
fertilize preset ("every 14 days, Mar–Oct, skip winter" — mainstream-correct and
editable); a few factual example placeholders (Biogold, NPK 5-5-5, akadama). No
sources cited, no disclaimer, no review process — acceptable *only because so
little advice ships*. Dominant risk today is **no advice, not wrong advice**. The
one real wrong-behavior vector is the southern-hemisphere month-picker inversion
(below). The Spanish enum translations are human-quality and horticulturally
accurate.

**3. Shortest path to "a friend logs a real watering on their own phone"?**
Friend opens the URL → enters email → clicks magic link → lands on Today → taps
"+" (quick-add) or a tree → logs a watering. **This works today on desktop and
Android.** Blockers before it's safe/reliable for a real friend: (a) the public
backup leak must be fixed [Tier 1 #1]; (b) custom SMTP so invite-day emails
aren't rate-limited [#2]; (c) an installed iOS PWA hits a magic-link dead end
[#9]; (d) the first-run screen needs a CTA so they know where to go [#6].

**4. What must be true before friends' data goes in?**
The owner's bar: HTTPS-only · no plaintext creds · a delete path · a privacy
note. Status: HTTPS ✅ (Vercel; add HSTS). **No plaintext creds ❌ — currently
violated:** the weekly DB backup (with `auth.users` — emails, bcrypt hashes,
sessions) is an unencrypted, world-downloadable artifact on a **public** repo.
Delete path ✅ in-app, but the B2 mirror never purges (disclose + manual step).
Privacy note ❌ — none exists. **Two of four bar items fail today.** Full gate:
[ROADMAP.md Tier 1](ROADMAP.md).

**5. The single highest-leverage improvement now?**
**Fix the backup leak (Tier 1 #1) — one hour, non-negotiable.** For *value* (not
safety), the highest-leverage build is **species care sheets + "suggest a care
plan"**: the one change that turns a good logbook into the "it knows bonsai"
product the pitch promises.

---

## 1. Snapshot

- **Name:** Bonsai Companion (folder `BonsaiCare`, `github.com/bzamoraur/BonsaiCare`, **public**, proprietary licence)
- **Date:** 2026-07-11 · **113 PRs** merged; 10 migrations; live on Vercel against Supabase `Bonsai_App` (eu-west-3, ACTIVE_HEALTHY, Postgres 17 — VERIFIED via API)
- **One-liner:** a calm, photo-first bonsai care & tracking PWA — collection, photos, unified care timeline, recurring season-aware tasks, a Today dashboard, full export, real deletion.
- **Stage:** **Phase-1 MVP feature-complete + Sprint 08 hardening + most of M6 daily-driver shipped, i18n foundation pulled forward.** **Not yet in the M7 "safe for friends" gate** — 1 critical + several high beta-blockers stand between HEAD and the first invite (§5). Real-world usage so far: **1 user, 1 tree, 1 photo, 11 care logs, 10 tasks** (VERIFIED live) — the owner; no multi-user production load has ever occurred.

## 2. What this repo contains

A private web app where a user signs in with an email magic link and runs a real
bonsai collection: add trees (structured profile, tags, locations), photograph
them (client-compressed WebP + a ~320px thumbnail into a private bucket, signed
URLs), log every kind of care into one merged per-tree timeline, plan one-off and
recurring tasks with hemisphere-aware season windows, and start each day from a
Today dashboard. Batch care logs many trees at once; a global "+" quick-adds care
or a photo from anywhere. Settings offers dark mode, EN/ES, full JSON/CSV/photo
export, and true account deletion. An owner-only `/admin` shows aggregate usage.
Around the code: an unusually complete doc set (12 ADRs, roadmap, sprints,
runbook) and four scheduled GitHub Actions (keep-warm, weekly DB backup, monthly
B2 photo mirror, storage-orphan sweep).

**Tech stack (VERIFIED):** Next.js 16.2.10 (App Router, RSC + Server Actions,
`proxy.ts` middleware, Turbopack), React 19, TypeScript strict, Tailwind 4,
minimal shadcn/base-ui, **next-intl 4** (cookie locale, EN/ES), Supabase
(Postgres 17 + Auth + Storage, RLS on every table), Zod 4 (JSONB payloads),
fflate (zips), pnpm, Vitest, Playwright (authed e2e in CI), pgTAP (9 suites),
GitHub Actions, Vercel Hobby.

## 3. What works today

**VERIFIED by execution at HEAD (this machine, clean tree):**

- `pnpm typecheck` — 0 errors · `pnpm lint` — 0 errors (1 warning, in an
  uncommitted WIP file) · `pnpm format:check` — clean
- `pnpm test` — **14 files, 174/174 unit tests pass**, none skipped (~14s)
- `pnpm build` — production build succeeds, **21 routes** + middleware

**VERIFIED by code trace + live-DB/GitHub checks:**

- **The core loop is real end-to-end**, backed by genuinely correct domain logic
  (`src/domain/scheduling.ts`: overdue boundaries, hemisphere-inverted season
  windows with year-wrap, next-due computation; 307 lines of tests). Completion
  is an atomic, RLS-respecting RPC (`FOR UPDATE`, status guard, next-occurrence
  spawn in one transaction).
- **Security spine — verified on the live database, not just the repo:** RLS
  enabled with per-command owner policies on all 9 user tables (a simulated
  stranger sees 0 rows); the hardening migration's **composite `(id, owner_id)`
  FKs really close the cross-owner attach vector** for photos/care/tasks/tags
  (behaviorally pgTAP-tested); `anon` EXECUTE revoked on every function; all
  functions run `search_path=''`; `owner_metrics` gated in-DB and fails closed;
  storage bucket private + 4 path-scoped policies; security headers live (CSP,
  `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy).
- **Deletion & export are the real thing:** deletion cascades every table +
  removes storage objects (thumbnails included), gated behind typing DELETE;
  export covers all 9 tables with a compile-time exhaustiveness guard.
- **Ops is much improved:** 3 of 4 crons fail loud (red run + auto-filed GitHub
  issue); every server catch logs; the orphan-sweep pagination bug is fixed +
  unit-tested; a restore drill was performed. **Branch protection is enforced**
  on `main` (required checks, no force-push, linear history — VERIFIED via API).
- **DB types are current** (all 9 tables, 3 RPCs, every enum, the `occurred_on`
  rename) and a CI gate boots Supabase, regenerates, and fails on drift — the old
  "stale types block care-logging" note is **closed**.

**CLAIMED / not independently confirmed:** hosted custom-SMTP setting (dashboard
config, not in repo — repo evidence says built-in sender still); the B2 mirror's
first *scheduled* run (armed 07-06, first cron 07-15, no run recorded yet);
individual green cron runs cited in `production-state.md`.

## 4. In progress / half-built (VERIFIED status)

| Item | State at HEAD | What finishing takes |
|---|---|---|
| **Species intelligence** | **Still fully dormant.** Schema + seed exist; zero runtime reads; `species_id` never written. The pitch's #1 differentiator. | Species picker → category care rules → Today suggestions (M8 / ROADMAP Tier 2 Wave B) |
| **i18n ES/EN** | **~half done.** Nav/Today/Collection/Settings + enum labels translated; login, calendar, plan, quick-log, forms, tree detail, and **all error copy** English-only; dates pinned `en-GB`; no `Accept-Language` default | Surface-by-surface rollout of the week-1 screens + locale-aware formatting (ROADMAP Tier 2 Wave A) |
| **Proactive reminders** | **None** — pull-only by design (ADR-0007). No push/email/notification code | Email digest (M8); web push later |
| **M6 tail** | S10.4 loading skeletons, S10.6 export robustness, S10.7 `listTreeOptions` — **not built** | Small; ROADMAP Tier 2 Wave A |
| **M7 friends-release gate** | **0 of 8 items fully done** — only i18n partially built; OTP login, allowlist+CAPTCHA (signup still open), hemisphere onboarding, species combobox, first-run tour, usage analytics/admin v2, install promotion all remain | Sprints 11–12 (ROADMAP Tier 1 + Tier 2 M7 gate) |
| **Sentry** | Deferred — uninstallable on Next 16; boundaries + Vercel logs interim | Revisit when installable; or the `app_errors` table (ROADMAP Tier 1 #7) |

*Since the 2026-07-06 edition, these previously-half-built rows **shipped**: batch
logging, archived view + unarchive, calendar inline actions, honest offline page,
thumbnails + lightbox + SW photo cache, quick-add sheet.*

## 5. Top risks & debt (worst first, VERIFIED at HEAD)

1. **[CRITICAL] The weekly DB backup is a publicly downloadable artifact.**
   `backup.yml` uploads the unencrypted dump (schema + data, **including
   `auth.users` — emails, bcrypt hashes, session/refresh tokens**, proven by the
   owner's own restore drill) as a 90-day GitHub artifact. The repo is **public**,
   so any logged-in GitHub user can download it. One artifact
   (`db-backup-28816036702`, 2026-07-06) **is live right now**; the Sunday
   05:00 UTC cron adds a fresh one weekly. **Fix before friend #1:** encrypt the
   dump or push to the private B2 bucket; delete existing `db-backup-*` artifacts.
   *(Adversarially confirmed critical.)*
2. **[HIGH] Invite-day email lockout.** Magic-link on Supabase's built-in sender
   (~2 emails/hour, project-wide). A 5-friend cohort signing up the same day gets
   "email rate limit exceeded". Fix: custom SMTP (Resend) — no code change.
3. **[HIGH] iOS installed-PWA magic-link dead end.** Link opens in Safari; PKCE
   verifier is in the PWA's isolated storage → exchange fails → `/login?error=auth`
   → and the login page **ignores that param**, so the friend sees a blank form.
   Two fixes: OTP code entry (best) and reading the `error` param (cheap).
4. **[HIGH→MEDIUM] The owner is nearly blind to failures.** Server catches log
   only to Vercel Hobby (~1h retention, no alerting); **client-side crashes report
   nothing**; two `DYNAMIC_SERVER_USAGE` false-alarm error lines pollute the very
   channel the owner watches. Fix: `app_errors` table + boundary beacon; strip the
   false alarms.
5. **[MEDIUM] No privacy note; B2 mirror never purges on deletion.** Friends get
   zero disclosure of what's stored/where; a deleted friend's photos persist in
   the owner's off-site bucket forever. Fix: one privacy page + a runbook purge
   step.
6. **[MEDIUM] First-run false reassurance.** Today says "All caught up · Enjoy
   your trees 🌱" to a user with zero trees *or* zero schedules, with no CTA to
   add a tree or plan care. Every friend hits this.
7. **[MEDIUM] Southern-hemisphere month-picker inversion.** Custom season windows
   are stored/displayed literally but the engine shifts them 6 months, so a
   southern friend's pick lands in the wrong season (the Mar–Oct default is fine).
   *Promote to blocker if any invited friend is southern-hemisphere.*
8. **[MEDIUM] Storage RLS tested existence-only.** The policies are correct and
   live, but no behavioral pgTAP proves cross-user photo access is denied — a
   predicate regression would pass CI green.
9. **[LOW] Residual:** 5 secondary FKs still single-column (uuid-existence oracle,
   no leakage); SW photo cache not purged on sign-out (shared-device residue); no
   HSTS header (Vercel likely adds it); signup fully open (fine while URL is
   unlisted); tree-detail page is 611 lines.

## 6. What's genuinely excellent

Hemisphere-correct scheduling that beats most competitors; a real dated photo
archive with thumbnails + lightbox + offline cache; textbook multi-tenant
security verified on the live DB; an atomic completion RPC; 174 unit tests + 16
e2e journeys + 9 pgTAP suites that are real coverage, not theatre; zero `any`/
`ts-ignore` in `src`; an unusually honest and complete doc set.

## 7. Security check

- **Secrets committed: NO** (only `.env.example`; service-role key confined to
  ops scripts + CI). VERIFIED.
- **RLS: exemplary and live-verified** — per-command owner policies on all 9
  tables; a simulated stranger and `anon` both see 0 rows; composite FKs close
  cross-owner writes; functions locked down; `anon` EXECUTE revoked (live).
- **Live advisors:** only the two intentional `authenticated`-EXECUTE WARNs on
  `owner_metrics`/`delete_my_account` (both gated/safe by design) + leaked-password
  protection off (moot — passwordless). No anon findings.
- **The real exposure is operational, not RLS:** the public backup artifact
  (§5.1) is the one genuine data-exposure bug, and it's an ops/config mistake, not
  an app attack surface.

## 8. Costs & services

Supabase Free · Vercel Hobby · GitHub Free (public) · Backblaze B2 (free tier,
photo mirror). **€0/month, no paid dependency.** Adding **custom SMTP (Resend
free tier)** is the one new free service the beta needs. Watch-items: Supabase
auth-email cap (fixed by SMTP), egress (mitigated by the SW photo cache),
Actions minutes (unbounded now that the repo is public).

## 9. Recommended next work

Execute **[ROADMAP.md](ROADMAP.md) Tier 1** in order (backup leak → SMTP →
privacy note → delete-path → auth dead-end → first-run CTA → error visibility →
feedback → iOS decision → arm/verify ops), then invite one friend, then the rest.
Then Tier 2 (finish M6 tail + photo-progression wave → species care sheets →
weather/digest/wiring). Sprint-level detail:
[docs/roadmap/improvement-plan.md](docs/roadmap/improvement-plan.md).

## 10. Health scores (1–5)

- **Clarity: 4** — vision and 12 ADRs remain sharp; docked because the
  always-loaded status docs (CLAUDE.md/README/roadmap) went ~3 sprints stale
  *again* — the repeat defect prior audits flagged (corrected this edition).
- **Code quality: 4.5** — high-craft, strictly layered, strict-typed, real tests;
  docked only for the one 611-line page and the half-done i18n surface.
- **Security: 4** — the RLS/deletion/export core is a 5; dragged down to a 4 by
  the critical backup-artifact leak, which is exactly the kind of ops mistake that
  ends a friends beta badly. Fix it and this is a 5.
- **Docs: 4** — enormous and honest, but the status cluster and CHANGELOG (missing
  PRs #105–#113) drifted; corrected here.
- **Momentum: 5** — 113 PRs, CI green throughout, hardening + a full daily-driver
  milestone + an i18n retrofit since 07-06. The question is sustaining, not
  starting.
