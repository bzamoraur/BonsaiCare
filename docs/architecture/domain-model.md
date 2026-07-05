# Domain Model

> **Status:** Current · **Updated:** 2026-07-05
>
> Reviewed against competitor research (see the
> [benchmark](../research/benchmark.md)). This document defines the
> **conceptual** model; the physical schema lives in `supabase/migrations/`
> (implemented through the care-log migration) and must stay consistent with
> this file — when they drift, reconcile in the same PR.

## Design principles

1. **Separate the past from the future.** Things that *happened* (a watering, a
   repot, an observation) are immutable **history**. Things you *intend to do*
   (fertilize next week) are **tasks**. Conflating them is the root cause of the
   "I can't review what I actually did" complaint users level at Greg, and the
   "schedule is rigid / I can't edit it" complaint they level at Planta. We model
   them as two related-but-distinct concepts.
2. **One unified timeline.** A tree's story is a single chronological stream that
   merges care-log events and photos. The UI reads from this stream; the user
   never hunts across screens to reconstruct history.
3. **Structured, but not over-normalized.** Core, queryable fields are real
   typed columns. Type-specific detail (the NPK of a fertilizer, the soil mix of
   a repot) lives in a validated JSONB `details` blob, with a Zod schema per
   event type at the application layer. This keeps data integrity high without
   exploding into 15 sparse tables we'd regret. See
   [ADR-0005](../decisions/0005-unified-timeline-event-model.md).
4. **Reference data is lightweight and user-extensible.** Species and locations
   are structured (so future care-guidance can hang off them) but never block
   the user: a free-text fallback always exists. We are explicitly **not**
   building a large species-care database for the MVP.
5. **Privacy by construction.** Every row that belongs to a user carries
   `owner_id`. Postgres Row-Level Security (RLS) enforces that users only ever
   read/write their own data. See
   [Data, Security & Privacy](./data-and-privacy.md).

## Entity overview

```
                          ┌────────────┐
                          │  profile   │ (1:1 auth.users)
                          └─────┬──────┘
                                │ owns
          ┌───────────┬─────────┼─────────────┬──────────────┐
          ▼           ▼         ▼             ▼              ▼
     ┌────────┐  ┌─────────┐ ┌──────┐   ┌──────────┐  ┌──────────┐
     │ species│◀─┤  tree   ├▶│ tag  │   │ location │  │  task    │
     └────────┘  └────┬────┘ └──────┘   └──────────┘  └────┬─────┘
       (lookup)       │  (via tree_tags m2m)    ▲          │
                      │                          └──────────┘
            ┌─────────┼───────────┐         (task.tree_id, nullable)
            ▼                     ▼
     ┌──────────────┐      ┌──────────┐
     │care_log_entry│◀─────┤  photo   │
     └──────────────┘      └──────────┘
      (timeline event)   (photo.care_log_entry_id, nullable;
                          photo.tree_id required)
```

## Entities

### profile
1:1 with Supabase `auth.users`. Holds preferences that shape care logic.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK, = auth.users.id) | |
| `display_name` | text | |
| `hemisphere` | enum(`northern`,`southern`) | **Drives season logic.** Bonsai Empire shipped a bug here; we make it explicit and user-editable. Default inferred from locale, always overridable. |
| `climate_zone` | text, nullable | Optional (e.g. USDA/Köppen). Future care-tuning; not required for MVP. |
| `units` | enum(`metric`,`imperial`) | Default `metric`. |
| `created_at` / `updated_at` | timestamptz | |

### species (lightweight lookup)
Optional reference data. Seeded with a handful of common bonsai species; users
can add their own. **Not** a care database in the MVP — care fields are nullable
placeholders reserved for a future phase.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `owner_id` | uuid, nullable | NULL = global/seeded row; set = a user's custom species. |
| `scientific_name` | text, nullable | |
| `common_name` | text | |
| `type` | enum(`conifer`,`deciduous`,`broadleaf_evergreen`,`tropical`,`other`), nullable | Coarse grouping that *does* meaningfully affect care. |
| `default_care` | jsonb, nullable | Reserved for future species-care guidance. Null in MVP. |

