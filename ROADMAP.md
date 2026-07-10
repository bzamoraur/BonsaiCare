# Roadmap — three tiers to a loved beta

> **Status:** Living · **Created:** 2026-07-11 (beta-readiness review) · pinned to
> `origin/main` @ `4eb8cf3`
>
> This is the **decision-level** roadmap: the gate a friend must clear before
> touching real data, then the features that make the app loved, then the things
> we consciously defer. Sprint-level detail lives in
> [docs/roadmap/improvement-plan.md](docs/roadmap/improvement-plan.md); the
> phase-level view is [docs/roadmap/roadmap.md](docs/roadmap/roadmap.md); the full
> audit snapshot is [PROJECT_EXPORT.md](PROJECT_EXPORT.md).
>
> **Legend.** Effort: **S** ≈ <½ day, **M** ≈ 1–2 days, **L** ≈ a sprint. Model:
> **Sonnet 5** for most build/fix work; **Opus 4.8** for real domain modelling
> (the care-scheduling/knowledge engine). Every gate item below is traceable to a
> VERIFIED finding in the 2026-07-11 review.

---

## Where we actually are (verified 2026-07-11)

The core loop is **real and well-built**: add a tree → log care (per-tree form,
one-tap repeat-last, global quick-add sheet, batch log) → recurring tasks with
hemisphere-correct season windows → a Today dashboard that buckets overdue / due
/ upcoming, with atomic RPC completion that spawns the next occurrence. 174/174
unit tests pass; the loop is covered by 16 Playwright journeys and 9 pgTAP
suites. Security is genuinely solid and **verified on the live database** (RLS
holds, composite FKs close the cross-owner write hole, storage is private and
per-user, functions are locked down).

**But it is not yet safe to invite friends.** One critical data-exposure bug, a
sign-in flow that will lock friends out on invite day, and a missing privacy note
stand between here and the gate. The app is also a *tracker, not an advisor*
today: the species-driven intelligence that the pitch implies is dormant, so a
new user gets weekly value only after they set up schedules themselves — and the
first-run screen actively hides the path to doing so.

---

## TIER 1 — BETA-READY GATE (do all of these before friend #1)

**The bar the owner set:** HTTPS-only · no plaintext creds · a delete path · a
privacy note · the core loop works for a *new* user · nothing breaks silently ·
onboarding + empty states clear · EN/ES both correct on the week-1 surfaces · a
feedback channel + basic error visibility. **Two of those are currently failing**
(plaintext creds are publicly exposed via the backup; no privacy note exists).

Smallest-first, each with the finding it closes:

