# Roadmap expansion v2 — knowledge & collection modules (researched)

> **Status:** Proposed · **Created:** 2026-07-09 · Owner feedback + a 4-stream
> web-grounded research pass (65 sources). Sequencing feeds
> [improvement-plan](./improvement-plan.md); nothing here is built yet.

Two things prompted this: **friction in what shipped** (batch care isn't
discoverable; completed tasks vanish instead of staying logged) and **three new
modules** the owner wants — species reference images + identifier, a pots
collection, and a per-species learning/care-sheet layer. The happy finding: every
new module lands at **€0 by reusing a seam the schema already has**, so none needs
new infrastructure — only additive migrations + content.

---

## Part 1 — Friction fixes (immediate; fold into Sprint 09, no schema change)

### F-A · Completed tasks stay logged ("Past" / done history)

**The gap is display-only, not data loss.** `complete_task` keeps the finished row
(`status='done'`, `completed_at` set) and spawns the next occurrence for recurring
tasks — but **Today and Calendar both hard-filter `status='pending'`**
([dashboard.ts:41](../../src/server/dashboard.ts#L41),
[:60](../../src/server/dashboard.ts#L60)), so done tasks disappear from those two
surfaces (they _are_ still visible on each tree's timeline).

**Design (no schema change):**

- `listPastTasks(sinceDays)` — `status in ('done','skipped')`, `completed_at`
  desc, with tree name; owner-scoped by RLS.
- **Today** gains a **"Done"** view (mirroring Bonsai Empire's Today / Upcoming /
  **Past** tabs), grouped Today / Yesterday / Earlier this week — completed items
  with a ticked state and when.
- **Calendar** shows **done** actions too (a second, muted marker per day, or a
  toggle), so the month reflects what you _did_, not just what's due.

### F-B · Batch care is a first-class action on Today

Reaching batch via `/collection → Plan care` (or `+` → "Several trees") isn't
natural. Bonsai Empire surfaces **"Marcar múltiples árboles como"** right on the
reminders screen. **Fix:** a prominent **"Log care for several trees"** entry on
**Today** (a card or button routing to the existing `/log/batch`), so the
already-built batch flow is where the habit lives.

---

## Part 2 — The species knowledge layer (reuses the `species` table)

All three species features hang off the existing `species` lookup, whose global
rows (`owner_id IS NULL`) are already a shared, RLS-readable catalog, and whose
`default_care jsonb` column was **explicitly reserved "for future species-care
guidance."** We extend it; we do not build a parallel catalog.

### K-1 · Per-species care sheets (the "Learning" module) — _do first, cheapest_

- **Where:** `species.default_care jsonb`, one **Zod-validated `CareSheet`** shape
  with both short **original** prose (`summary` + per-dimension `notes`) and
  **machine-readable schedule hints** (watering interval by season, feed
  interval + season months, repot interval years + best season, hardiness zone).
- **Fallback:** a tiny `care_templates(type primary key, sheet jsonb)` (5 rows:
  conifer / deciduous / broadleaf_evergreen / tropical / other) — resolution order
  is _specific species → generic-by-type (labelled "general guidance") → none_.
- **Canonical template (~11 dimensions, confirmed across sources):** placement/
  light · watering · feeding · repotting + soil · pruning/pinching · wiring ·
  wintering/hardiness · pests · propagation · styling/growth-habit · overview.
- **Content:** write our **own concise sheets** for ~15 common species (a day's
  work). Facts are free to reuse; **prose is not** — never copy Bonsai Empire
  (all-rights-reserved) or embed Wikipedia's CC-BY-SA text. Curated **outbound
  links** cover the long tail.
- **Reminder tie-in (phase 1):** a **"Suggest a care plan"** action maps the
  sheet's schedule hints onto `task.recurrence` (`interval_days`, season window),
  flipping months by `profile.hemisphere` — draft tasks the user reviews.
- **Surfaces:** a "Care sheet" tab on the species; an "Open care sheet" link on a
  tree (via `tree.species_id`, falling back by type).
- **Cost:** €0 (text in an existing jsonb column). **Risk:** care-liability →
  ship a "general guidance, verify for your climate" disclaimer; hemisphere flip
  is the exact bug to test.

### K-2 · Species reference images

- **Schema:** 4 nullable columns on `species` — `image_path`, `image_license`,
  `image_attribution`, `image_source_url`. Nullable → existing rows unaffected, no
  RLS change (readers already see global rows).
- **Storage:** a new **public** `species-images` bucket (opposite of the private
  `tree-photos`), written only by migration/service-role, CDN-cached, no signed
  URLs. ~40 thumbnails × ~30 KB WebP ≈ **1–2 MB** (<0.2% of the 1 GB free tier).
- **Sourcing:** hand-pick **CC0 / public-domain** files from **Wikimedia Commons**
  (verify each file's license via the API's `extmetadata`), record author + license
  + source URL, show a courtesy credit. **Avoid** iNaturalist (CC-BY-NC default),
  GBIF (free-text licenses), Pl@ntNet (CC-BY-SA + paid API), Flickr (mixed).
- **Phase 2:** an on-demand "find a reference photo" action for user-created
  custom species via the Wikipedia REST summary endpoint (manual-trigger, license
  verified before persisting) — keeps the app offline-first.
- **Cost:** €0. **Risk:** never let user tree photos into the public bucket; only
  bundle CC0/PD/BY (never NC/SA — avoids a future-commercial landmine).

### K-3 · Species identifier ("what tree is this?")

Two **complementary** approaches, phased:

- **Phase 1 — offline characteristic key (€0, no dependency):** add
  `species.traits jsonb` (foliage deciduous/evergreen · leaf broadleaf/needle/scale
  · arrangement · margin · bark · flowers/fruit). Ship the (small) global catalog
  + traits as **static client JSON** → a progressive filter narrows candidates
  fully offline; the user taps one to set `species_id`/`species_label`.
- **Phase 2 — Pl@ntNet image-ID (progressive enhancement):** the only genuinely
  €0 image API (free ≤ **500 identifications/day**, no card, photos not persisted,
  **non-commercial only**). Server-proxied (key in a Vercel/Edge secret, never
  client), streams the private-bucket photo bytes as multipart, maps results to
  our catalog by scientific name / GBIF id, **mandatory CC-BY-SA attribution**,
  online-only with a clean fallback to the Phase-1 key. Add `species.gbif_id` for
  exact matching. (Google Vision needs billing; Plant.id is paid; iNat CV is gated
  — all rejected on €0 grounds.)
- **Risk:** Pl@ntNet is weaker on cultivars → present ranked _suggestions_, never
  auto-assign; monetizing later voids the free tier (flagged).

---

## Part 3 — Pots collection module (a new domain, mirrors `trees`)

Collectors catalog pots by **maker** (identified via _hanko_/seals), origin/kiln
(Tokoname · Yixing · Western studios), era/period, glaze, shape, size, condition,
and acquisition/provenance — the same axes trees already use.

- **New `pots` table** mirroring `trees` verbatim (owner_id + per-command RLS +
  `set_updated_at` + `archived_at` soft-archive + `cover_photo_id`). MVP columns:
  name · potter (free text) + seal note · origin_country/region · era_period (text)
  + year_made · glaze (enum) · material · shape (enum) + style · L/W/H mm ·
  condition (enum) · price_paid + currency · acquired_on/from · notes.
- **New `pot_photos` table** — **not** an extension of `photos`: a 2nd
  same-direction FK on `photos` would silently break the app's unpinned PostgREST
  `.select()` embeds (a hazard we already hit once in S08.3 — only e2e catches it).
  Reuses the **same private `tree-photos` bucket** under
  `<owner_id>/pots/<pot_id>/…` — the existing owner-segment Storage RLS already
  covers it, **no new bucket**.
- **Pot ↔ tree link:** one `trees.current_pot_id → pots(id) on delete set null`
  with a **partial unique index** (a pot holds ≤ 1 tree); keep the legacy
  free-text `trees.current_pot` as fallback (mirrors species_id/species_label).
- **UI:** a browsable **"Pots"** collection alongside Trees; a pot detail (gallery
  + specs + planted-tree link / "assign a tree"); create/edit; a pot picker on the
  tree page.
- **Keep maker/shape/glaze un-normalized in MVP;** a global `potters`/hanko lookup
  (seeded like species) is an explicit **Phase 2**. **Cost:** €0 (two small tables,
  reused bucket).

---

## Sequencing (value × cost, Cost > UX > Maintainability first)

1. **Now — friction fixes** (F-A done-history, F-B batch-on-Today): no schema, high
   value, directly from lived feedback. Finish Sprint 09 with these + the remaining
   S09.4–7 slices.
2. **M8 "It knows bonsai" — the species knowledge layer**, in this order:
   **K-1 care sheets** (cheapest, feeds reminders) → **K-2 reference images** →
   **K-3 characteristic identifier**. Each is a small additive migration + content;
   Pl@ntNet and image auto-fetch are later phases.
3. **New milestone — Pots collection** (K-3's sibling in scope): the one genuinely
   new domain; self-contained, additive.

Every schema step is **owner-run `supabase db push`** with a click-by-click guide,
CI-only pgTAP RLS tests, and hand-generated types — the established workflow. Full
research (sources, alternatives weighed, licensing detail) is in the 2026-07-09
research run; this doc is the distilled plan of record.
