# Product Brief — Bonsai Companion

> Status: v1, 2026-06-26. The single source of truth for *what* we are building
> and *why*. Scope decisions here govern the roadmap.

## One-line vision

A calm, photo-first companion that helps a serious hobbyist **remember what each
bonsai needs, when** — and preserves each tree's multi-year story — without the
nagging, rigidity, lock-in, or dark patterns of existing apps.

## The problem (evidence-based)

Bonsai care is unlike houseplant care in ways every generic app gets wrong, and
even dedicated apps execute poorly (see [benchmark](../research/benchmark.md)):

1. **Care is species-category- and season-driven, not a fixed weekly chore.**
   When to repot, whether to decandle or defoliate, how long to leave wire on,
   when to stop fertilizing, and whether a tree overwinters outdoors or comes
   inside — all depend on whether it's a conifer, deciduous, tropical, or
   broadleaf evergreen. Generic apps apply one "water every N days" schedule.
2. **A bonsai is a years-to-decades project.** Its value is in the *progression*
   — the dated photos and the record of work done. Growers forget what they did
   and forget to take the "before" photo as collections grow.
3. **Existing tools fail on trust and reliability.** Dedicated bonsai apps keep
   getting abandoned (BonsaiDo, MyBonsai, Vera), so experienced growers fall back
   to spreadsheets and Notion to keep their decade-long data portable. The apps
   that do exist are faulted for unreliable notifications and rigid, un-editable
   schedules.

## Who it's for

- **Primary (now):** the owner — a hands-on hobbyist with a real, growing
  collection who wants reliable, low-friction tracking and a beautiful
  progression record. Northern hemisphere (Spain), outdoor + some indoor trees.
- **Secondary (soon):** a handful of trusted users, each with their own private
  collection and account.
- **Future (optional):** a commercial audience of intermediate+ hobbyists. The
  architecture preserves this path but the MVP does not chase it.

We are **not** building for absolute beginners who need hand-holding content —
that is Bonsai Empire's and Mirai's content moat, which we will not try to
out-build.

## Value proposition & differentiation

We win on **execution of the fundamentals + bonsai-native depth + trust**, not
on breadth:

1. **Bonsai-native model** — species *category* drives scheduling; first-class
   wiring, repotting, decandling/defoliation, and styling history.
2. **A dashboard that tells you what needs attention today** — reliable because
   it's pull-based, not dependent on flaky push notifications.
3. **Editable, signal-driven scheduling + an always-reviewable timeline** — the
   antidote to rigid schedules and "I can't see what I logged."
4. **Your data is yours** — export to CSV/JSON from early on. No lock-in.
5. **A web/large-screen PWA** — no major bonsai app has one; great for
   cataloguing, installable on the phone for the garden.
6. **Calm, photo-first, premium, restrained** — no nagging, no clutter, no dark
   patterns.

## Product principles

1. **Reliable beats clever.** A correct, always-visible "due today" list beats a
   smart notification that might not fire.
2. **Low-friction capture.** Logging a watering or snapping a progress photo must
   take seconds, one-handed, in the garden.
3. **Never trap the user's data or attention.** Export always works; reminders
   are restrained; no manipulative paywalls — ever.
4. **Respect the craft.** The model and language reflect how bonsai people
   actually think (stages, styling, ramification), not a generic CRUD app.
5. **Honest about limits.** Where the app can't know (exact watering need), it
   prompts you to *check*, rather than pretending to know.

## MVP scope

See [mvp-scope.md](./mvp-scope.md) for the authoritative in/out list and the
reasoning. In one sentence: **add and organize trees, store structured info and
photos per tree, keep an ordered timeline, log care, and manage a calendar of
tasks (incl. fertilization) with a dashboard of what's upcoming/overdue** — done
reliably and pleasantly, before anything advanced.

## Success & failure

- **Success:** the owner uses it as the *primary* record for their real
  collection for a full season; logging is fast enough that they actually do it;
  the dashboard is trusted; no data is ever lost; it's deployed and stable.
- **Failure:** it becomes a chaotic prototype; logging is tedious so it goes
  unused; notifications/schedules are untrustworthy; or data feels locked in.

## Key assumptions (challenge-ready)

| # | Assumption | If wrong… |
|---|---|---|
| A1 | A PWA is "native enough" for daily garden use (camera, install, offline-tolerant). | If push/camera friction proves unacceptable, the clean backend/domain split lets us wrap in a native shell (Capacitor) or build Expo later. ([ADR-0001](../decisions/0001-platform-pwa-first.md)) |
| A2 | Pull-based dashboard > push notifications for reliability. | If the owner wants proactive nudges, we add best-effort web push + optional email digest without re-architecting. |
| A3 | Species *category* (4–5 buckets) captures enough to drive useful scheduling without a full species DB. | If too coarse, the `species` table is the seam to add per-species rules later. |
| A4 | Free tiers (Supabase + Vercel) suffice for personal + a few trusted users. | See [cost-model](../operations/cost-model.md) for limits and the paid-upgrade triggers. |
| A5 | The owner values data export/longevity highly (community signal). | Low risk — cheap to build, high trust payoff. |

## Risks

The consolidated risk register lives in
[risks-and-assumptions.md](./risks-and-assumptions.md). The top three:
**(R1)** Supabase free-tier projects pause after ~1 week idle — mitigated by a
free scheduled ping and documented. **(R2)** iOS PWA push is limited — mitigated
by the pull-first design. **(R3)** Scope creep toward the deferred "future"
features — mitigated by this brief and a disciplined roadmap.
