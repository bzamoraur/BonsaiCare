# Sprint 02 — "Log care, fast" (Milestone M3, capture half)

> **Status:** Historical · **Updated:** 2026-07-06
>
> **Outcome: shipped (PRs #19–#21).** Care validation domain (Zod per type,
> 12 tests), care data-access + owner-scoped Server Action, the "Log care" form
> on the tree detail (per-type fields, timezone-correct backdating), and the
> global **+** (a `/log` tree picker that skips straight to the tree when there's
> only one, landing on its detail with the form auto-opened). The care-log
> migration was confirmed live on the hosted project. Next: [Sprint 03](./sprint-03.md).

## Sprint goal

> The owner can log any care event in **under 10 seconds from anywhere**, with
> validated per-type detail — even before the pretty timeline exists.

## Definition of done (sprint)

- [x] Every `care_event_type` has a Zod `details` schema
      ([ADR-0011](../decisions/0011-server-actions-and-validation.md)), with
      unit tests for valid **and** invalid payloads per type.
- [x] Logging works from a tree's detail screen *and* from the global **+** in
      the nav (which stops being disabled).
- [x] `occurred_at` defaults to now and is freely editable (backdating works at
      capture time).
- [x] Validation runs at the Server Action boundary; a malformed `details`
      payload is rejected server-side, not just in the UI.
- [x] Capture friction honors the product bar: at most one required field per
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
