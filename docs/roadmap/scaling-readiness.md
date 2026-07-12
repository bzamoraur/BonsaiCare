# Scaling readiness — ground-truthing the "you'll have a scaling problem" advice

> **Status:** Reference · **Created:** 2026-07-10 · A codebase audit of three
> outside recommendations — **indexing, caching, async** — against the app's real
> scale and priority order. **Bottom line: the advice is, for this codebase, ~90%
> already implemented or correctly deferred. There is essentially no scaling work
> worth doing now.** This doc records what's done, what's deferred, and — the useful
> part — the *signal* that should trigger each deferred item, so "later" is concrete
> rather than vague.

## Why "not now" is the right answer here

Priority order is **Cost → UX → Maintainability → Correctness → Security → Speed →
Scalability (last)**, for a €0 personal→friends app: ~1 user, ~40 trees, a few
hundred care entries/photos today, with a realistic ceiling of a few dozen friends
and single-digit-thousands of rows. Generic scaling advice optimizes the *last*
priority. Doing it speculatively trades away Maintainability (more moving parts,
staleness, invalidation surface) and — for any DB change — needs an owner-run
`supabase db push`. So each item below is judged _"worth it at real scale?"_, and
almost all come back **premature**. The advice isn't wrong in general — it just
describes a problem this app has already engineered around and won't hit soon.

## Indexing — already done well; add nothing now

Every RLS `owner_id` column is indexed, and the two hot _ordered_ read paths have
hand-built **composite** indexes whose column order matches the query exactly:

| Hot path | Query shape | Index that serves it |
| --- | --- | --- |
| Today / Calendar tasks | `owner_id =`, `status in`, `due_on` range + order | `tasks(owner_id, status, due_on)` |
| Tree timeline / repeat-last | `tree_id =`, `occurred_on desc`, `created_at desc` | `care_log_entries(tree_id, occurred_on desc, created_at desc)` |
| Collection grid (default) | `owner_id =`, `archived_at is null` | partial `trees(owner_id) where archived_at is null` |

There are **no N+1 loops** — cover-art and gallery signing are batched (one `.in()`
photos query + batched `createSignedUrls`). The team even skipped a redundant
`tasks.owner_id` index because the composite's leading column already serves it.

**Deferred, trigger-gated** (both need `db push`):

- **Owner-wide recency view.** `listTreeRecency` scans the owner's care entries
  (LIMIT 2000) and sorts in memory — already noted in-code as the intended scale
  follow-up (a `distinct on (tree_id, type)` view, not a one-line index).
- **`tasks(owner_id, completed_at) where status='done'`** for the Today "Recently
  done" list (currently an in-memory sort of done tasks).

**Skip — textbook premature:** a `pg_trgm` GIN index for the collection's
leading-wildcard search, a `health_status` index for triage, a
`photos(tree_id, taken_at)` index. All touch tiny result sets and are
sub-millisecond at any scale this product will see.

## Caching — one real (deferred) Cost item, with two traps

Already in place: request-scoped **`React cache()`** exactly where a query is called
twice in one request (`getTree`, `getTask`, `listTreePhotos`); **`revalidatePath`**
after every mutation; static assets + self-hosted fonts cached (the proxy matcher
excludes `_next/static`, images, `sw.js`, etc. from session refresh); pages are
intentionally **dynamic** because per-user RLS data can't be CDN/ISR-cached; and
**thumbnails (S10.1, shipped)** already cut per-image bytes ~10×.

