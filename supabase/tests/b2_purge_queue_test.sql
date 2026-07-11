-- ============================================================================
-- b2_purge_queue test (pgTAP, run by `supabase test db`).
-- Covers migration 20260711130000_b2_purge_queue.sql:
--
--   * delete_my_account enqueues the caller's prefix (from auth.uid()) and the
--     queue row SURVIVES the auth.users deletion it is enqueued alongside (the
--     table is intentionally FK-less);
--   * the enqueued row starts unpurged (purged_at NULL);
--   * anon/authenticated cannot read the queue directly (grants revoked), while
--     the service_role (the Actions drain job) can.
--
-- Offline-safe role/claims simulation, same as the other tests.
-- ============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- One user who will delete their own account.
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'd3333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'gone@bonsai.test');

-- ---- The user deletes their account ----------------------------------------
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"d3333333-3333-3333-3333-333333333333","role":"authenticated"}';
select lives_ok($$ select public.delete_my_account() $$,
  'a user can delete their own account');

-- ---- Superuser: the queue captured the prefix and it outlived the deletion --
reset role;
select is(
  (select count(*)::int from public.b2_purge_queue
   where uid = 'd3333333-3333-3333-3333-333333333333'),
  1, 'deletion enqueues the user prefix for the off-site B2 purge');
select is(
  (select purged_at from public.b2_purge_queue
   where uid = 'd3333333-3333-3333-3333-333333333333'),
  null::timestamptz, 'the enqueued row starts unpurged');
select is(
  (select count(*)::int from auth.users
   where id = 'd3333333-3333-3333-3333-333333333333'),
  0, 'the account row is gone, yet the FK-less queue row remains');

-- ---- The API roles cannot read the queue; the Actions service role can ------
set local role authenticated;
select throws_ok($$ select 1 from public.b2_purge_queue $$, '42501', null,
  'an authenticated user cannot read the purge queue directly');

-- Relies on service_role's stock BYPASSRLS: with RLS on and zero policies, a
-- non-bypassing role holding only a SELECT grant would see 0 rows here.
reset role;
set local role service_role;
select is((select count(*)::int from public.b2_purge_queue), 1,
  'the service role (the Actions drain job) can read the queue');

reset role;
select * from finish();
rollback;
