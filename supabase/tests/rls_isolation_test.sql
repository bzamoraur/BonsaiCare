-- ============================================================================
-- RLS cross-user isolation test (pgTAP, run by `supabase test db`).
--
-- Guarantees the core privacy promise: a user can never read or modify another
-- user's data, and an unauthenticated (anon) session can reach nothing. Also
-- verifies the handle_new_user signup trigger and the global-species read/write
-- rules. Uses the offline-safe simulation (set role + request.jwt.claims) — no
-- external test-helper extension, so it never needs network access in CI.
--
-- See docs/architecture/data-and-privacy.md and docs/development/testing-strategy.md.
-- ============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

-- Fixed UUIDs so we can reference seeded rows across roles.
-- A = user A, B = user B; suffixes: 1=tree 2=location 3=tag 4=species.
-- ---- Setup: two users (runs as the superuser the harness connects with) -----
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'user-a@bonsai.test'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'user-b@bonsai.test');

-- The signup trigger must have created a profile for each new auth user.
select is((select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1, 'handle_new_user created a profile for user A');
select is((select count(*)::int from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  1, 'handle_new_user created a profile for user B');

-- One row per owned table for each user (seeded as superuser; bypasses RLS).
insert into public.locations (id, owner_id, name) values
  ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'A bench'),
  ('b0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'B bench');
insert into public.species (id, owner_id, common_name, type) values
  ('a0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'A custom species', 'other'),
  ('b0000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'B custom species', 'other');
insert into public.trees (id, owner_id, name) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'A juniper'),
  ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'B maple');
insert into public.tags (id, owner_id, name) values
  ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'A tag'),
  ('b0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'B tag');
insert into public.tree_tags (tree_id, tag_id, owner_id) values
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111111'),
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   '22222222-2222-2222-2222-222222222222');

-- ---- Act as user A ----------------------------------------------------------
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*)::int from public.trees), 1, 'A sees only their own tree');
select isnt_empty($$ select 1 from public.species where owner_id is null $$,
  'A can read global seeded species');

-- ---- Act as user B ----------------------------------------------------------
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

-- Each owner-scoped table: B sees exactly their own one row (count=1 sentinel —
-- this also proves auth.uid() is wired; if it were NULL these would be 0).
select is((select count(*)::int from public.trees), 1, 'B sees only their own tree');
select is((select count(*)::int from public.locations), 1, 'B sees only their own location');
select is((select count(*)::int from public.tags), 1, 'B sees only their own tag');
select is((select count(*)::int from public.tree_tags), 1, 'B sees only their own tree_tag');

-- B cannot READ A's private rows.
select is_empty($$ select 1 from public.trees where owner_id = '11111111-1111-1111-1111-111111111111' $$,
  'B cannot read A''s tree');
select is_empty($$ select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  'B cannot read A''s profile');
select is_empty($$ select 1 from public.species where id = 'a0000000-0000-0000-0000-000000000004' $$,
  'B cannot read A''s owned species');

-- B cannot UPDATE A's rows (RLS hides them → 0 rows affected).
select is_empty($$ update public.trees set name='hacked'
  where owner_id='11111111-1111-1111-1111-111111111111' returning 1 $$, 'B cannot update A''s tree');
select is_empty($$ update public.profiles set display_name='hacked'
  where id='11111111-1111-1111-1111-111111111111' returning 1 $$, 'B cannot update A''s profile');
select is_empty($$ update public.locations set name='hacked'
  where owner_id='11111111-1111-1111-1111-111111111111' returning 1 $$, 'B cannot update A''s location');
select is_empty($$ update public.tags set name='hacked'
  where owner_id='11111111-1111-1111-1111-111111111111' returning 1 $$, 'B cannot update A''s tag');

-- B cannot DELETE A's rows.
select is_empty($$ delete from public.trees
  where owner_id='11111111-1111-1111-1111-111111111111' returning 1 $$, 'B cannot delete A''s tree');
select is_empty($$ delete from public.tree_tags
  where owner_id='11111111-1111-1111-1111-111111111111' returning 1 $$, 'B cannot delete A''s tree_tag');

-- Global species are read-only to everyone.
select is_empty($$ update public.species set common_name='x' where owner_id is null returning 1 $$,
  'users cannot modify global species');

-- B cannot INSERT a row owned by A (WITH CHECK violation → 42501).
select throws_ok($$ insert into public.trees (owner_id, name)
  values ('11111111-1111-1111-1111-111111111111', 'spoofed') $$,
  '42501', null, 'B cannot insert a tree owned by A');

-- B CAN create their own rows (positive paths).
select lives_ok($$ insert into public.trees (owner_id, name)
  values ('22222222-2222-2222-2222-222222222222', 'B pine') $$, 'B can insert their own tree');
select lives_ok($$ insert into public.species (owner_id, common_name)
  values ('22222222-2222-2222-2222-222222222222', 'B another species') $$,
  'B can insert their own species');

-- ---- Anonymous (unauthenticated) sessions reach nothing ---------------------
reset role;
set local role anon;
select throws_ok($$ select 1 from public.trees $$, '42501', null, 'anon cannot read trees');
select throws_ok($$ insert into public.trees (owner_id, name)
  values ('11111111-1111-1111-1111-111111111111', 'x') $$, '42501', null, 'anon cannot insert trees');

-- ---- Structural guard: RLS must stay enabled on every owned table -----------
reset role;
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),  'RLS on profiles');
select ok((select relrowsecurity from pg_class where oid = 'public.species'::regclass),   'RLS on species');
select ok((select relrowsecurity from pg_class where oid = 'public.locations'::regclass), 'RLS on locations');
select ok((select relrowsecurity from pg_class where oid = 'public.trees'::regclass),     'RLS on trees');
select ok((select relrowsecurity from pg_class where oid = 'public.tags'::regclass),      'RLS on tags');
select ok((select relrowsecurity from pg_class where oid = 'public.tree_tags'::regclass), 'RLS on tree_tags');

select * from finish();
rollback;
