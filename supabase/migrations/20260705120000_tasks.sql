-- ============================================================================
-- Bonsai Companion — tasks / care plan (Milestone M4)
--
-- The "future" half of the domain model (docs/architecture/domain-model.md):
-- one row per intended action, with a small, editable recurrence rule
-- (ADR-0006). Completing a task optionally spawns a care_log_entry (linked via
-- task_id) and, if recurring, the next occurrence — the atomic RPC lands in the
-- next slice. Overdue is DERIVED (pending AND due_on < today), never stored.
--
-- Conventions match 20260627094143_init.sql: per-command owner policies,
-- (select auth.uid()), `to authenticated`, explicit grants, the shared
-- set_updated_at() trigger, and every policy-referenced column indexed.
-- ============================================================================

-- Task types mirror the care-log types where one exists, plus actions that are
-- NOT care events: `inspection` (e.g. check wiring), `photo`, and `custom`
-- ("order akadama"). Kept a separate enum from care_event_type on purpose.
create type public.task_type as enum (
  'watering',
  'fertilizing',
  'pruning',
  'repotting',
  'wiring',
  'inspection',
  'photo',
  'custom'
);

create type public.task_status as enum ('pending', 'done', 'skipped');

-- ----------------------------------------------------------------------------
-- tasks — one row per intended action. tree_id null = a collection-wide task.
-- recurrence null = one-off; else the ADR-0006 shape
-- { interval_days, anchor, season_start_month?, season_end_month? }, validated
-- by Zod at the app boundary (ADR-0011) — Postgres stores it opaquely.
-- ----------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  tree_id uuid references public.trees (id) on delete cascade, -- null = collection-wide
  type public.task_type not null,
  title text not null,
  due_on date not null,
  status public.task_status not null default 'pending',
  recurrence jsonb, -- null = one-off
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- The dashboard scans "my pending tasks by due date"; the leading owner_id column
-- also serves plain owner lookups, so no separate owner_id index is needed.
create index tasks_owner_status_due_idx on public.tasks (owner_id, status, due_on);
create index tasks_tree_id_idx on public.tasks (tree_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Now that tasks exists, wire the FK reserved on care_log_entries.task_id in the
-- care-log migration. A deleted task keeps its history: the link nulls, the
-- care entry stays.
alter table public.care_log_entries
  add constraint care_log_entries_task_id_fkey
  foreign key (task_id) references public.tasks (id) on delete set null;
create index care_log_entries_task_id_idx on public.care_log_entries (task_id);

-- ----------------------------------------------------------------------------
-- Archiving a tree cancels its still-pending tasks (domain model: archived-tree
-- tasks auto-skip). A plain (security invoker) trigger so RLS still applies — it
-- can only touch the archiving owner's own tasks. Fires only when archived_at
-- flips from null → set, so un-archiving or other updates are no-ops. Already
-- done/skipped tasks are left untouched.
-- ----------------------------------------------------------------------------
create or replace function public.skip_pending_tasks_on_tree_archive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    update public.tasks
      set status = 'skipped'
      where tree_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger trees_skip_pending_tasks_on_archive
  after update of archived_at on public.trees
  for each row execute function public.skip_pending_tasks_on_tree_archive();

-- ============================================================================
-- Grants + RLS (same per-command owner model as every other user table).
-- ============================================================================
grant select, insert, update, delete on public.tasks to authenticated;

alter table public.tasks enable row level security;
create policy "tasks_select_own" on public.tasks
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "tasks_insert_own" on public.tasks
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "tasks_update_own" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "tasks_delete_own" on public.tasks
  for delete to authenticated using ((select auth.uid()) = owner_id);
