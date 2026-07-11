-- ============================================================================
-- Delete-path B2 purge — close the "delete doesn't reach the off-site mirror"
-- gap (audit finding; ADR-0008 data-ownership completeness).
--
-- When a user deletes their account, `deleteAccount` (src/server/account.ts)
-- removes their Storage bytes and cascades every DB row. But the off-site
-- Backblaze B2 photo mirror (photo-backup.yml — deliberately never deletes) is
-- untouched, so the deleted user's photos linger there indefinitely. That's a
-- real "delete means delete" gap.
--
-- The app runtime holds ZERO B2 credentials by design (grep src/ for B2_* — none;
-- keeping delete-capable keys out of Vercel preserves the security posture). So
-- the purge can't happen synchronously in the request. Instead the deletion
-- ENQUEUES the user's storage prefix here, and an out-of-band GitHub Actions job
-- (b2-purge.yml + scripts/purge-b2.mjs, shipped in a follow-up PR, holding the
-- delete-capable B2 key as an Actions secret) drains the queue on a schedule.
--
-- ADDITIVE: delete_my_account keeps its signature (void), so the deployed app's
-- `.rpc('delete_my_account')` call is unchanged before and after the push.
-- ============================================================================

-- The queue. `uid` is the user's storage prefix (photos live under `<uid>/...`
-- in both the Supabase bucket and the B2 mirror). Intentionally FK-LESS: the row
-- must OUTLIVE the auth.users deletion that enqueues it — a cascade would delete
-- the very instruction we need to act on. PII-poor: just the UUID that was the
-- prefix, plus timestamps. `purged_at` NULL = still to do.
-- `uid` is the primary key: an account deletes exactly once and auth UUIDs are
-- never reused, so it is unique by construction — and it gives the drain job's
-- `update … where uid` a unique target (and satisfies the missing-PK advisor).
create table public.b2_purge_queue (
  uid          uuid not null primary key,
  requested_at timestamptz not null default now(),
  purged_at    timestamptz
);

-- The drain job scans "not yet purged"; index that predicate.
create index b2_purge_queue_pending_idx
  on public.b2_purge_queue (requested_at)
  where purged_at is null;

-- RLS on, no policies, direct grants revoked from the API roles. The only writer
-- is the definer function below; the only reader/updater is the Actions job,
-- which authenticates with the service_role key (BYPASSRLS) and needs table
-- privileges to read the queue and stamp purged_at.
alter table public.b2_purge_queue enable row level security;
revoke all on table public.b2_purge_queue from anon, authenticated;
grant select, update on table public.b2_purge_queue to service_role;

-- ----------------------------------------------------------------------------
-- Enqueue the caller's prefix atomically with their deletion, BEFORE the cascade
-- removes them. Same SECURITY DEFINER + auth.uid()-only-target guarantees as the
-- original: a caller can only ever enqueue (and delete) themselves.
-- ----------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Queue the off-site B2 purge first (same txn as the deletion). FK-less, so it
  -- survives the auth.users delete on the next line.
  insert into public.b2_purge_queue (uid) values (uid);

  -- Cascades to every public.* row owned by this user (see FKs).
  delete from auth.users where id = uid;
end;
$$;

-- CREATE OR REPLACE preserves the prior ACL; re-assert the intended grants so the
-- migration is self-contained and audit-clear.
revoke execute on function public.delete_my_account() from anon, public;
grant execute on function public.delete_my_account() to authenticated;
