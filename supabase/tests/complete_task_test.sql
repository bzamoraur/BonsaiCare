-- ============================================================================
-- complete_task RPC test (pgTAP, run by `supabase test db`).
--
-- Proves atomic completion/skip: a one-off completion logs a linked care event
-- and spawns no successor; a recurring completion/skip spawns the next
-- occurrence (skip and logEvent=false log NO care event); the status guard makes
-- re-completing a RECURRING task raise without a duplicate successor; a
-- collection-wide (tree-less) task resolves without a care event; and RLS stops
-- one user resolving another's task. Offline-safe role/claims simulation.
-- ============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'a-rpc@bonsai.test'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'b-rpc@bonsai.test');

insert into public.trees (id, owner_id, name) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'A tree'),
  ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'B tree');

-- A's tasks: one-off, recurring (complete), recurring (skip), spare (cross-owner),
-- and a collection-wide recurring task (tree_id null).
insert into public.tasks (id, owner_id, tree_id, type, title, due_on, status, recurrence) values
  ('a0000000-0000-0000-0000-0000000000f1', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'watering', 'Water A', '2026-07-01', 'pending', null),
  ('a0000000-0000-0000-0000-0000000000d1', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'fertilizing', 'Feed A', '2026-07-01', 'pending',
   '{"interval_days":14,"anchor":"completion"}'::jsonb),
  ('a0000000-0000-0000-0000-0000000000d2', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'pruning', 'Prune A', '2026-07-01', 'pending',
   '{"interval_days":19,"anchor":"completion"}'::jsonb),
  ('a0000000-0000-0000-0000-0000000000f2', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'watering', 'Spare A', '2026-07-01', 'pending', null),
  ('a0000000-0000-0000-0000-0000000000c1', '11111111-1111-1111-1111-111111111111',
   null, 'watering', 'Collection task', '2026-07-01', 'pending',
   '{"interval_days":30,"anchor":"completion"}'::jsonb);

-- ---- Act as user A ---------------------------------------------------------
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- 1. Complete the one-off, logging a linked care event.
select lives_ok(
  $$ select public.complete_task(
       'a0000000-0000-0000-0000-0000000000f1', 'done', '2026-07-01', true, 'watering', null, null) $$,
  'A can complete a one-off task');
select is(
  (select status::text from public.tasks where id = 'a0000000-0000-0000-0000-0000000000f1'),
  'done', 'one-off task is marked done');
select is(
  (select count(*)::int from public.care_log_entries
   where task_id = 'a0000000-0000-0000-0000-0000000000f1' and type = 'watering'),
  1, 'completion logs a care event linked via task_id');
select is(
  (select count(*)::int from public.tasks where tree_id = 'a0000000-0000-0000-0000-000000000001'),
  4, 'a one-off completion spawns no successor task');

-- 2. Complete a recurring task with logEvent=false; next occurrence, no care event.
select lives_ok(
  $$ select public.complete_task(
       'a0000000-0000-0000-0000-0000000000d1', 'done', '2026-07-01', false, null, null, '2026-07-15') $$,
  'A can complete a recurring task');
select is(
  (select status::text from public.tasks where id = 'a0000000-0000-0000-0000-0000000000d1'),
  'done', 'recurring task is marked done');
select is(
  (select count(*)::int from public.tasks
   where owner_id = '11111111-1111-1111-1111-111111111111'
     and due_on = '2026-07-15' and status = 'pending' and type = 'fertilizing'),
  1, 'recurring completion spawns the next occurrence at the given due date');
select is(
  (select count(*)::int from public.care_log_entries
   where task_id = 'a0000000-0000-0000-0000-0000000000d1'),
  0, 'a completion with logEvent=false writes no care event');

-- 3. Skip a recurring task; next occurrence appears, but no care event.
select lives_ok(
  $$ select public.complete_task(
       'a0000000-0000-0000-0000-0000000000d2', 'skipped', '2026-07-01', false, null, null, '2026-07-20') $$,
  'A can skip a recurring task');
select is(
  (select status::text from public.tasks where id = 'a0000000-0000-0000-0000-0000000000d2'),
  'skipped', 'skipped task is marked skipped');
select is(
  (select count(*)::int from public.tasks
   where owner_id = '11111111-1111-1111-1111-111111111111'
     and due_on = '2026-07-20' and status = 'pending' and type = 'pruning'),
  1, 'a skipped recurring task still spawns the next occurrence');
select is(
  (select count(*)::int from public.care_log_entries
   where task_id = 'a0000000-0000-0000-0000-0000000000d2'),
  0, 'skipping logs no care event');

-- 4. Idempotency: re-completing a RESOLVED recurring task raises AND spawns no
--    second successor (the DoD's no-duplicate guarantee, proven on a task that
--    *would* otherwise spawn one).
select throws_ok(
  $$ select public.complete_task(
       'a0000000-0000-0000-0000-0000000000d1', 'done', '2026-07-01', false, null, null, '2026-08-01') $$,
  null, null, 're-completing a resolved recurring task raises');
select is(
  (select count(*)::int from public.tasks
   where owner_id = '11111111-1111-1111-1111-111111111111' and type = 'fertilizing'
     and status = 'pending'),
  1, 're-completion spawns no duplicate successor');

-- 5. Collection-wide (tree-less) recurring task: resolves + spawns a successor,
--    and the tree-null guard suppresses the care event even when requested.
select lives_ok(
  $$ select public.complete_task(
       'a0000000-0000-0000-0000-0000000000c1', 'done', '2026-07-01', true, 'watering', null, '2026-07-31') $$,
  'A can complete a collection-wide task');
select is(
  (select status::text from public.tasks where id = 'a0000000-0000-0000-0000-0000000000c1'),
  'done', 'collection-wide task is marked done');
select is(
  (select count(*)::int from public.tasks
   where owner_id = '11111111-1111-1111-1111-111111111111'
     and due_on = '2026-07-31' and status = 'pending' and tree_id is null),
  1, 'collection-wide completion spawns a tree-less successor');
select is(
  (select count(*)::int from public.care_log_entries
   where task_id = 'a0000000-0000-0000-0000-0000000000c1'),
  0, 'a tree-less task logs no care event even when one is requested');

-- 6. One-off idempotency (raises on a task that never spawns a successor anyway).
select throws_ok(
  $$ select public.complete_task(
       'a0000000-0000-0000-0000-0000000000f1', 'done', '2026-07-01', false, null, null, null) $$,
  null, null, 're-completing an already-resolved one-off raises');

-- ---- Act as user B ---------------------------------------------------------
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$ select public.complete_task(
       'a0000000-0000-0000-0000-0000000000f2', 'done', '2026-07-01', false, null, null, null) $$,
  null, null, 'B cannot resolve A''s task (RLS hides it → not found)');

reset role;
select is(
  (select status::text from public.tasks where id = 'a0000000-0000-0000-0000-0000000000f2'),
  'pending', 'A''s spare task is unaffected by B''s attempt');

select * from finish();
rollback;
