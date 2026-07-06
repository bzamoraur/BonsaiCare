-- ============================================================================
-- ADR-0012 — care events are calendar dates, not instants.
--
-- care_log_entries.occurred_at was a timestamptz, but the app only ever captures
-- an <input type="date"> (stored as midnight UTC) or fell back to now(). That mix
-- meant same-day entries tied at 00:00:00Z (nondeterministic order) and risked
-- rendering one day early for UTC-negative viewers if ever rendered client-side.
--
-- This renames it to `occurred_on date` (default current_date) and makes same-day
-- ordering deterministic as `created_at desc` (newest logged first) — baked into
-- the read index here and the app read path (src/server/care.ts + timeline merge).
--
-- Ships in its own PR because the app code + hand-updated types must deploy
-- together with the rename; needs one `supabase db push` coordinated with the
-- deploy. References: docs/decisions/0012-care-dates-are-calendar-dates.md.
-- ============================================================================

-- Drop the old read index first so the type change doesn't auto-rebuild it.
drop index if exists public.care_log_entries_tree_occurred_idx;

-- Convert timestamptz -> date, preserving the calendar day. Drop the timestamptz
-- default before the type change so it doesn't have to cast now() mid-flight.
-- Truncate in UTC, not the push session's timezone: backdated rows were stored at
-- midnight UTC, so a plain ::date under a non-UTC session could shift them a day.
-- This one-way cast must be timezone-pinned to stay correct.
alter table public.care_log_entries alter column occurred_at drop default;
alter table public.care_log_entries
  alter column occurred_at type date using (occurred_at at time zone 'UTC')::date;
alter table public.care_log_entries rename column occurred_at to occurred_on;
alter table public.care_log_entries alter column occurred_on set default current_date;

-- Reindex for the renamed column + the created_at tiebreaker used on every read.
create index care_log_entries_tree_occurred_idx
  on public.care_log_entries (tree_id, occurred_on desc, created_at desc);

-- complete_task inserted the (date) p_completed_on into the old occurred_at; point
-- it at occurred_on. Body is otherwise unchanged from 20260705130000; CREATE OR
-- REPLACE preserves the existing ACL (incl. the S08.3 anon revoke) and signature.
create or replace function public.complete_task(
  p_task_id uuid,
  p_outcome public.task_status,
  p_completed_on date,
  p_log_event boolean default false,
  p_care_type public.care_event_type default null,
  p_care_notes text default null,
  p_next_due_on date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_task public.tasks;
  v_next_id uuid;
  v_care_id uuid;
begin
  if p_outcome not in ('done', 'skipped') then
    raise exception 'Outcome must be done or skipped, got %', p_outcome;
  end if;

  -- Lock the row; RLS ensures we can only see/lock our own task.
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'Task not found';
  end if;
  if v_task.status <> 'pending' then
    raise exception 'Task is not pending';  -- idempotency guard: no duplicate successors
  end if;

  -- 1. Resolve the task. completed_at records the moment of a completion only.
  update public.tasks
    set status = p_outcome,
        completed_at = case when p_outcome = 'done' then now() else completed_at end
    where id = p_task_id;

  -- 2. Optional linked care event (completions of a tree-scoped task only).
  if p_outcome = 'done'
     and p_log_event
     and p_care_type is not null
     and v_task.tree_id is not null then
    insert into public.care_log_entries (owner_id, tree_id, type, occurred_on, task_id, notes)
    values (v_task.owner_id, v_task.tree_id, p_care_type, p_completed_on, p_task_id, p_care_notes)
    returning id into v_care_id;
  end if;

  -- 3. Next occurrence — recurring tasks only, and only when a next date was given.
  if p_next_due_on is not null and v_task.recurrence is not null then
    insert into public.tasks (owner_id, tree_id, type, title, due_on, status, recurrence, notes)
    values (v_task.owner_id, v_task.tree_id, v_task.type, v_task.title,
            p_next_due_on, 'pending', v_task.recurrence, v_task.notes)
    returning id into v_next_id;
  end if;

  return jsonb_build_object('next_task_id', v_next_id, 'care_entry_id', v_care_id);
end;
$$;
