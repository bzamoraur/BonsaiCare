# Information Architecture & Key Flows

> **Status:** Current · **Updated:** 2026-07-12
>
> The navigation skeleton and the handful of flows that must be excellent.
> Screens are described by intent, not pixels.

## Top-level navigation (mobile-first, ≤5 destinations)

A bottom tab bar on mobile / side rail on desktop:

1. **Today (Dashboard)** — the home. "What needs attention": overdue, due today,
   upcoming; quick glance at collection health, plus a hemisphere-aware
   **seasonal focus** card (what the current season calls for). The default
   landing screen.
2. **Collection** — the photo-first grid of trees; filter/sort/search; add tree.
3. **Calendar** — tasks over time (list + month view); create/complete/skip.
4. *(Quick-add)* — a persistent central **+** action: log care or add photo to
   any tree in seconds (not a tab, a floating action).
5. **Settings** — profile (hemisphere, units), locations, tags, **export**,
   account.

**Tree detail** is reached from Collection/Today and is the heart of the app:
hero photo → key facts → **timeline** (photos + events merged) → tasks for this
tree → actions (log, add photo, edit, archive).

## Screen inventory (MVP)

| Screen | Purpose |
|---|---|
| Today / Dashboard | Attention list + health glance + seasonal focus. |
| Collection grid | Browse/organize/search trees; entry to add. |
| Add/Edit tree | Structured profile capture (progressive disclosure). |
| Tree detail | Hero, facts, timeline, tasks, actions. |
| Timeline (within detail) | Chronological photos + care events; tap to view/edit. |
| Quick-add sheet | Fast log (type, date default today, optional photo/notes). |
| Add photo flow | Capture/upload → compress → caption → attach (optionally to event). |
| Calendar | Upcoming/overdue tasks; create task; complete/skip. |
| Add/Edit task | Title, type, due date, recurrence (interval + season window). |
| Settings | Profile, locations, tags, export, account/delete. |
| Auth | Magic-link sign-in; minimal, no forced re-login. |

## Critical flows (must be frictionless)

### F1 — First run / onboarding (≤60s to value)
Sign in (magic link) → set **hemisphere + units** (one screen, pre-filled from
locale) → "Add your first tree" → land on a populated Today. No paywall, no tour
walls.

### F2 — Add a tree
Collection → **+** → name + photo (hero) are enough to save; species/category/
location/etc. are optional and progressively disclosed. Saving with just a name +
photo must work (low friction); details can be filled later.

### F3 — Quick-capture a care event (the most frequent action)
Global **+** → pick tree (or pre-selected from a tree's screen) → choose type
(water/fertilize/prune/…) → date defaults to **today**, last-used details
pre-filled → optional photo + note → save. **Target: < 10 seconds, one-handed.**

### F4 — Add a progress photo
Global **+** → photo → pick tree → (optional) attach to a care event → caption →
save. Client compresses before upload. Optionally set as cover.

### F5 — Plan & complete care (tasks)
Calendar → **+** task (e.g. "Fertilize — every 14 days, Mar–Oct") → appears on
Today when due. Complete → optionally logs a matching care event → next
occurrence auto-scheduled (respecting season window). Editing the interval/date
is always one tap away.

### F6 — Review a tree's progression
Tree detail → timeline → scroll years of photos + events; filter by type; see the
"before/after" story. This is the emotional payoff — make it beautiful.

### F7 — Export my data (trust)
Settings → Export → choose CSV/JSON → download trees + events + tasks (+ photo
archive). Reassures: your data is yours.

## Empty states (treated as features, not afterthoughts)

- No trees yet → warm invite to add the first, with a sample of what a tree
  profile will look like.
- No tasks due → calm "nothing needs attention today" (not an alarming blank).
- Archived trees → a quiet "memorial"/graveyard area, viewable but out of the way.

## Notes that shape IA from research

- **Today-first** because the dashboard is our reliability bet
  ([ADR-0007](../decisions/0007-notifications-strategy.md)).
- **Timeline is central**, not buried — Greg's key failure was hiding logged
  history.
- **Quick-add is global** because logging frequency determines whether the app is
  actually used.
- **Desktop/web** uses width for a richer catalogue + larger progression view, not
  more chrome.
- **Bilingual throughout** — every surface renders in the user's chosen language
  (English or Spanish); locale is inferred from the browser before sign-in.
