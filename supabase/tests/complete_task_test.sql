-- ============================================================================
-- complete_task RPC test (pgTAP, run by `supabase test db`).
--
-- Proves atomic completion/skip: a one-off completion logs a linked care event
-- and spawns no successor; a recurring completion/skip spawns the next
-- occurrence (skip without a care event); the status guard makes re-completion
-- raise (no duplicate successors); and RLS stops one user resolving another's
-- task. Offline-safe role/claims simulation, no network.
-- ============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'a-rpc@bonsai.test'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'b-rpc@bonsai.test');

insert into public.trees (id, owner_id, name) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'A tree'),
  ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'B tree');

-- A's tasks: a one-off, a recurring (to complete), a recurring (to skip), and a
-- spare for the cross-owner check. B owns nothing relevant.
insert into public.tasks (id, owner_id, tree_id, type, title, due_on, status, recurrence) values
  ('a0000000-0000-0000-0000-0000000000f1', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'watering', 'Water A', '2026-07-01', 'pending', null),
  ('a0000000-0000-0000-0000-0000000000r1', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'fertilizing', 'Feed A', '2026-07-01', 'pending',
   '{"interval_days":14,"anchor":"completion"}'::jsonb),
  ('a0000000-0000-0000-0000-0000000000r2', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'pruning', 'Prune A', '2026-07-01', 'pending',
   '{"interval_days":19,"anchor":"completion"}'::jsonb),
  ('a0000000-0000-0000-0000-0000000000f2', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'watering', 'Spare A', '2026-07-01', 'pending', null);

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

-- 2. Complete a recurring task; the next occurrence appears.
select lives_ok(
  $$ select public.complete_task(
       'a0000000-0000-0000-0000-0000000000r1', 'done', '2026-07-01', false, null, null, '2026-07-15') $$,
  'A can complete a recurring task');
select is(
  (select status::text from public.tasks where id = 'a0000000-0000-0000-0000-0000000000r1'),
  'done', 'recurring task is marked done');
select is(
  (select count(*)::int from public.tasks
   where owner_id = '11111111-1111-1111-1111-111111111111'
     and due_on = '2026-07-15' and status = 'pending' and type = 'fertilizing'),
  1, 'recurring completion spawns the next occurrence at the given due date');

-- 3. Skip a recurring task; next occurrence appears, but no care event.
select lives_ok(
  $$ select public.complete_task(
       'a0000000-0000-0000-0000-0000000000r2', 'skipped', '2026-07-01', false, null, null, '2026-07-20') $$,
  'A can skip a recurring task');
select is(
  (select status::text from public.tasks where id = 'a0000000-0000-0000-0000-0000000000r2'),
  'skipped', 'skipped task is marked skipped');
select is(
  (select count(*)::int from public.tasks
   where owner_id = '11111111-1111-1111-1111-111111111111'
     and due_on = '2026-07-20' and status = 'pending' and type = 'pruning'),
  1, 'a skipped recurring task still spawns the next occurrence');
select is(
  (select count(*)::int from public.care_log_entries
   where task_id = 'a0000000-0000-0000-0000-0000000000r2'),
  0, 'skipping logs no care event');

-- 4. Idempotency: re-completing a resolved task raises (no duplicate successor).
select throws_ok(
  $$ select public.complete_task(
       'a0000000-0000-0000-0000-0000000000f1', 'done', '2026-07-01', false, null, null, null) $$,
  null, null, 'completing an already-resolved task raises');

-- ---- Act as user B ---------------------------------------------------------
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$ select public.complete_task(
       'a0000000-0000-0000-0000-0000000000f2', 'done', '2026-07-01', false, null, null, null) $$,
  null, null, 'B cannot resolve A''s task (RLS hides it → not found)');

-- The spare task is untouched by B's failed attempt.
reset role;
select is(
  (select status::text from public.tasks where id = 'a0000000-0000-0000-0000-0000000000f2'),
  'pending', 'A''s spare task is unaffected by B''s attempt');

select * from finish();
rollback;
