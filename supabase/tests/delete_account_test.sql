-- ============================================================================
-- delete_my_account RPC test (pgTAP, run by `supabase test db`).
--
-- Proves that deleting the caller's auth.users row cascades EVERY owned table
-- (profiles, locations, species, tags, trees, tree_tags, care_log_entries,
-- photos, tasks); that a second user's data is untouched (only the caller is
-- deleted, because the target is auth.uid() not a parameter); and that an
-- unauthenticated call raises. Offline-safe role/claims simulation.
-- ============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Two users. handle_new_user() auto-creates a profile row for each on insert.
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'd1111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'del-a@bonsai.test'),
  ('00000000-0000-0000-0000-000000000000', 'd2222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'del-b@bonsai.test');

-- A full owned graph for user A across every cascade table.
insert into public.locations (id, owner_id, name) values
  ('d1100000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 'Balcony');
insert into public.species (id, owner_id, common_name) values
  ('d1500000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 'My cultivar');
insert into public.tags (id, owner_id, name) values
  ('d1a00000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 'shohin');
insert into public.trees (id, owner_id, name, location_id, species_id) values
  ('d1e00000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 'A juniper',
   'd1100000-0000-0000-0000-000000000001', 'd1500000-0000-0000-0000-000000000001');
insert into public.tree_tags (tree_id, tag_id, owner_id) values
  ('d1e00000-0000-0000-0000-000000000001', 'd1a00000-0000-0000-0000-000000000001',
   'd1111111-1111-1111-1111-111111111111');
insert into public.care_log_entries (id, owner_id, tree_id, type) values
  ('d1ca0000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111',
   'd1e00000-0000-0000-0000-000000000001', 'watering');
insert into public.photos (id, owner_id, tree_id, storage_path) values
  ('d1b00000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111',
   'd1e00000-0000-0000-0000-000000000001',
   'd1111111-1111-1111-1111-111111111111/d1e00000-0000-0000-0000-000000000001/x.webp');
insert into public.tasks (id, owner_id, tree_id, type, title, due_on, status) values
  ('d1c00000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111',
   'd1e00000-0000-0000-0000-000000000001', 'watering', 'Water A', '2026-07-01', 'pending');

-- User B: one tree, to prove isolation.
insert into public.trees (id, owner_id, name) values
  ('d2e00000-0000-0000-0000-000000000001', 'd2222222-2222-2222-2222-222222222222', 'B tree');

set local role authenticated;

-- 0. An unauthenticated call (no sub claim) raises rather than deleting anything.
set local request.jwt.claims = '{"role":"authenticated"}';
select throws_ok(
  $$ select public.delete_my_account() $$,
  null, null, 'delete_my_account raises when there is no authenticated user');

-- ---- Act as user A ---------------------------------------------------------
set local request.jwt.claims =
  '{"sub":"d1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$ select public.delete_my_account() $$,
  'A can delete their own account');

reset role;

-- The auth user and every owned row are gone.
select is((select count(*)::int from auth.users
  where id = 'd1111111-1111-1111-1111-111111111111'), 0, 'auth user A is deleted');
select is((select count(*)::int from public.profiles
  where id = 'd1111111-1111-1111-1111-111111111111'), 0, 'profile A cascades away');
select is((select count(*)::int from public.locations
  where owner_id = 'd1111111-1111-1111-1111-111111111111'), 0, 'locations cascade away');
select is((select count(*)::int from public.species
  where owner_id = 'd1111111-1111-1111-1111-111111111111'), 0, 'own species cascade away');
select is((select count(*)::int from public.tags
  where owner_id = 'd1111111-1111-1111-1111-111111111111'), 0, 'tags cascade away');
select is((select count(*)::int from public.trees
  where owner_id = 'd1111111-1111-1111-1111-111111111111'), 0, 'trees cascade away');
select is((select count(*)::int from public.tree_tags
  where owner_id = 'd1111111-1111-1111-1111-111111111111'), 0, 'tree_tags cascade away');
select is((select count(*)::int from public.care_log_entries
  where owner_id = 'd1111111-1111-1111-1111-111111111111'), 0, 'care log cascades away');
select is((select count(*)::int from public.photos
  where owner_id = 'd1111111-1111-1111-1111-111111111111'), 0, 'photos cascade away');
select is((select count(*)::int from public.tasks
  where owner_id = 'd1111111-1111-1111-1111-111111111111'), 0, 'tasks cascade away');

-- User B is completely untouched — only the caller is deleted.
select is((select count(*)::int from auth.users
  where id = 'd2222222-2222-2222-2222-222222222222'), 1, 'auth user B remains');
select is((select count(*)::int from public.trees
  where owner_id = 'd2222222-2222-2222-2222-222222222222'), 1, 'B''s tree remains');

select * from finish();
rollback;
