-- ============================================================================
-- care_log_entries isolation test (pgTAP, run by `supabase test db`).
--
-- Proves care log entries are owner-scoped: a user sees and mutates only their
-- own entries, cannot write one owned by another user, RLS is enabled, and the
-- photos → care_log_entry link column exists. Uses the same offline-safe
-- role/claims simulation as the other RLS tests (no network needed).
-- ============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Two users (the signup trigger creates their profiles).
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'a-care@bonsai.test'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'b-care@bonsai.test');

-- One tree + one care entry per user (seeded as superuser; bypasses RLS).
insert into public.trees (id, owner_id, name) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'A tree'),
  ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'B tree');
insert into public.care_log_entries (id, owner_id, tree_id, type) values
  ('a0000000-0000-0000-0000-0000000000e1', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'watering'),
  ('b0000000-0000-0000-0000-0000000000e1', '22222222-2222-2222-2222-222222222222',
   'b0000000-0000-0000-0000-000000000001', 'fertilizing');

-- ---- Act as user B ---------------------------------------------------------
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*)::int from public.care_log_entries), 1, 'B sees only their own entry');
select is_empty(
  $$ select 1 from public.care_log_entries where owner_id = '11111111-1111-1111-1111-111111111111' $$,
  'B cannot read A''s entry');
select is_empty(
  $$ update public.care_log_entries set notes='hacked'
     where owner_id='11111111-1111-1111-1111-111111111111' returning 1 $$,
  'B cannot update A''s entry');
select is_empty(
  $$ delete from public.care_log_entries
     where owner_id='11111111-1111-1111-1111-111111111111' returning 1 $$,
  'B cannot delete A''s entry');
select throws_ok(
  $$ insert into public.care_log_entries (owner_id, tree_id, type)
     values ('11111111-1111-1111-1111-111111111111',
             'a0000000-0000-0000-0000-000000000001', 'pruning') $$,
  '42501', null, 'B cannot insert an entry owned by A');
select lives_ok(
  $$ insert into public.care_log_entries (owner_id, tree_id, type)
     values ('22222222-2222-2222-2222-222222222222',
             'b0000000-0000-0000-0000-000000000001', 'repotting') $$,
  'B can insert their own entry');

-- ---- Structural guards -----------------------------------------------------
reset role;
select ok(
  (select relrowsecurity from pg_class where oid = 'public.care_log_entries'::regclass),
  'RLS enabled on care_log_entries');
select has_column(
  'public'::name, 'photos'::name, 'care_log_entry_id'::name,
  'photos has the care_log_entry_id link column');
select is(
  (select count(*)::int from pg_policies
   where schemaname='public' and tablename='care_log_entries'),
  4, 'four owner-scoped policies exist on care_log_entries');

select * from finish();
rollback;
