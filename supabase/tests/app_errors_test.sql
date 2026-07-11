-- ============================================================================
-- app_errors test (pgTAP, run by `supabase test db`).
-- Covers migration 20260711120000_app_errors.sql:
--
--   * record_client_error is the only write path — it stamps owner_id from
--     auth.uid() (not a parameter), records unauthenticated crashes with a NULL
--     owner, and rejects an invalid source;
--   * the table is unreadable directly by anon/authenticated (grants revoked);
--   * recent_app_errors returns the rows to the configured owner, NULL to any
--     other authenticated user, and cannot be executed by anon at all.
--
-- Offline-safe role/claims simulation, same as the other tests.
-- ============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Two users; user 1 is the configured owner, user 2 is a bystander.
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'e1111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'owner-err@bonsai.test'),
  ('00000000-0000-0000-0000-000000000000', 'e2222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'other-err@bonsai.test');
insert into private.app_config (owner_user_id)
values ('e1111111-1111-1111-1111-111111111111');

-- ---- As an authenticated user: record one server error, and prove the write
--      path validates + the table is not directly readable --------------------
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"e1111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ select public.record_client_error('server', 'authCallback.exchange',
       'boom', 'abc123', '/collection', 'UA/1.0', 'sha1') $$,
  'an authenticated user can record a server error');

select throws_ok(
  $$ select public.record_client_error('bogus') $$,
  '22023', null, 'an invalid source is rejected');

select throws_ok($$ select 1 from public.app_errors $$, '42501', null,
  'an authenticated user cannot read the errors table directly');

-- ---- As anon: an unauthenticated crash still records (NULL owner), and anon
--      can neither read the table nor call the owner read RPC -----------------
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select lives_ok(
  $$ select public.record_client_error('client', 'global-error', 'white screen') $$,
  'an unauthenticated crash can be recorded');

select throws_ok($$ select 1 from public.app_errors $$, '42501', null,
  'anon cannot read the errors table directly');

select throws_ok($$ select public.recent_app_errors() $$, '42501', null,
  'anon cannot execute the owner read RPC');

-- ---- As superuser: confirm what actually landed ----------------------------
reset role;
select is((select count(*)::int from public.app_errors), 2,
  'both errors were recorded');
select is(
  (select owner_id from public.app_errors where source = 'server'),
  'e1111111-1111-1111-1111-111111111111'::uuid,
  'the server error is attributed to the caller via auth.uid(), not a parameter');
select is(
  (select count(*)::int from public.app_errors where source = 'client' and owner_id is null),
  1, 'the unauthenticated client crash has a NULL owner');

-- ---- The owner reads the log; a non-owner gets NULL ------------------------
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"e1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is(jsonb_array_length(public.recent_app_errors()), 2,
  'the configured owner sees every recorded error, newest-first');

set local request.jwt.claims =
  '{"sub":"e2222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is(public.recent_app_errors(), null::jsonb,
  'a non-owner authenticated user gets NULL, not the error log');

reset role;
select * from finish();
rollback;