| # | Gate item | Effort | Model | Why it blocks the beta |
|---|---|---|---|---|
| 1 | **Stop leaking the DB backup.** The weekly backup uploads an **unencrypted** dump — including `auth.users` (emails, bcrypt hashes, session tokens) — as a **90-day GitHub artifact on a PUBLIC repo**. Encrypt it (age/gpg passphrase in a repo secret) or push it to the already-provisioned private B2 bucket; **delete the existing `db-backup-*` artifact now** (`db-backup-28816036702` is live and downloadable today). | S | Sonnet 5 | **CRITICAL, verified.** The moment a friend signs up, their credentials become world-downloadable. Violates the owner's own "no plaintext creds" bar. |
| 2 | **Custom SMTP before any invite.** Magic-link is the only sign-in path and it rides Supabase's built-in sender (~2 auth emails/hour, project-wide). Several friends signing up the same day get "email rate limit exceeded". Configure a free provider (Resend) in Supabase Auth — **no code change**. | S | Sonnet 5 | **HIGH, verified.** Guaranteed invite-day lockout for a 5-person cohort. |
| 3 | **Write a one-page privacy note.** A static `/privacy` page or Settings section: what's stored, where (Supabase eu-west-3 + the B2 photo mirror + weekly DB dumps), that the owner sees aggregate usage counts, and the export/delete rights. There is **zero** user-facing privacy text today. | S | Sonnet 5 | **Bar item, verified missing.** Friends hand over real emails + photos with no disclosure. |
| 4 | **Honor "delete my data" end-to-end.** The in-app delete path is real and cascades rows + storage (verified), but the **B2 mirror never deletes** and weekly dumps retain rows — a deleted friend's photos persist off-site forever, undisclosed. Add a documented manual B2-purge step to the runbook and disclose retention in the privacy note (#3). | S | Sonnet 5 | Bar item ("a delete path") is only *mostly* true; close the gap + disclose. |
| 5 | **Fix the silent auth dead-end.** A failed magic link (expired / consumed by an email scanner / opened in another browser) redirects to `/login?error=auth`, which the page **ignores** — the friend just sees a blank form. Read the `error` param and show "that link expired or was already used — request a new one" (translated). | S | Sonnet 5 | **Verified.** Every mobile friend hits cross-browser link opens; silent failure reads as "app is broken". |
| 6 | **Give the first run somewhere to go.** With zero trees, Today says "All caught up · Enjoy your trees 🌱" and offers no "add your first tree". With trees but no schedule, it says the same thing and never points to `/plan` — the only planning entry points are a button on Collection. Branch the Today empty state on tree-count and task-count with the right CTA (`treeCount` is already passed in). | S | Sonnet 5 | **Verified.** Every friend's first session ends in false reassurance with no next step. |
| 7 | **See failures during the beta.** All server catches now log (verified) but only to Vercel Hobby logs (~1h retention, no alerting); **client-side crashes report nothing at all**. Add a tiny `app_errors` table written from `logActionError` and surfaced in `/admin`, plus a fire-and-forget beacon from both error boundaries. Also silence the two `DYNAMIC_SERVER_USAGE` false-alarm error lines from `/log` + `/log/batch` so the channel the owner watches stays clean. | S–M | Sonnet 5 | **Verified.** Otherwise a friend's bug is invisible unless they complain *and* the owner checks logs within the hour. |
| 8 | **A feedback channel.** Lightest thing that works for 5 friends: a "Send feedback" link in Settings → a `mailto:` or a Google Form, or a `feedback` table with a 3-line form. No infra. | S | Sonnet 5 | Bar item; without it you're guessing what to fix. |
| 9 | **iOS sign-in decision.** Magic-link cannot complete inside an *installed* iOS PWA (link opens in Safari; PKCE verifier is in the PWA's isolated storage). Either add 6-digit **OTP code entry** (`{{ .Token }}` in the email template + `verifyOtp` on the "check your email" screen — also fixes link-scanner failures) **or** explicitly tell iPhone friends to use the app in Safari, not "add to home screen", until OTP ships. | M (OTP) / S (guidance) | Sonnet 5 | **HIGH, verified.** An iPhone friend who installs the app hits a guaranteed dead end. |
| 10 | **Confirm the ops floor is armed.** Manually run the **B2 photo mirror** once (photos still have exactly one copy until the first scheduled run on the 15th) and confirm the green run + object count. Re-verify keep-warm's last green run, that Vercel prod has the 3 `NEXT_PUBLIC_*` vars + `OWNER_USER_ID`, and that branch protection holds. Record outcomes in `production-state.md`. | S | — (owner) | Photo bytes are irreplaceable; a paused free-tier project would silently break the app. |

**Known open items folded in:** regenerate stale DB types — **already done** (types
are current at HEAD and a CI gate boots Supabase, regenerates, and fails on
drift; the old "stale types block care-logging" note is closed). Branch
protection on `main` — **already done** (required checks `build` / `Database
(RLS) tests` / `E2E (auth flows)`, no force-push, linear history; verified via
API). Keep-warm / Supabase config / Vercel env — **verify per item 10** before
inviting.

**Gate exit criterion:** items 1–8 done, item 9 decided, item 10 confirmed. Then
invite 1 friend, watch, then the rest.

---

## TIER 2 — BETA → LOVED (what makes it genuinely great)

Sequenced with dependencies. The first wave needs **no new infrastructure** — it
mines the two hard assets the app already owns: a dated per-tree **photo archive**
and a **hemisphere-correct season engine**.

### Wave A — finish M6 + the emotional core (photos)

- **Finish the M6 tail** — S10.4 loading skeletons, S10.6 export robustness
  (concurrency + time-bail so the 500-photo zip finishes), S10.7
  `listTreeOptions`. *S each · Sonnet 5.*
- **"Then vs Now" progression compare** — pick two dated photos (default oldest
  vs newest), side-by-side or drag-slider, dates overlaid. Pure UI over existing
  signed URLs; this *is* the emotional core of bonsai. *S · Sonnet 5.*
- **Seasonal photo ritual + "one year ago today"** — resurface last year's photo
  of a tree on Today with "take today's shot"; optional quarterly `photo` task
  (the enum value already exists). Turns passive storage into a gentle ritual.
  *S · Sonnet 5.*
- **Milestones & anniversaries** — derived from data that already exists
  (`acquired_on`, first photo, first repot, "photo #100"): quiet timeline badges,
  the calm alternative to streaks. *S · Sonnet 5.*
- **Finish EN/ES on the week-1 surfaces** — login, calendar, plan, quick-log,
  care/task forms, tree detail, errors, and locale-aware date formatting
  (currently pinned to `en-GB`); default first-visit locale from `Accept-Language`.
  *L · Sonnet 5.*

### Wave B — "it knows bonsai" (needs the species layer)

- **Species care sheets + "Suggest a care plan"** — the linchpin. Hand-write ~15
  Zod-validated `CareSheet`s into the reserved `species.default_care` jsonb, a
  species picker that finally sets `species_id`, and a "suggest a plan" action
  that maps category-level season windows onto the existing recurrence shape
  (hemisphere-flipped by the engine that's already unit-tested). Draft tasks the
  user reviews — never auto-imposed. **This is the upgrade from "my notebook" to
  "it knows bonsai".** *M · **Opus 4.8** (real domain modelling).*
- **"What's safe to do this month" advisor chips** — read-only, species- and
  hemisphere-aware ("repotting window for junipers opens next month"). Pure
  function over the care sheets; no reminders fired. *S once sheets exist · Opus 4.8.*
- **Recency-as-nudge** — turn "watered 12d ago" from display text into a soft
  Today hint past a per-type threshold; the cheapest species-free proactive
  signal. *M · Sonnet 5.*

### Wave C — reach, weather, trust

- **Frost & heatwave banner** — opt-in location → cached Open-Meteo (free,
  keyless) → "frost tonight (−2 °C), protect frost-tender trees". Planta's
  single most-loved feature, and more life-or-death for shallow-potted bonsai.
  *M · Sonnet 5.*
- **Scheduled email digest** — weekly overdue/due summary via Resend + a cron
  hitting a protected route (the dormant-until-secret pattern already exists);
  the one thing a pull dashboard can't do. Opt-in. *M · Sonnet 5.*
- **Wiring tracker with photo check-ins** — "wired" opens a tracked state
  (badge: "wired 6 weeks") + a category-aware inspection task; each check-in
  prompts a close-up so wire-bite is caught visually. The sharpest
  bonsai-specific pain no plant app covers. *M · Opus 4.8.*
- **Growth-story reel** — scrubbable full-screen photo sequence per tree, optional
  client-side webm/GIF export (canvas + MediaRecorder, no server cost). The
  feature a friend screenshots and shares. *M · Sonnet 5.*
- **Southern-hemisphere correctness** — the season month pickers show literal
  months but the engine inverts them; a southern friend's *custom* window lands
  6 months off (the Mar–Oct default is fine). Shift labels at the form boundary +
  a hemisphere onboarding prompt. *M · Sonnet 5. Promote to Tier 1 if any invited
  friend is southern-hemisphere.*

### M7 friends-release gate (the rest, once Tier 1 ships)

Allowlist + Turnstile CAPTCHA on signup (still open today), first-run tour, usage
analytics + admin v2, install promotion. *L · Sonnet 5.*

---

## TIER 3 — LATER (named so we build them consciously, not by accident)

- **Share-a-tree public link** — per-tree, opt-in, revocable read-only page (the
  right-sized "social-lite", not a feed); the app's first organic growth loop.
  Needs a careful storage/RLS design pass — never expose the private bucket
  wholesale. *M · Opus 4.8 for the security design.*
- **AI "Season recap"** — an LLM drafts a narrative **only from the user's own
  logged rows** (never inventing botany), saved as an editable, clearly-labelled
  note. The one idea that isn't strictly €0 (Gemini free tier / cents-scale).
- **Offline care-log outbox** — IndexedDB queue + replay, client UUIDs for
  idempotency; scoped to care logs only (the offline-ADR boundary). The
  garden-with-no-signal moment.
- **Yearly "Bonsai Almanac"** — a printable per-tree year-in-review; an emotional
  artifact nothing in Planta/Greg does.
- **Offline species identifier** — a characteristic key (deciduous? needle or
  broadleaf?), static client JSON, €0 and immune to the image-API
  non-commercial trap.
- **Pots collection** — a parallel domain (maker/seal, kiln, era, provenance) for
  the collector persona; the largest new slice.
- **Phase 3 (evidence-gated):** public landing page, native shell
  (Capacitor/Expo — the pure `src/domain/` survives the move), monetization (no
  dark patterns), community, marketplace, app-store, big species DB. Each behind
  real demand and its own ADR. Hosting moves off Vercel Hobby before any
  commercial launch.

---

## The single highest-leverage move right now

**Tier 1, item 1 (stop the backup leak) is non-negotiable and takes an hour.**
After the gate, the highest-*value* build is **Tier 2 Wave B: species care sheets
+ "suggest a care plan"** — it's the one change that turns a well-built logbook
into the "it knows bonsai" product the whole pitch implies, and everything from
the season-advisor chips to the identifier depends on it.
