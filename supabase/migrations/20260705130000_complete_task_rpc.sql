-- ============================================================================
-- Bonsai Companion — atomic task completion / skip (Milestone M4)
--
-- Resolving a task must be all-or-nothing: mark it done/skipped, optionally log a
-- linked care event, and (if recurring) spawn the next occurrence — in ONE
-- transaction, so a mid-flight failure can never leave a completed task without
-- its successor, or a duplicate entry (ADR-0006, domain-model completion flow).
--
-- The season-aware next due date is computed by the verified TS domain
-- (computeNextDueOn) and passed in as p_next_due_on — the recurrence/season math
-- lives in exactly one place, never re-implemented in plpgsql. This function only
-- performs the writes.
--
-- SECURITY INVOKER + empty search_path: runs as the caller so RLS still applies
-- (it can only ever touch the caller's own rows); every object schema-qualified.
-- The status='pending' guard makes it idempotent — a double-submit raises instead
-- of spawning a second successor.
-- ============================================================================

create or replace function public.complete_task(
  p_task_id uuid,
  p_outcome public.task_status,             -- 'done' or 'skipped' (never 'pending')
  p_completed_on date,                      -- day it was resolved (care entry occurred_at)
  p_log_event boolean default false,        -- also log a care event? (done only)
  p_care_type public.care_event_type default null,
  p_care_notes text default null,
  p_next_due_on date default null           -- precomputed next occurrence; null = none
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
    insert into public.care_log_entries (owner_id, tree_id, type, occurred_at, task_id, notes)
    values (v_task.owner_id, v_task.tree_id, p_care_type, p_completed_on, p_task_id, p_care_notes)
    returning id into v_care_id;
  end if;

  -- 3. Next occurrence — recurring tasks only, and only when a next date was given.
  --    Both done and skip keep the series alive (you skipped this one, not the plan).
  if p_next_due_on is not null and v_task.recurrence is not null then
    insert into public.tasks (owner_id, tree_id, type, title, due_on, status, recurrence, notes)
    values (v_task.owner_id, v_task.tree_id, v_task.type, v_task.title,
            p_next_due_on, 'pending', v_task.recurrence, v_task.notes)
    returning id into v_next_id;
  end if;

  return jsonb_build_object('next_task_id', v_next_id, 'care_entry_id', v_care_id);
end;
$$;

grant execute on function public.complete_task(
  uuid, public.task_status, date, boolean, public.care_event_type, text, date
) to authenticated;