The remaining gap is **server-side signed-URL churn** ([S10.2] first half / risk #9):
cover and photo URLs are re-minted with a fresh token on every render. **PR #111
already closed the browser side** — its service-worker cache is keyed by the
**token-stripped Storage path**, so repeat views hit disk with zero egress despite
the changing token (production builds only). What's left is the *first* view of each
path per device (and non-SW contexts); server-side path→URL-string memoization
(`unstable_cache`) would remove that too. Small now — thumbnails **and the SW cache**
already took the big levers, leaving ~tens of MB/month against Supabase's 5 GB free
egress.

- **Trigger for S10.2:** egress actually appears in the Supabase usage dashboard, or
  friends onboard.
- **Trap 1 — don't half-fix it.** Raising `expiresIn` from 1 h to 24 h changes
  nothing: `createSignedUrls` mints a fresh token every call, so the URL still
  changes and the browser still misses. The load-bearing fix is **server-side
  memoizing the path→URL _string_** (an in-process map / `unstable_cache` keyed by
  `storage_path` with a revalidate window) so identical paths return an identical,
  still-valid URL. The TTL only sets how long that string stays valid. (A longer-lived
  URL is a mild security trade — a leaked link is valid 24 h vs 1 h — fine for
  decorative photos.)
- **Trap 2 — ordering (resolved differently than expected, PR #111).** The worry was
  that a service-worker photo cache added *before* stable URLs "never hits." #111
  sidestepped it by keying the SW cache on the **token-stripped path**, so it hits
  even while URLs still carry a fresh token — the SW half of S10.2 shipped *first* and
  works. Server-side URL-string memoization (Trap 1) is the remaining, optional first
  half.

**Skip:** `unstable_cache` / KV / Redis / ISR on the DB list & dashboard reads.
Per-user RLS data can't be shared-cached, the reads are already single indexed
owner-scoped queries, and a cache layer would add staleness + invalidation surface
to an app that has none today.

## Async / background — already sorted for this stack

There is **no queue/worker infrastructure** on Vercel Hobby + Supabase free, and
there shouldn't be. "Async" here realistically means **cron, client-side, or
streaming** — all three already used exactly where they pay off:

- **Cron (GitHub Actions; service-role key stays off the app runtime):** weekly DB
  backup, monthly B2 photo mirror, monthly orphan sweep, keep-warm.
- **Client-side:** photo compression (WebP in-browser) + **direct-to-Storage
  upload**, so large binaries never flow through a Vercel function — the single
  biggest reason the app stays inside Hobby limits at €0.
- **Streaming:** the photo-ZIP export streams (store-method, no re-deflate of
  already-compressed WebP, `maxDuration=60`) with a signed-URL **manifest fallback**
  past 500 photos.

Batch care/task inserts are single atomic array inserts (nothing to background).
Account deletion and JSON/CSV export are synchronous but finish well under the
function budget at this scale.

- **Deferred, trigger-gated:** move client image compression to an **OffscreenCanvas
  Web Worker** and derive the thumbnail from the already-decoded bitmap in one pass
  (today it decodes each file twice → ~100–300 ms main-thread jank). **Trigger:** a
  bulk multi-photo uploader is built. Pointless for one-photo-per-tap.
- **Optional nicety:** add `maxDuration` to the JSON/CSV export route for headroom
  parity with the photo route (unnecessary at this scale).

## Trip-wires — the signal that turns "later" into "now"

| Signal | Then do |
| --- | --- |
| Supabase **egress** rises in the usage dashboard, or friends onboard | server-side S10.2 — memoize the signed-URL _string_ (the SW photo-cache half already shipped, PR #111) |
| A user passes ~a few **thousand care entries** and recency chips feel slow | owner-wide recency `distinct on` view |
| An account reaches **5-figure completed tasks** | partial `tasks(owner_id, completed_at) where status='done'` |
| A **bulk multi-photo uploader** is built | Web-Worker / single-pass image compression |
| A specific query is **observed slow in real use** | index / optimize _that_ query — measured, not speculative |

Until a trip-wire trips, the correct action is **none** — which is exactly what
"Scalability is the last priority" means in practice. Sits alongside the
[improvement plan](./improvement-plan.md) (S10.2 is its risk #9) and the
[going-public plan](./going-public-plan.md) (where friends onboarding — the main
trip-wire — is scheduled).
