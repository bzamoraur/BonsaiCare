-- ============================================================================
-- tasks isolation + archive-skip test (pgTAP, run by `supabase test db`).
--
-- Proves tasks are owner-scoped: a user sees and mutates only their own tasks,
-- cannot write one owned by another user, RLS is enabled with four policies, the
-- care_log_entries → tasks FK exists, and archiving a tree auto-skips its pending
-- tasks while leaving already-completed ones untouched. Same offline-safe
-- role/claims simulation as the other RLS tests (no network needed).
-- ============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Two users (the signup trigger creates their profiles).
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'a-task@bonsai.test'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'b-task@bonsai.test');

-- One tree per user; A gets a pending task (archive test) and a done task
-- (guard that archive leaves it alone). Seeded as superuser (bypasses RLS).
insert into public.trees (id, owner_id, name) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'A tree'),
  ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'B tree');
insert into public.tasks (id, owner_id, tree_id, type, title, due_on, status) values
  ('a0000000-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'watering', 'Water A', '2026-07-01', 'pending'),
  ('a0000000-0000-0000-0000-0000000000a2', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'fertilizing', 'Feed A', '2026-06-01', 'done'),
  ('b0000000-0000-0000-0000-0000000000b1', '22222222-2222-2222-2222-222222222222',
   'b0000000-0000-0000-0000-000000000001', 'pruning', 'Prune B', '2026-07-01', 'pending');

-- ---- Act as user B ---------------------------------------------------------
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*)::int from public.tasks), 1, 'B sees only their own task');
select is_empty(
  $$ select 1 from public.tasks where owner_id = '11111111-1111-1111-1111-111111111111' $$,
  'B cannot read A''s tasks');
select is_empty(
  $$ update public.tasks set title='hacked'
     where owner_id='11111111-1111-1111-1111-111111111111' returning 1 $$,
  'B cannot update A''s task');
select is_empty(
  $$ delete from public.tasks
     where owner_id='11111111-1111-1111-1111-111111111111' returning 1 $$,
  'B cannot delete A''s task');
select throws_ok(
  $$ insert into public.tasks (owner_id, tree_id, type, title, due_on)
     values ('11111111-1111-1111-1111-111111111111',
             'a0000000-0000-0000-0000-000000000001', 'wiring', 'x', '2026-07-01') $$,
  '42501', null, 'B cannot insert a task owned by A');
select lives_ok(
  $$ insert into public.tasks (owner_id, tree_id, type, title, due_on)
     values ('22222222-2222-2222-2222-222222222222',
             'b0000000-0000-0000-0000-000000000001', 'custom', 'Order akadama', '2026-07-10') $$,
  'B can insert their own task');

-- ---- Structural guards -----------------------------------------------------
reset role;
select ok(
  (select relrowsecurity from pg_class where oid = 'public.tasks'::regclass),
  'RLS enabled on tasks');
select is(
  (select count(*)::int from pg_policies
   where schemaname='public' and tablename='tasks'),
  4, 'four owner-scoped policies exist on tasks');
select ok(
  exists(select 1 from pg_constraint
         where conname = 'care_log_entries_task_id_fkey' and contype = 'f'),
  'care_log_entries.task_id FK to tasks exists');

-- ---- Archive auto-skip, acting as the tree's owner (A) ----------------------
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
update public.trees set archived_at = now()
  where id = 'a0000000-0000-0000-0000-000000000001';

select is(
  (select status::text from public.tasks where id = 'a0000000-0000-0000-0000-0000000000a1'),
  'skipped', 'archiving a tree auto-skips its pending task');
select is(
  (select status::text from public.tasks where id = 'a0000000-0000-0000-0000-0000000000a2'),
  'done', 'archiving a tree leaves an already-done task untouched');

select * from finish();
rollback;
