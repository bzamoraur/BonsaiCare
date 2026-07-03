-- ============================================================================
-- photos + storage isolation test (pgTAP, run by `supabase test db`).
--
-- Proves that photo rows and Storage objects are owner-scoped: a user sees and
-- mutates only their own photos, cannot write a photo/object owned by another
-- user, cover-photo wiring respects tree ownership, and the private bucket +
-- its four owner-scoped storage policies exist. Uses the same offline-safe
-- role/claims simulation as rls_isolation_test.sql (no network needed).
-- ============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Two users (the signup trigger creates their profiles).
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'a-photos@bonsai.test'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'b-photos@bonsai.test');

-- One tree + one photo per user (seeded as superuser; bypasses RLS).
insert into public.trees (id, owner_id, name) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'A tree'),
  ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'B tree');
insert into public.photos (id, owner_id, tree_id, storage_path) values
  ('a0000000-0000-0000-0000-0000000000f1', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111/a0000000-0000-0000-0000-000000000001/a.jpg'),
  ('b0000000-0000-0000-0000-0000000000f1', '22222222-2222-2222-2222-222222222222',
   'b0000000-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222/b0000000-0000-0000-0000-000000000001/b.jpg');

-- ---- Act as user B ---------------------------------------------------------
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*)::int from public.photos), 1, 'B sees only their own photo');
select is_empty(
  $$ select 1 from public.photos where owner_id = '11111111-1111-1111-1111-111111111111' $$,
  'B cannot read A''s photo');
select is_empty(
  $$ update public.photos set caption='hacked'
     where owner_id='11111111-1111-1111-1111-111111111111' returning 1 $$,
  'B cannot update A''s photo');
select is_empty(
  $$ delete from public.photos
     where owner_id='11111111-1111-1111-1111-111111111111' returning 1 $$,
  'B cannot delete A''s photo');
select throws_ok(
  $$ insert into public.photos (owner_id, tree_id, storage_path)
     values ('11111111-1111-1111-1111-111111111111',
             'a0000000-0000-0000-0000-000000000001', 'spoof.jpg') $$,
  '42501', null, 'B cannot insert a photo owned by A');
select lives_ok(
  $$ insert into public.photos (owner_id, tree_id, storage_path)
     values ('22222222-2222-2222-2222-222222222222',
             'b0000000-0000-0000-0000-000000000001',
             '22222222-2222-2222-2222-222222222222/b0000000-0000-0000-0000-000000000001/c.jpg') $$,
  'B can insert their own photo');

-- ---- Act as user A: cover-photo wiring respects tree ownership -------------
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$ update public.trees set cover_photo_id='a0000000-0000-0000-0000-0000000000f1'
     where id='a0000000-0000-0000-0000-000000000001' $$,
  'A can set the cover photo on their own tree');
select is_empty(
  $$ update public.trees set cover_photo_id='a0000000-0000-0000-0000-0000000000f1'
     where id='b0000000-0000-0000-0000-000000000001' returning 1 $$,
  'A cannot set a cover photo on B''s tree');

-- ---- Structural guards -----------------------------------------------------
reset role;
select ok((select relrowsecurity from pg_class where oid = 'public.photos'::regclass),
  'RLS enabled on photos');
select is((select public from storage.buckets where id = 'tree-photos'), false,
  'tree-photos bucket exists and is private');
select is(
  (select count(*)::int from pg_policies
   where schemaname='storage' and tablename='objects' and policyname like 'tree_photos_%'),
  4, 'four owner-scoped storage policies exist for tree-photos');

select * from finish();
rollback;