### tree (the central aggregate)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `owner_id` | uuid (FK profile) | RLS key. |
| `name` | text | User's nickname for the tree ("The big juniper"). Required. |
| `species_id` | uuid (FK species), nullable | Preferred. |
| `species_label` | text, nullable | Free-text fallback when not in the lookup. One of `species_id`/`species_label` is encouraged but neither is mandatory. |
| `development_stage` | enum(`raw_material`,`development`,`refinement`,`maintenance`), nullable | A real bonsai concept; also a useful organizing axis users asked Bonsai Empire for. |
| `origin` | enum(`nursery_stock`,`pre_bonsai`,`yamadori`,`seed`,`cutting`,`gift`,`other`), nullable | |
| `style` | text, nullable | Formal upright, informal upright, cascade, etc. Free text in MVP. |
| `location_id` | uuid (FK location), nullable | Where it physically lives. |
| `current_pot` | text, nullable | Current state; *changes* are captured as repot events. |
| `current_substrate` | text, nullable | Same. |
| `acquired_on` | date, nullable | |
| `acquired_from` | text, nullable | |
| `cover_photo_id` | uuid (FK photo), nullable | The hero image for the profile/grid. |
| `health_status` | enum(`thriving`,`healthy`,`struggling`,`critical`,`dormant`), nullable | At-a-glance triage on the dashboard. |
| `notes` | text, nullable | Freeform "about this tree". |
| `archived_at` | timestamptz, nullable | Soft delete. Trees die, get sold, or are gifted — we never hard-delete history. (Inspired by Planta's well-received "graveyard" pattern.) |
| `created_at` / `updated_at` | timestamptz | |

### location
Where a tree lives. Affects care context (sun/shade, winter protection).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `owner_id` | uuid (FK profile) | |
| `name` | text | "South bench", "Cold greenhouse", "Balcony". |
| `notes` | text, nullable | |

### tag + tree_tags (flexible organization)
Many-to-many. The flexible organizing primitive ("native", "shohin", "show
candidates"). Complements the structured `development_stage`/`location` axes.

- `tag`: `id`, `owner_id`, `name`, `color` (nullable).
- `tree_tags`: `tree_id`, `tag_id` (composite PK).

### care_log_entry (unified timeline event — the history backbone)
One row per thing that *happened*. The `type` discriminator + validated JSONB
gives us watering, fertilizing, pruning, wiring, repotting, pest treatment,
styling, defoliation, observations and notes **without table sprawl**.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `owner_id` | uuid (FK profile) | |
| `tree_id` | uuid (FK tree) | |
| `type` | enum (see below) | |
| `occurred_at` | timestamptz | When it happened (editable — defaults to now). The timeline sorts on this, **not** on `created_at`. Directly answers Planta's "can't backdate" complaint. |
| `title` | text, nullable | Short summary; auto-suggested from type. |
| `notes` | text, nullable | Freeform body. |
| `details` | jsonb | Type-specific structured fields, validated by a per-type Zod schema. E.g. fertilize → `{ product, npk, amount }`; repot → `{ new_pot, soil_mix, root_work }`. |
| `task_id` | uuid (FK task), nullable | Set when this entry was created by completing a task. |
| `created_at` / `updated_at` | timestamptz | |

**`type` enum (MVP, as shipped in `…_care_log.sql`):** `watering`,
`fertilizing`, `pruning`, `wiring`, `repotting`, `pest_treatment`, `styling`,
`defoliation`, `observation`, `note`. New types are additive.

> Note: there is deliberately **no `photo_only` type** — a standalone progress
> photo is a `photos` row with `care_log_entry_id = null`, and the timeline is
> a **union** of care entries and photos (so the read model must never assume
> every timeline item is a care entry).

### photo

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `owner_id` | uuid (FK profile) | |
| `tree_id` | uuid (FK tree) | Required — every photo belongs to a tree. |
| `care_log_entry_id` | uuid (FK care_log_entry), nullable | Optionally attached to an event (e.g. a repot photo). |
| `storage_path` | text | Path in the private Supabase Storage bucket. |
| `taken_at` | timestamptz | Editable; defaults to upload time / EXIF if available. Timeline ordering. |
| `caption` | text, nullable | |
| `width` / `height` | int, nullable | For layout without reflow. |
| `created_at` | timestamptz | |

### task (the calendar / care plan — the future)
One row per intended action. Recurrence is modeled simply and **editably** (see
[ADR-0006](../decisions/0006-task-scheduling-and-recurrence.md)).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `owner_id` | uuid (FK profile) | |
| `tree_id` | uuid (FK tree), nullable | NULL = collection-wide task ("order akadama"). |
| `type` | enum (mirrors care_log types: `watering`,`fertilizing`,`pruning`,`repotting`,`wiring`,`inspection`,`photo`,`custom`) | |
| `title` | text | |
| `due_on` | date | What "upcoming/overdue" is computed from. |
| `status` | enum(`pending`,`done`,`skipped`) | **Overdue is derived**, not stored: `pending AND due_on < today`. |
| `recurrence` | jsonb, nullable | `null` = one-off. Else `{ interval_days, anchor: 'due'|'completion', season_start_month?, season_end_month? }`. Covers "every 14 days, Mar–Oct". |
| `completed_at` | timestamptz, nullable | |
| `notes` | text, nullable | |
| `created_at` / `updated_at` | timestamptz | |

**Completion flow:** marking a task `done` (a) optionally spawns a
`care_log_entry` of the matching type linked via `task_id`, and (b) if recurring,
generates the next task instance from the recurrence rule. We generate the
*next* occurrence lazily rather than materializing a long series — simpler, and
trivially editable.

## What we are deliberately NOT modeling yet (and why)

| Deferred | Why |
|---|---|
| Normalized pot / substrate entities | Current value on the tree + repot events capture 95% of value. Normalize later only if pots become first-class (Bonsai Empire monetizes a pot catalog — a *future* idea, not MVP). |
| Species care database | Explicitly out of MVP scope. The `species.default_care` JSONB is the reserved seam. |
| Reminders as a stored entity | Reminders are a *delivery mechanism* over tasks (dashboard + best-effort push), not data. See [ADR-0007](../decisions/0007-notifications-strategy.md). |
| Season as an entity | Derived from date + `profile.hemisphere`. A lookup table is overkill. |
| Sharing / multi-user trees | Each trusted user has their own account + collection. Sharing is a future feature; the `owner_id` model doesn't preclude it. |
| Styling/pruning/repotting as separate tables | They are `care_log_entry` types. Promote to dedicated tables only if a type earns rich, heavily-queried structure. |

## Integrity & edge cases to honor in implementation

- A tree's `cover_photo_id` must reference a photo of *that* tree (enforced in
  app logic / a check; FK alone can't express it cheaply).
- Deleting a photo that is a cover sets `tree.cover_photo_id = null`.
- Archiving a tree hides it from default views but preserves all history and
  photos; tasks for an archived tree are auto-cancelled (status `skipped`).
- `occurred_at` / `taken_at` may be in the past (backdating) but a soft warning
  if far in the future.
- Recurrence with a season window must skip out-of-season months when computing
  the next `due_on` (the exact bug Bonsai Empire users hit in the Southern
  hemisphere — we test this explicitly; see testing strategy).
- All timestamps stored UTC (`timestamptz`); rendered in the user's local zone.
