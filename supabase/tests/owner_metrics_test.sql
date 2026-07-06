-- ============================================================================
-- owner_metrics RPC test (pgTAP, run by `supabase test db`).
--
-- Proves the aggregate counts are correct across all users (the function is
-- security-definer, so it sees past RLS) AND that the S08.3 owner gate works:
-- the configured owner receives the object, any other authenticated user
-- receives NULL, and `anon` cannot execute it at all (see integrity_hardening_
-- test.sql for the anon-denial assertion). The owner id is read from the
-- private.app_config singleton. Offline-safe role/claims simulation.
-- ============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- created_at must be set explicitly (auth.users has no default here); the
-- signups metric filters on it.
insert into auth.users (instance_id, id, aud, role, email, created_at)
values
  ('00000000-0000-0000-0000-000000000000', 'e1111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'm1@bonsai.test', now()),
  ('00000000-0000-0000-0000-000000000000', 'e2222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'm2@bonsai.test', now());

-- User 1 is the configured owner (the only caller allowed to see the metrics).
insert into private.app_config (owner_user_id)
values ('e1111111-1111-1111-1111-111111111111');

insert into public.trees (id, owner_id, name) values
  ('e1e00000-0000-0000-0000-000000000001', 'e1111111-1111-1111-1111-111111111111', 'T1'),
  ('e2e00000-0000-0000-0000-000000000001', 'e2222222-2222-2222-2222-222222222222', 'T2');

-- Only user 1 logs care → active_users should be 1, not 2.
insert into public.care_log_entries (owner_id, tree_id, type) values
  ('e1111111-1111-1111-1111-111111111111', 'e1e00000-0000-0000-0000-000000000001', 'watering');

insert into public.tasks (owner_id, tree_id, type, title, due_on, status) values
  ('e1111111-1111-1111-1111-111111111111', 'e1e00000-0000-0000-0000-000000000001',
   'watering', 'Water', '2026-07-01', 'pending');

-- ---- Act as the owner (user 1): full aggregates ----------------------------
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"e1111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((public.owner_metrics() ->> 'total_users')::int, 2, 'counts all registered users');
select is((public.owner_metrics() ->> 'signups_7d')::int, 2, 'counts recent signups');
select is((public.owner_metrics() ->> 'active_users_7d')::int, 1,
  'counts distinct users who logged care');
select is((public.owner_metrics() ->> 'total_trees')::int, 2, 'counts all trees');
select is((public.owner_metrics() ->> 'total_care_logs')::int, 1, 'counts all care logs');
select is((public.owner_metrics() ->> 'total_tasks')::int, 1, 'counts all tasks');

-- ---- Act as a non-owner (user 2): the gate returns NULL, leaking nothing ----
set local request.jwt.claims =
  '{"sub":"e2222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is(public.owner_metrics(), null::jsonb,
  'a non-owner authenticated user gets NULL, not the aggregates');

-- ---- Fail-safe: an UN-seeded config (no owner row) yields NULL even to the
-- would-be owner. `auth.uid() = (no row)` evaluates to NULL, so the CASE falls
-- through — the gate fails CLOSED, never defaulting open when misconfigured. ----
reset role;
delete from private.app_config;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"e1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is(public.owner_metrics(), null::jsonb,
  'an un-seeded config returns NULL even to the configured owner (fails closed)');

reset role;
select * from finish();
rollback;
