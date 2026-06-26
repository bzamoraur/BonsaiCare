# MVP Scope

> Status: v1, 2026-06-26. The authoritative in/out list. Changing scope means
> editing this file (and saying why) — not silently building extra.

The guiding test for MVP inclusion: **does it make the app reliably useful for
managing a real collection, this season?** If not, it waits.

## In scope (the first useful, production-usable version)

Grouped by the user's stated MVP needs, refined by research.

### Collection
- **Add / edit / archive trees.** Archive (not delete) preserves history when a
  tree dies, is sold, or gifted — the well-received "graveyard" pattern.
- **Organize trees:** structured `development_stage` + `location` + freeform
  **tags**; sort and filter; search by name/species.
- **Structured tree profile:** name, species (lookup *or* free text), category,
  origin, style, pot, substrate, acquisition info, health status, notes.

### Photos & timeline
- **Upload/capture, store, and display photos per tree** (private storage,
  client-side compressed).
- **Per-tree timeline/history** merging photos + care events in date order;
  editable dates so you can backdate.
- One **cover photo** per tree; photo-first profile and collection grid.

### Care logging
- **Log care events** (note, watering, fertilizing, pruning, wiring, repotting,
  pest/disease, styling, defoliation, observation) with type-specific structured
  detail and optional photo.
- **Fertilization events** capture product/NPK/amount.

### Calendar & tasks
- **Create tasks** (one-off or recurring) per tree or collection-wide.
- **Fertilization schedules** as recurring tasks (e.g. every 14 days, Mar–Oct),
  with **editable** interval and an active-season window.
- **Complete / skip tasks**; completing can log a matching care event; recurring
  tasks generate their next occurrence.

### Dashboard (the daily home)
- **"What needs attention"**: overdue, due today, and upcoming — the reliable,
  pull-based core. Per-tree and whole-collection views.
- At-a-glance health/triage.

### Trust & foundation
- **Auth** (each user sees only their own data; RLS-enforced).
- **Data export (CSV/JSON)** of trees, events, and tasks — a deliberate
  trust/anti-lock-in feature, in from the start.
- Hemisphere/season setting (user-overridable) so seasonal logic is correct.

## Explicitly OUT of MVP (deferred — with the seam that keeps them cheap later)

| Deferred feature | Why deferred | Seam preserved |
|---|---|---|
| Large **species-care database** | Huge content effort; Bonsai Empire/Mirai's moat. Category-level rules suffice first. | `species` table + `species.default_care` JSONB. |
| **Push / smart notifications** | Universally unreliable; iOS PWA-limited. Pull dashboard first. | Tasks are already the data; add best-effort push/email later. ([ADR-0007](../decisions/0007-notifications-strategy.md)) |
| **Social / community feed** | Not needed for personal use; large surface. | Per-user `owner_id` model doesn't preclude sharing later. |
| **AI species ID / diagnosis** | Mediocre accuracy category-wide; high effort/cost. | Photos + species fields exist to build on. |
| **Marketplace, valuation, pots-as-assets** | Commercial/collector features. | `current_pot` text now; normalize to a pot entity later if it earns its place. |
| **Per-branch wiring tracker, decandling auto-windows** | Powerful but advanced; risks over-building. | Wiring/decandling exist as care-event types now; promote to structured tools in Phase 2. |
| **Offline-first capture + sync** | Owner confirmed "installable + fast" is enough for v1; true offline sync is a large complexity step. MVP PWA is installable + offline-*tolerant* (cached shell), not offline-first. | TanStack Query caching + service worker already soften brief offline; full local-write+sync can be added later if needed. |
| **Native iOS/Android apps** | $99/yr + review friction + second codebase. | PWA + clean backend → Capacitor/Expo path later. ([ADR-0001](../decisions/0001-platform-pwa-first.md)) |
| **Google OAuth / password auth** | Magic-link is enough for 1–3 users with least setup/risk. | Additive in Supabase later, no data-model change. ([ADR-0010](../decisions/0010-auth-magic-link-first.md)) |
| **Public landing page, monetization, analytics** | No users to monetize/measure yet. | Add when/if commercial. |

## Definition of done for the MVP

- All "in scope" items implemented, tested (unit for domain logic, e2e for the
  critical flows), and deployed to production.
- The owner can run their **real** collection on it for a season without data
  loss or blocking bugs.
- Setup, deployment, and operations are documented click-by-click.
- Export verified to round-trip the data.
