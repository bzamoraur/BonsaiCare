-- ============================================================================
-- Owner metrics (Milestone M5 / friends-release readiness).
--
-- `owner_metrics()` returns AGGREGATE, non-PII counts across all users so the
-- owner can see reach + engagement (how many registered, how many active, how
-- much care is being logged) to steer development. It deliberately exposes no
-- per-user identity or data — just totals.
--
-- SECURITY DEFINER so it can count across RLS-scoped tables + auth.users (a
-- normal client only sees its own rows). Access is gated at the app layer: the
-- /admin page renders only for the OWNER_USER_ID env value. The function returns
-- only anonymous aggregates, so even a direct call by another authenticated user
-- leaks nothing sensitive. Empty search_path; schema-qualified throughout.
-- ============================================================================

create or replace function public.owner_metrics()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'generated_at', now(),
    'total_users', (select count(*) from auth.users),
    'signups_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'signups_30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'active_users_7d', (
      select count(distinct owner_id) from public.care_log_entries
      where created_at > now() - interval '7 days'
    ),
    'active_users_30d', (
      select count(distinct owner_id) from public.care_log_entries
      where created_at > now() - interval '30 days'
    ),
    'total_trees', (select count(*) from public.trees),
    'total_care_logs', (select count(*) from public.care_log_entries),
    'total_tasks', (select count(*) from public.tasks)
  );
$$;

revoke execute on function public.owner_metrics() from public;
grant execute on function public.owner_metrics() to authenticated;
