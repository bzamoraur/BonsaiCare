-- ============================================================================
-- ADR-0012 calendar-date semantics test (pgTAP, run by `supabase test db`).
-- Covers migration 20260706170000_care_dates_are_calendar_dates.sql:
--   * occurred_on is a `date` (not a timestamp);
--   * it defaults to current_date when omitted;
--   * same-day entries order by created_at desc (newest logged first) — the
--     deterministic tiebreaker the app read path (src/server/care.ts) relies on.
-- ============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'a-dates@bonsai.test');
insert into public.trees (id, owner_id, name) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'A tree');

-- 1. Structural: the column is a calendar date, not a timestamp.
select col_type_is('public'::name, 'care_log_entries'::name, 'occurred_on'::name, 'date',
  'occurred_on is a calendar date');

-- 2. Default is current_date (behavioural — insert without occurred_on).
insert into public.care_log_entries (owner_id, tree_id, type)
values ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'note');
select is(
  (select occurred_on from public.care_log_entries
     where tree_id = 'a0000000-0000-0000-0000-000000000001' and type = 'note'),
  current_date, 'occurred_on defaults to current_date');

-- 3. Same-day entries sort newest-logged first (created_at desc tiebreaker).
--    Scoped to these two ids: the assertion-2 note row defaults occurred_on to
--    *today*, which would otherwise intrude when CI happens to run on the seeded
--    date. Fixed past date + id filter make this deterministic on any day.
insert into public.care_log_entries (id, owner_id, tree_id, type, occurred_on, created_at) values
  ('c0000000-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'watering', '2026-03-15', '2026-03-15 08:00:00+00'),
  ('c0000000-0000-0000-0000-0000000000a2', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 'pruning', '2026-03-15', '2026-03-15 09:00:00+00');
select is(
  (select id from public.care_log_entries
     where id in ('c0000000-0000-0000-0000-0000000000a1',
                  'c0000000-0000-0000-0000-0000000000a2')
     order by occurred_on desc, created_at desc limit 1),
  'c0000000-0000-0000-0000-0000000000a2'::uuid,
  'same-day care entries sort newest-logged first (created_at desc tiebreaker)');

-- 4. The read index itself carries the tiebreaker the app read path relies on —
--    a non-circular guard (assertion 3 supplies its own ORDER BY). Uses the SQL
--    LIKE operator inside ok(); pgTAP has no like() matcher function here.
select ok(
  pg_get_indexdef('public.care_log_entries_tree_occurred_idx'::regclass)
    like '%occurred_on DESC, created_at DESC%',
  'read index carries the occurred_on + created_at desc tiebreaker');

select * from finish();
rollback;
