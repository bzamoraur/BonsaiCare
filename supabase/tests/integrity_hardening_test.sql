-- ============================================================================
-- Security + integrity hardening test (pgTAP, run by `supabase test db`).
-- Covers migration 20260706160000_security_and_integrity_hardening.sql:
--
--   * anon can no longer EXECUTE the app RPCs / definer functions (the leftover
--     default grant the original migrations' `revoke ... from public` missed);
--   * the `private` schema holding the owner id is invisible to `authenticated`;
--   * CHECK constraints reject blank names, non-object json, non-positive dims;
--   * the owner-consistency composite FKs reject a child row (photo / care entry
--     / task / tree_tag) that points at ANOTHER user's tree or tag — the gap RLS
--     alone leaves open, since RLS only proves owner_id = auth.uid().
--
-- Offline-safe role/claims simulation, same as the other tests.
-- ============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Two users; A owns tree TA + tag GA, B owns tree TB (seeded as superuser).
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'a-hard@bonsai.test'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'b-hard@bonsai.test');
insert into public.trees (id, owner_id, name) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'A tree'),
  ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'B tree');
insert into public.tags (id, owner_id, name) values
  ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'A tag');

-- ---- anon cannot execute the revoked functions -----------------------------
set local role anon;
select throws_ok($$ select public.owner_metrics() $$, '42501', null,
  'anon cannot execute owner_metrics');
select throws_ok($$ select public.delete_my_account() $$, '42501', null,
  'anon cannot execute delete_my_account');
select throws_ok(
  $$ select public.complete_task(
       '00000000-0000-0000-0000-000000000000'::uuid,
       'done'::public.task_status, '2026-07-01'::date) $$,
  '42501', null, 'anon cannot execute complete_task');
select throws_ok($$ select public.handle_new_user() $$, '42501', null,
  'anon cannot execute the signup trigger function directly');

-- ---- the private owner-config schema is invisible to authenticated ----------
reset role;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok($$ select 1 from private.app_config $$, '42501', null,
  'authenticated has no access to the private config schema');

-- ---- CHECK constraints reject bad data (acting as owner A, so RLS allows) ----
select throws_ok(
  $$ insert into public.trees (owner_id, name)
     values ('11111111-1111-1111-1111-111111111111', '   ') $$,
  '23514', null, 'a blank tree name is rejected');
select throws_ok(
  $$ insert into public.tasks (owner_id, tree_id, type, title, due_on)
     values ('11111111-1111-1111-1111-111111111111',
             'a0000000-0000-0000-0000-000000000001', 'watering', '   ', '2026-07-01') $$,
  '23514', null, 'a blank task title is rejected');
select throws_ok(
  $$ insert into public.care_log_entries (owner_id, tree_id, type, details)
     values ('11111111-1111-1111-1111-111111111111',
             'a0000000-0000-0000-0000-000000000001', 'watering', '[]'::jsonb) $$,
  '23514', null, 'a non-object details value is rejected');
select throws_ok(
  $$ insert into public.tasks (owner_id, tree_id, type, title, due_on, recurrence)
     values ('11111111-1111-1111-1111-111111111111',
             'a0000000-0000-0000-0000-000000000001', 'watering', 'x', '2026-07-01',
             '"nope"'::jsonb) $$,
  '23514', null, 'a non-object recurrence value is rejected');
select throws_ok(
  $$ insert into public.photos (owner_id, tree_id, storage_path, width)
     values ('11111111-1111-1111-1111-111111111111',
             'a0000000-0000-0000-0000-000000000001', 'p.webp', 0) $$,
  '23514', null, 'a zero photo width is rejected');
select throws_ok(
  $$ insert into public.photos (owner_id, tree_id, storage_path, height)
     values ('11111111-1111-1111-1111-111111111111',
             'a0000000-0000-0000-0000-000000000001', 'p.webp', -5) $$,
  '23514', null, 'a negative photo height is rejected');

-- ---- CHECK positive paths still work ---------------------------------------
select lives_ok(
  $$ insert into public.trees (owner_id, name)
     values ('11111111-1111-1111-1111-111111111111', 'A valid tree') $$,
  'a non-blank tree name is allowed');
select lives_ok(
  $$ insert into public.tasks (owner_id, tree_id, type, title, due_on, recurrence)
     values ('11111111-1111-1111-1111-111111111111',
             'a0000000-0000-0000-0000-000000000001', 'watering', 'Water', '2026-07-01', null) $$,
  'a one-off task (null recurrence) is allowed');
select lives_ok(
  $$ insert into public.care_log_entries (owner_id, tree_id, type, details)
     values ('11111111-1111-1111-1111-111111111111',
             'a0000000-0000-0000-0000-000000000001', 'note', '{"foo":"bar"}'::jsonb) $$,
  'an object details value is allowed');

-- ---- Composite FK: a child cannot reference ANOTHER user's tree/tag ---------
-- Acting as B: owner_id = B satisfies RLS, but tree_id/tag_id point at A's rows,
-- so the (id, owner_id) composite FK rejects with 23503 — the protection RLS
-- alone does not provide.
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$ insert into public.photos (owner_id, tree_id, storage_path)
     values ('22222222-2222-2222-2222-222222222222',
             'a0000000-0000-0000-0000-000000000001',
             '22222222-2222-2222-2222-222222222222/a0000000-0000-0000-0000-000000000001/x.webp') $$,
  '23503', null, 'B cannot attach a photo to A''s tree');
select throws_ok(
  $$ insert into public.care_log_entries (owner_id, tree_id, type)
     values ('22222222-2222-2222-2222-222222222222',
             'a0000000-0000-0000-0000-000000000001', 'watering') $$,
  '23503', null, 'B cannot log a care entry against A''s tree');
select throws_ok(
  $$ insert into public.tasks (owner_id, tree_id, type, title, due_on)
     values ('22222222-2222-2222-2222-222222222222',
             'a0000000-0000-0000-0000-000000000001', 'watering', 'x', '2026-07-01') $$,
  '23503', null, 'B cannot create a task against A''s tree');
select throws_ok(
  $$ insert into public.tree_tags (tree_id, tag_id, owner_id)
     values ('b0000000-0000-0000-0000-000000000001',
             'a0000000-0000-0000-0000-000000000003',
             '22222222-2222-2222-2222-222222222222') $$,
  '23503', null, 'B cannot attach A''s tag to their own tree');

-- Positive: B's own tree accepts B's own photo (composite FK satisfied).
select lives_ok(
  $$ insert into public.photos (owner_id, tree_id, storage_path)
     values ('22222222-2222-2222-2222-222222222222',
             'b0000000-0000-0000-0000-000000000001',
             '22222222-2222-2222-2222-222222222222/b0000000-0000-0000-0000-000000000001/ok.webp') $$,
  'B can attach a photo to their own tree');

reset role;
select * from finish();
rollback;
