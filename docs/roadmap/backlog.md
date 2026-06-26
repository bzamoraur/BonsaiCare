# Backlog

> Status: living. The ordered holding pen for everything not in the current
> milestone. Items graduate into a sprint when their phase is active. Format:
> concise user stories + notable technical items. Priority: P1 (next) … P3 (maybe).

## How this works
- New ideas land here, not in the current milestone (scope discipline).
- Each item should say *who* benefits and *why*; link an ADR if it embodies a
  decision.
- When commercial/multi-user plans firm up, re-prioritize.

## Phase 1 (MVP) — user stories by milestone

These elaborate the [roadmap](./roadmap.md) milestones into reviewable stories.

**M2 — Trees & photos**
- As the owner, I can add a tree with just a name + photo so capture is instant. (P1)
- …edit all structured fields later via progressive disclosure. (P1)
- …organize trees by tag, location, and development stage, and search them. (P1)
- …set a cover photo and see a photo-first collection grid. (P1)
- …archive a tree (sold/died/gifted) without losing its history. (P1)

**M3 — Timeline & logging**
- …log a care event (water/fertilize/prune/wire/repot/pest/observe) in <10s. (P1)
- …attach a photo to an event or add a standalone progress photo. (P1)
- …see one merged, date-ordered timeline per tree, filterable by type. (P1)
- …backdate an event/photo so history is accurate. (P1)

**M4 — Tasks & dashboard**
- …create one-off and recurring tasks (incl. fertilize every N days in-season). (P1)
- …complete/skip a task, optionally logging a care event, and auto-get the next. (P1)
- …open the app and immediately see overdue / today / upcoming. (P1)
- …edit any schedule's interval and dates freely. (P1)

**M5 — Trust & polish**
- …export all my data to CSV/JSON (+ photo archive). (P1)
- …use the app comfortably in dark mode and with accessibility needs. (P1)
- …trust the dashboard because the season logic is correct in my hemisphere. (P1)

## Phase 2 — enhancements (P2 unless noted)
- Scheduled **email digest** of what's due (robust proactive reminder). (P1 of P2)
- Best-effort **web push** notifications.
- **Wiring tracker:** per-branch apply date + species-derived removal window +
  recurring inspection reminder.
- **Decandling/defoliation** species-window helpers; "don't stack heavy work"
  warnings (don't repot + heavy-prune same season).
- **Species-care guidance** via `species.default_care` (category → per-species).
- **Data import** (round-trip / spreadsheet migration) — eases switching cost.
- **Locations as care context** (sun/shade, winter protection prompts).
- **Trusted-user** invites & polish.
- Light **error reporting** (Sentry free) if reliability needs it.

## Phase 3 — optional commercial (P3)
- Public landing page; transparent monetization; native shell (Capacitor/Expo);
  social/sharing; AI species-ID/diagnosis (only if accuracy/cost justify);
  analytics. Move off Vercel Hobby first (R5).

## Technical debt & chores (track as they arise)
- _(none yet — log here when MVP shortcuts are taken, per the quality protocol)_

## Parking lot (unvetted ideas)
- Weather-aware watering prompts (Greg/Planta do this; high value, needs a free
  weather API — evaluate cost/lock-in first).
- Same-angle photo guide (ghost overlay of the last photo while shooting).
- Shareable read-only progression link for a single tree.
