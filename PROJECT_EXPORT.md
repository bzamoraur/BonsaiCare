# PROJECT_EXPORT — Bonsai Companion (BonsaiCare)

Audit date: **2026-07-05** · Auditor: Claude (multi-agent repo audit: 5 parallel readers over docs/code/db/CI + a verifier that executed the toolchain) · Repo: `github.com/bzamoraur/BonsaiCare`, branch `main` @ `0f08a42`

Legend used throughout: **VERIFIED** = executed or traced in code/git by the auditor. **CLAIMED** = stated in docs/comments/config, not independently confirmed.

---

## 1. Snapshot

- **Name:** Bonsai Companion (repo folder: BonsaiCare)
- **Date:** 2026-07-05 (repo age: 9 days, 2026-06-26 → 2026-07-04; 18 commits, 131 tracked files, ~16k lines incl. docs/lockfile)
- **One-liner:** A personal bonsai care & tracking PWA (Next.js + Supabase) — collection, photos, and care timeline for one serious hobbyist.
- **Stage:** **Prototype, on the way to MVP.** A polished, working vertical slice exists (auth + tree collection + photos + search/filter + settings), but the features that *are the product* — care logging, tasks/recurrence, the "what needs attention" dashboard, export — are placeholders or schema-only. Two of the four app tabs render static "coming soon" text. Not empty, not MVP: a high-quality prototype roughly at milestone M2.5 of 5.

## 2. What this repo contains

**Plain language:** A private web app where the owner signs in with an email magic link and manages a bonsai collection: add trees with species/stage/health details, upload photos (compressed in the browser, stored privately, cover photo per tree), organize with tags/locations, and search/filter/sort the collection. The care-logging timeline exists **only as a database schema**; the task calendar and the "Today" dashboard exist **only as placeholder pages**. Around the code sits an unusually large, high-quality documentation set (35 markdown files: product brief, MVP scope, 11 ADRs, roadmap, cost model, setup guides, UX principles) — the docs describe the *finished* product, not the current one.

**Tech stack (VERIFIED in package.json / config):** Next.js 16.2.9 (App Router, Turbopack), React 19, TypeScript strict, Tailwind 4, `@base-ui/react` + one shadcn-style button, Supabase (`@supabase/ssr` + `supabase-js`, Postgres/Auth/Storage with RLS), pnpm 11, Vitest (unit), Playwright (e2e scaffold), pgTAP (SQL/RLS tests), GitHub Actions CI, Vercel Hobby as the (dashboard-side, unauditable from repo) deploy target.

**Note:** CLAUDE.md claims TanStack Query, react-hook-form, and Zod are part of the stack — **none of the three is installed** (VERIFIED). Validation is hand-rolled.

## 3. What works today

**VERIFIED by execution (2026-07-05, this machine):**
- `pnpm typecheck` — 0 errors · `pnpm lint` — 0 issues · `pnpm format:check` — clean
- `pnpm test` — 3 files, **23/23 unit tests pass** (all pure domain logic: tree-form parser 12, tags 6, scheduling 5)
- `pnpm build` — production build succeeds, 11 routes + middleware, zero warnings (consumed the local `.env.local`; fresh-clone build without env vars unverified)
- Working tree stayed byte-clean through all of the above.

**VERIFIED by end-to-end code trace (not live-clicked):**
- **Magic-link auth spine:** login → OTP email → PKCE callback → session refresh in `src/proxy.ts` middleware → all non-public routes redirect to /login. One dead path: a failed/expired link redirects to `/login?error=auth`, which the login page never reads — the user gets zero feedback.
- **Collection (M2), complete for its scope:** list/add/detail/edit, soft-archive, tags (create-on-the-fly, capped/deduped), locations (find-or-create), debounced search + filter/sort with sanitized PostgREST queries, defensive URL-param parsing.
- **Photo pipeline:** client-side WebP compression (max 1600px, EXIF-stripped by re-encode), upload to **private** bucket, server action re-verifies tree ownership *and* storage path prefix before recording, signed URLs (1h), set-cover, delete.
- **Security layer:** every user table has RLS with per-command owner policies; `src/server/*` uses only the cookie-scoped publishable-key client; **zero** service-role/secret-key references in `src/` (grep-verified); 49 pgTAP assertions across 3 suites test cross-user isolation.

