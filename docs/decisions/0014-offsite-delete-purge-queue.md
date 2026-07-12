# ADR-0014: Off-site delete-path purge via an enqueue-then-drain queue

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Owner + Claude

This is an **implementing ADR under [ADR-0008](./0008-data-ownership-and-export.md)**
— it does not change that decision, it completes its "account deletion is real"
corollary for the off-site copy.

## Context

[ADR-0008](./0008-data-ownership-and-export.md) makes account deletion a real
delete path: `delete_my_account()` removes the user's Storage bytes and cascades
every owned DB row. But photos are also mirrored off-site to a Backblaze B2
bucket (`photo-backup.yml`), which **deliberately never deletes** so a fat-finger
in the live bucket is recoverable. The consequence: a deleted user's photos
lingered in the mirror indefinitely — a genuine "delete means delete" gap.

The hard constraint is a deliberate security posture: **the app runtime holds
zero B2 credentials** (grep `src/` for `B2_*` — none). Keeping delete-capable
keys out of Vercel bounds the blast radius if the app is ever compromised. So a
synchronous off-site delete inside the deletion request is impossible *by
design*, not by omission.

## Options considered

1. **Give the app runtime a B2 delete key and purge synchronously.** Simple and
   immediate. But it places a delete-capable off-site credential in Vercel —
   exactly the boundary we want to keep — widening the blast radius of any app
   compromise for a mirror whose whole point is out-of-band safety.
2. **Do nothing / clean the mirror by hand.** Leaves the ADR-0008 gap open and
   relies on the owner remembering to run a manual purge — erasure that is not
   actually guaranteed.
3. **Enqueue the prefix at deletion; drain it out-of-band from GitHub Actions**
   with the delete-capable key that already lives there. Chosen.

## Decision

Choose **option 3** — enqueue then drain.

- `delete_my_account()` (migration `20260711130000`) **enqueues the user's
  `<uid>` storage prefix** into a new `public.b2_purge_queue` table in the same
  transaction, **before** cascading the `auth.users` delete. The queue is
  intentionally **FK-less and `owner_id`-less** so the row **outlives** the
  cascade that enqueues it — a foreign key would delete the very instruction we
  need to act on. `uid` is the primary key (an account deletes exactly once and
  auth UUIDs are never reused). RLS is on with no policies; only `service_role`
  gets `select, update`.
- A scheduled **`b2-purge.yml` + `scripts/purge-b2.mjs`** job drains the queue
  monthly (15th, 05:00 UTC, after the mirror run), deleting **every B2 version
  under `<uid>/`** and stamping `purged_at`. It **reuses the mirror's existing
  Read & Write key** (which already includes `deleteFiles`) — **no new secret**.
  Manual dispatch defaults to a **dry-run** preview; scheduled runs delete. It
  **fails loud**: a missing secret or failed purge turns the run red and files
  an ops-alert issue.
- The recorded decision is the **credentials boundary**: the delete-capable B2
  key lives **only** in GitHub Actions, never in the app runtime, and the
  off-site delete is therefore necessarily asynchronous.

## Consequences

- **Positive:** closes the [ADR-0008](./0008-data-ownership-and-export.md)
  off-site gap — erasure now reaches every copy, live and mirrored. No
  delete-capable credential in Vercel; no new secret; the queue is PII-poor
  (just a UUID plus timestamps).
- **Negative / accepted:** the off-site purge is **eventual** (up to ~a month),
  not synchronous — acceptable for a backup mirror. It depends on the scheduled
  cron staying enabled; GitHub disables workflows after ~60 days of repo
  inactivity (a shared risk with the other schedulers — see Pending decisions in
  [ADR-0000](./0000-adr-process.md)).
- **Reversal:** additive. The queue and job can be removed if the mirror is
  retired, with no change to the synchronous delete path.
