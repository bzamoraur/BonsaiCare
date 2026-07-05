# Sprint 02 — "Log care, fast" (Milestone M3, capture half)

> **Status:** Current · **Updated:** 2026-07-05
>
> First sprint of M3. The care-log schema is already merged
> (`supabase/migrations/…_care_log.sql`, PR #17) but pending `supabase db push`
> to the hosted project (see the backlog's tech-debt register); this sprint
> builds the capture path on top of it. Two-week cadence, solo part-time; every slice is a small PR
> behind green CI.

## Sprint goal

> The owner can log any care event in **under 10 seconds from anywhere**, with
> validated per-type detail — even before the pretty timeline exists.

## Definition of done (sprint)

- [ ] Every `care_event_type` has a Zod `details` schema
      ([ADR-0011](../decisions/0011-server-actions-and-validation.md)), with
      unit tests for valid **and** invalid payloads per type.
- [ ] Logging works from a tree's detail screen *and* from the global **+** in
      the nav (which stops being disabled).
- [ ] `occurred_at` defaults to now and is freely editable (backdating works at
      capture time).
- [ ] Validation runs at the Server Action boundary; a malformed `details`
      payload is rejected server-side, not just in the UI.
- [ ] Capture friction honors the product bar: at most one required field per
      type; the rest progressively disclosed.

## Slices (one PR each, in order)

### 1. Care domain + per-type Zod schemas *(no UI)*
- Add `zod`; `src/domain/care.ts`: a discriminated union keyed on
  `care_event_type` (all 10 types), `parseCareEntry` mirroring the
  `parseTreeForm` result shape.
- Per-type `details`: fertilizing `{product?, npk?, amount?}`, repotting
  `{new_pot?, soil_mix?, root_work?}`, pruning `{intensity?}`, wiring
  `{branches?}`, pest_treatment `{issue?, treatment?}`, etc. All fields optional
  — structure must never block capture.
- Unit tests per type (valid, invalid, unknown-type, junk-details).

### 2. Care data-access + Server Actions
- `src/server/care.ts`: `createCareEntry`, `updateCareEntry`,
  `deleteCareEntry`, `listTreeEntries` — owner-scoped, `owner_id` from the
  session (the established `trees.ts` pattern).
- Regenerate `database.types.ts` (requires the care-log migration pushed to the
  hosted project — flag to the owner if not yet done).

### 3. Quick-add from a tree
- "Log care" on the tree detail: type picker (high-frequency types first:
  watering, fertilizing, note, observation) → dynamic per-type fields →
  editable `occurred_at` → save → entry visible (simple list until Sprint 03's
  timeline).

### 4. Global "+" quick-add
- Enable the nav's center action: tree picker (default = last-used tree; skip
  the picker when there's only one) → same form → success feedback.
- Remember last type + tree in `localStorage` for repeat logging.

## Demo at sprint end

Tap **+** anywhere → log a fertilizing with NPK on any tree in seconds → the
row lands; a forged/malformed payload is rejected server-side.

## Explicitly NOT in this sprint

The merged timeline UI, filters, edit-after-the-fact, photo↔event attach — all
Sprint 03. Tasks/scheduling — M4.

## Risks to watch

- **Capture friction** is the product-defining risk: if per-type forms feel
  heavy, the logging habit dies. Default everything, require almost nothing.
- **Types drift**: the Zod union must derive its type list from the generated
  `Constants` so a future enum value fails the build until a schema exists.
- Hosted DB must have the care-log migration applied before slice 2's typegen.
