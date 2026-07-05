# Sprint 03 — "The tree's story" (Milestone M3, timeline half)

> **Status:** Historical · **Updated:** 2026-07-06
>
> **Outcome: shipped (PRs #22–#24).** The merged per-tree timeline (care events +
> photos, newest first, icon rail), URL-driven type filter, edit/delete of care
> entries (shared `CareEntryFields`; day-granular date), and photo↔event attach
> (a photo added on an entry folds under it; tree-level photos are standalone
> items). M3's features are complete. **One DoD item deferred:** the log→timeline
> **e2e** waits on a Playwright auth harness (logged in the backlog; it also
> serves M5's critical-flow e2e). Next milestone: M4 ([Sprint 04](./sprint-04.md)).

## Sprint goal

> Each tree shows **one coherent, filterable, backdate-correct timeline** that
> merges care events and photos — the "ordered history per tree" the product
> exists for.

## Definition of done (sprint = M3 exit)

- [x] A tree's detail screen shows a merged, date-descending timeline of care
      entries **and** photos (a standalone photo — `care_log_entry_id` null —
      is its own timeline item).
- [x] Timeline filters by event type via URL params (shareable, refresh-safe —
      the M2 collection-filter pattern).
- [x] Entries can be edited (including the occurred date — backdating reorders
      correctly) and deleted behind a confirm.
- [x] A photo can be attached to an event; it renders inline on that event's
      timeline item.
- [ ] E2e: log an event → it appears on the timeline. **Deferred** — needs the
      Playwright auth harness (backlog); unit coverage + manual verification stand
      in for now.
- [x] M3 feature exit criteria in the [roadmap](./roadmap.md) check out.

## Slices (one PR each, in order)

### 5. Per-tree timeline read model + UI
- Merged read: care entries (`occurred_at`) ∪ photos (`taken_at`), ordered
  desc — in SQL (union/view), not JS, so pagination stays possible.
- Timeline component on the tree detail: type icon + title/notes summary per
  event; photo items as thumbnails (batched signed URLs, the M2 pattern);
  day/month grouping for scannability.

### 6. Filter + edit/backdate/delete
- URL-driven type filter chips above the timeline.
- Edit form reuses the Sprint-02 Zod schemas; delete is confirm-guarded
  (established two-step inline pattern); a soft warning on far-future dates.

### 7. Photo ↔ event wiring
- The photo uploader accepts an optional `care_log_entry_id`; the "Log care"
  form offers "add a photo" which uploads then links.
- Verify: deleting an event nulls the link (`on delete set null`) and the photo
  survives as a standalone timeline item.

## Demo at sprint end

Open a tree → scroll a merged photo + event history → filter to "repotting" →
backdate an entry and watch it reorder → attach an after-shot to a pruning.

## Explicitly NOT in this sprint

Global cross-tree timeline/search, calendar, tasks — M4+. Batch logging across
trees — backlog (MVP-adjacent).

## Risks to watch

- **The union query is the design center** — if photos are bolted on in JS the
  pagination story breaks later. Do it in SQL from the start.
- Timeline thumbnails multiply signed-URL volume; keep the batching discipline
  (one `createSignedUrls` call per render).
- `router.refresh()` re-renders the whole timeline after each edit — fine at
  MVP scale; log to the tech-debt register if it ever feels slow (the ADR-0011
  re-evaluation trigger).