**CLAIMED / unverified from here:**
- CI green on GitHub (workflow file VERIFIED to run typecheck/lint/test/build **plus** pgTAP against a Dockerized Supabase — the actual runs weren't inspected).
- A live Vercel deployment and a live Supabase project (a project is linked locally; no `vercel.json` or deploy workflow exists in-repo — the production pipeline is entirely dashboard-configured and unauditable from source).
- The keep-warm cron actually pinging anything (see risk #4 — it's green even when it does nothing).
- Any e2e behavior: the whole Playwright suite is **one page-title assertion**, excluded from CI.

## 4. In progress / half-built

| Item | State (VERIFIED) | What finishing takes |
|---|---|---|
| **M3 care log / timeline** | DB schema + 9 pgTAP assertions merged (HEAD commit); **zero** app code references it; `src/types/database.types.ts` **not regenerated** — the new table/enum/column are missing from types | Regenerate types (5 min, needs Supabase CLI login); build log-entry form + per-tree timeline merging events+photos by date; add the promised per-type `details` validation (currently *any* JSON is accepted — no CHECK, no validator). ~2–3 sessions |
| **Today dashboard** | Static placeholder paragraph — yet docs call it "the source of truth" | Blocked on M4 tasks; then overdue/today/upcoming queries + UI. ~1–2 sessions after M4 |
| **Calendar / tasks / recurrence** | Static placeholder. `isOverdue()` exists, is tested, and is **dead code** (imported only by its test). Season/recurrence logic: absent | The real M4: tasks table + migration, recurrence engine (interval + season window per ADR-0006), complete/skip flow. The largest remaining build. ~3–4 sessions |
| **Quick-add button** | Disabled stub labeled "Soon" in the nav | Trivial once there's something to quick-add |
| **CSV/JSON export** | Not started, despite being golden rule 7 and ADR-0008 ("first-class MVP feature") | Server route serializing owned rows + photo manifest. ~1 session |
| **Archive management** | Archiving is one-way: no archived view, no unarchive; archived trees reachable only by typing the URL | Small: archived filter + restore action. ~half session |
| **Offline/PWA** | Installable manifest+icons are real; service worker precaches only `/` + manifest — offline is effectively one stale cached page | Adopt Serwist (already name-dropped in sw.js comment). ~1 session |
| **Dark mode** | Full `.dark` CSS palette exists; nothing ever applies the class; meanwhile browser-chrome theme color *does* follow the OS — mismatched on dark phones | Small toggle or media-query wiring. ~half session |
| **Tag/location management** | Create-only; no rename/delete — stale entries accumulate in filters forever; location find-or-create is racy (JS-side match, no upsert) | Management UI + unique constraint. ~1 session |

## 5. Top risks & debt (worst first)

1. **The always-loaded agent context is false.** CLAUDE.md still says "Phase 0 — docs only, no app code yet" while ~50 source files, 4 migrations, and CI exist. It also claims an uninstalled stack (Zod/TanStack Query/react-hook-form) and a nonexistent layout (`src/features/`, `supabase/seed/`). Since development here is heavily agent-driven, every future session starts misinformed. Compounding it: README stale by 2 milestones, sprint-01.md still "planned", the domain-model doc's enum diverges from the shipped one (`pest_disease`/`photo_only` vs `pest_treatment`/nothing) with no ADR.
2. **Generated DB types are stale as of the newest commit.** The M3 migration added `care_log_entries`, a 10-value enum, and `photos.care_log_entry_id`; none are in `src/types/database.types.ts`. The first M3 feature code will be written against wrong types — the exact drift the generated-types setup exists to prevent.
3. **Ownership invariants live only in app code, and the DB tests have a blind spot.** RLS policies check `owner_id` only; Postgres FK validation bypasses RLS, so an authenticated user hitting PostgREST directly can attach photos/care-entries/tag-links to *another user's tree* (with their own owner_id) and point `cover_photo_id` at any photo UUID. No data leaks (selects stay owner-scoped), but it's a UUID-existence oracle and pollutes referential integrity. Worse: the storage path-scoping policies are tested for *existence only* — a logic bug in the path predicate would pass all 49 assertions. Bucket size/mime limits: zero test coverage.
4. **Silent-failure operations.** Every server-action catch swallows the error with no logging (against the repo's own "no silent catches" rule) — production failures are undiagnosable. The keep-warm workflow **fails open**: missing secrets or a dead curl both exit 0, so it shows green while protecting nothing; a paused free-tier Supabase project would be discovered only when the app breaks. No security headers (CSP/HSTS/X-Frame-Options) anywhere — `next.config.ts` is empty boilerplate.
5. **Test coverage is an illusion outside `src/domain`.** 23 unit tests cover three small pure functions well; zero component tests exist despite fully configured testing-library/jsdom infra; the e2e "suite" is one title assertion excluded from CI; server actions and `src/server/*` are untested. The green CI badge certifies hygiene, not feature correctness.

## 6. Open product questions (owner decisions)

From the docs' own open items: Phase-2 notification priority (email digest vs web push — "prioritize by lived friction"); Google OAuth trigger point (ADR-0010); custom SMTP if magic-link delivery degrades; Vercel Pro vs Cloudflare if ever commercial (ADR-0003); open-sourcing (ADR-0009); weather-aware watering (parking lot); visual/typography direction. Newly surfaced by this audit and needing an owner call: **adopt Zod for real or rewrite the docs around hand-rolled validation** (the current docs describe fiction); **archived-tree restore UX**; **hard-delete policy** (today a hard delete would orphan storage objects); **reconcile the care-event enum** rename that bypassed the domain-model doc.

### Project-specific questions — answered honestly

> ⚠️ **These five questions do not match this repository.** They describe a trading/market-signals project (signals, backtesting, data feeds, rate limits). BonsaiCare is a bonsai-care PWA and contains **nothing of the kind** — no signals, no market data, no financial logic. Verified by full-repo read. The control center likely has these questions attached to the wrong repo. Answers below state that plainly, then give the nearest in-repo analog so they're still useful.

1. **Which signals are implemented, and what is each based on?** No trading signals exist. The only "signal-like" logic in the entire repo is `isOverdue(task, today)` — a one-line pure function (`status === "pending" && dueOn < today`) that is unit-tested and **dead code** (no task feature exists to call it). The "species category drives scheduling" concept — the product's master variable — has zero implementation.
2. **Does any backtesting or forward performance record exist?** No. Nothing resembling backtesting, performance tracking, or analytics exists — no historical evaluation of anything. (There isn't even app-level telemetry; that's deliberate per the privacy stance.)
3. **Data sources, keys, costs, rate limits, key storage — any committed?** No external data APIs at all. Services: Supabase (free tier: ~500 MB DB, 1 GB storage, pauses after ~7 days idle), Vercel Hobby, GitHub Actions. Keys: only public-class values (`NEXT_PUBLIC_SUPABASE_URL`, publishable key, site URL) in an uncommitted `.env.local`, in the Vercel dashboard (claimed), and as two GitHub Actions secrets. **No secret-class key exists even locally** (the `sb_secret_` lines in `.env.local` are commented-out template placeholders, byte-identical to `.env.example`), and git-history forensics (`log --all`, `ls-files`, pattern grep) confirm **no env file or secret was ever committed.** Cost: €0/month.
4. **Does anything run on a schedule?** Yes, exactly one thing: `keep-warm.yml`, a GitHub Actions cron (`0 6 */3 * *` — every ~3 days, 06:00 UTC) that curls the Supabase REST endpoint with the publishable key to prevent free-tier auto-pause. Caveat: it exits 0 on missing secrets *and* on curl failure, so it may be silently doing nothing. CI runs on push/PR. Everything else is manual.
5. **Minimal honest validation of ONE signal?** Not applicable as asked — there is no signal to validate and no benchmark to beat. The nearest meaningful equivalent for *this* repo: once M4 recurrence ships, validate the scheduling engine against one month of the owner's real care log (data: actual watering/fertilizing dates for ~10 trees; period: one season transition, e.g. Sep–Oct; benchmark: does the Today dashboard's overdue/upcoming list match what the owner, as a domain expert, says each tree actually needed?). That is the product's core-correctness test, and nothing like it exists yet.

## 7. Human tasks discovered

Formatted to merge into HUMAN_TASKS.md:

```markdown
### BonsaiCare (Bonsai Companion)
- [ ] Verify keep-warm is real: check GitHub → Actions → keep-warm logs; confirm repo
      secrets SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY are set (workflow silently
      no-ops and stays green if they aren't) — 10 min
- [ ] Close risk-register items R1/R9: confirm Supabase free-tier pause behavior and
      backup limits on the live project (both still "Open — verify during setup") — 15 min
- [ ] Confirm Vercel project: repo imported, 3 NEXT_PUBLIC_* env vars set, and Supabase
      Auth redirect URLs include the production URL (nothing in-repo proves any of this) — 15 min
- [ ] Run `supabase gen types typescript --linked > src/types/database.types.ts`
      (needs `supabase login` browser token + linked project) — types are stale post-M3 — 10 min
- [ ] GitHub: enable branch protection with required CI checks on main (not verifiable
      from the repo; history suggests PR flow is already used) — 5 min
- [ ] Optional: buy a custom domain (~€10–15/yr) or explicitly decide against it
- Accounts assumed existing: GitHub, Supabase, Vercel, paid Claude plan (all per docs/setup/)
```

## 8. Costs & services

| Service | Tier | Used for | Keys needed | Monthly cost |
|---|---|---|---|---|
| Supabase | Free | Postgres + Auth + Storage + RLS | Project URL, `sb_publishable_` (client); `sb_secret_` documented but **unused by the app**; access token + project ref only for CLI migrations | €0 |
| Vercel | Hobby | Hosting/deploy (via Git integration, claimed) | The 3 `NEXT_PUBLIC_*` vars in dashboard | €0 (non-commercial only) |
| GitHub | Free | Repo, CI, keep-warm cron | 2 Actions secrets (public-class values) | €0 |

**Total today: €0/month** (VERIFIED: no paid dependency anywhere). First paid triggers per the cost model: storage > 1 GB or wanting no-pause/backups → Supabase Pro ~$25/mo; commercial use → Vercel Pro ~$20/mo. Photo budget math (~50 trees × 30 photos × ~300 KB ≈ 450 MB) fits the free tier. Docs self-flag the tier numbers as "verify against current pricing" — never done.

## 9. Security check

- **Secrets committed: NO — verified by git-history forensics.** Only `.env.example` was ever committed; `git log --all` on env paths is empty; pattern-grep for real `sb_secret_` values across all history: zero hits. `.env.local` on this machine contains only public-class values.
- **.gitignore: adequate** (env files, `*.pem`/`*.key`, supabase temp, `.vercel`). One theoretical gap: a non-`.local` `.env.production` would slip through.
- **CLAUDE.md: present but badly stale** — see risk #1. Also present: a read-only `rls-reviewer` subagent whose checklist matches the project's invariants; no MCP config, no permission grants committed.
- **Genuinely good:** RLS on every user table with per-command owner policies, enforced by 49 pgTAP assertions that actually run in CI against Dockerized Supabase; no service-role usage anywhere in app code; private bucket; client-side EXIF stripping via WebP re-encode; install-script allowlist in pnpm-workspace.yaml; least-privilege CI permissions.
- **Alarming: nothing critical.** Weak spots (detailed in risk #3/#4): storage path-policy behavior never tested, cross-owner FK writes possible via PostgREST, no security headers, keep-warm fails open, `config.toml` references a `seed.sql` that doesn't exist, Prettier/format not CI-enforced, Actions pinned by tag not SHA.

## 10. Recommended next 3 work sessions

1. **Truth reconciliation (highest leverage per hour).** Goal: make the repo tell the truth — rewrite CLAUDE.md status/stack/layout to match reality, update README + sprint-01 + risk register, regenerate `database.types.ts`, fix the 2 broken doc links, reconcile the care-event enum with the domain model (ADR or doc edit), and decide Zod-vs-hand-rolled in writing. Model: **Sonnet 5** (mechanical, low ambiguity). Duration: **1.5–2 h**.
2. **M3 completion: care logging + timeline.** Goal: log-entry form (10 event types), per-type `details` validation in `src/domain/` with unit tests, per-tree timeline merging care events + photos by date, wire the photo↔entry link. Model: **Fable 5 / Opus 4.8** (real domain modeling + the repo's craft bar). Duration: **3–4 h**.
3. **Operational hardening.** Goal: add error logging to all server-action catches, render the `/login?error=auth` state, make keep-warm fail loud (non-zero exit + optional notification), add security headers in `next.config.ts`, one behavioral pgTAP test for storage path-scoping, archived-trees view + unarchive. Model: **Sonnet 5** with the `rls-reviewer` agent on the pgTAP change. Duration: **2–3 h**.

## 11. Health scores (1–5)

- **Clarity: 4** — Product vision, scope boundaries, and 11 ADRs are exceptionally sharp; docked one point because the repo's own status documents (starting with the always-loaded CLAUDE.md) misstate where the project actually is.
- **Code quality: 4** — What exists is high-craft (strict TS with zero `any`, small files, security-reasoned comments, real a11y, correct Next 16 idioms); docked for systematically silent catch blocks, dead code (scheduling, dark mode, species table), and the stale generated types at HEAD.
- **Docs: 3** — Enormous and mostly excellent (CHANGELOG↔git consistency is perfect), but actively wrong in load-bearing places: false project status, fictional stack claims, a "binding" domain model the schema already diverged from, and broken links surviving a commit titled "fix broken link".
- **Momentum: 4** — 18 commits in 9 days with M1+M2+M3-schema landing in a 48-hour burst ending yesterday; docked because it's one contributor's burst, the two flagship features remain unstarted, and there's no evidence yet the cadence sustains.
