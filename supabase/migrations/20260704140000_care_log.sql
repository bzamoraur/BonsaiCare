-- ============================================================================
-- Bonsai Companion — care log / unified timeline (Milestone M3)
--
-- One `care_log_entries` table with a `type` discriminator + typed core columns
-- and a validated `details` JSONB per type (ADR-0005). The same table powers a
-- tree's timeline (merged with photos by date). Also wires `photos.care_log_entry_id`
-- so a photo can attach to an event (deferred here from the M2 photos migration).
--
-- Conventions match 20260627094143_init.sql: per-command owner policies,
-- `(select auth.uid())`, `to authenticated`, explicit grants, indexed owner_id,
-- and the shared set_updated_at() trigger.
-- ============================================================================

create type public.care_event_type as enum (
  'watering',
  'fertilizing',
  'pruning',
  'wiring',
  'repotting',
  'pest_treatment',
  'styling',
  'defoliation',
  'observation',
  'note'
);

-- ----------------------------------------------------------------------------
-- care_log_entries — one row per thing that happened to a tree.
-- `task_id` is reserved for M4 (tasks); no FK yet since that table doesn't exist.
-- ----------------------------------------------------------------------------
create table public.care_log_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  tree_id uuid not null references public.trees (id) on delete cascade,
  type public.care_event_type not null,
  occurred_at timestamptz not null default now(),
  title text,
  notes text,
  details jsonb not null default '{}'::jsonb,
  task_id uuid, -- FK to tasks added in M4
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index care_log_entries_owner_id_idx on public.care_log_entries (owner_id);
create index care_log_entries_tree_occurred_idx
  on public.care_log_entries (tree_id, occurred_at desc);

create trigger care_log_entries_set_updated_at
  before update on public.care_log_entries
  for each row execute function public.set_updated_at();

-- The optional event a photo documents (e.g. an after-repot shot). Deleting the
-- event nulls the link; the photo itself remains.
alter table public.photos
  add column care_log_entry_id uuid references public.care_log_entries (id) on delete set null;
create index photos_care_log_entry_id_idx on public.photos (care_log_entry_id);

-- ============================================================================
-- Grants + RLS (same per-command owner model as every other user table).
-- ============================================================================
grant select, insert, update, delete on public.care_log_entries to authenticated;

alter table public.care_log_entries enable row level security;
create policy "care_log_entries_select_own" on public.care_log_entries
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "care_log_entries_insert_own" on public.care_log_entries
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "care_log_entries_update_own" on public.care_log_entries
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "care_log_entries_delete_own" on public.care_log_entries
  for delete to authenticated using ((select auth.uid()) = owner_id);
