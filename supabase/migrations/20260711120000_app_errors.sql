-- ============================================================================
-- Error visibility — app_errors table + record/read RPCs (improvement-plan
-- "Error monitoring", interim-until-Sentry).
--
-- Today a friend's crash is invisible: server errors go only to Vercel's
-- function logs (~1h retention) via `logActionError`, and client-side crashes
-- (the `error.tsx` / `global-error.tsx` boundaries) report nothing at all. This
-- gives the owner a durable, PII-poor error log they can read on /admin.
--
-- ADDITIVE to the running app: no existing signature changes, nothing references
-- these objects until the follow-up app-code PR, so the deployed frontend keeps
-- working before and after `supabase db push`.
--
-- Security model (mirrors owner_metrics / delete_my_account):
--   * The table has RLS ON and NO policies, and direct table grants are revoked
--     from anon/authenticated → the API can neither read nor write it directly.
--   * The ONLY write path is `record_client_error`, a SECURITY DEFINER function
--     that stamps `owner_id := auth.uid()` ITSELF (never from a parameter), so a
--     caller can only ever attribute a row to themselves (or to no one, when
--     unauthenticated — a /login crash has no session). Granted to anon too,
--     because unauthenticated crashes must still be recordable; the route
--     handler in the app-code PR validates + rate-limits, and every text input
--     is length-bounded here as well (defence against a hand-crafted call).
--   * The ONLY read path is `recent_app_errors`, gated INSIDE the DB on the
--     `private.app_config` owner singleton (same gate as owner_metrics): the
--     configured owner gets the rows, everyone else gets NULL. An un-seeded
--     config fails CLOSED (NULL), never open.
-- ============================================================================

create table public.app_errors (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  -- Nullable: unauthenticated (/login) crashes have no session. ON DELETE
  -- CASCADE so a user's erasure removes their error rows too.
  owner_id     uuid references auth.users (id) on delete cascade,
  source       text not null check (source in ('client', 'server')),
  -- A stable machine-ish tag ("authCallback.exchange"), never user content.
  context      text check (char_length(context) <= 200),
  message      text check (char_length(message) <= 2000),
  -- Matches Next's `error.digest` so a user report can be correlated to a row.
  digest       text check (char_length(digest) <= 100),
  -- Pathname ONLY — never the query string (keep PII-poor, per log-action-error).
  path         text check (char_length(path) <= 500),
  user_agent   text check (char_length(user_agent) <= 500),
  -- The deploy's commit SHA (Vercel VERCEL_GIT_COMMIT_SHA), to pin which build.
  release      text check (char_length(release) <= 100)
);

-- The owner's read is "most recent first, limited" — index the sort key.
create index app_errors_occurred_at_idx on public.app_errors (occurred_at desc);

-- RLS on, no policies: nothing reaches this table except the definer functions
-- below. Belt-and-suspenders, also revoke the direct table grants Supabase's
-- default privileges hand to anon/authenticated, so a future stray policy still
-- couldn't expose it. service_role keeps its grant (BYPASSRLS) — unused here,
-- but consistent with the platform defaults.
alter table public.app_errors enable row level security;
revoke all on table public.app_errors from anon, authenticated;

-- ----------------------------------------------------------------------------
-- record_client_error: the sole write path. SECURITY DEFINER to insert past the
-- (policy-less) RLS; empty search_path, everything schema-qualified. owner_id is
-- stamped from auth.uid() here, NOT accepted as a parameter. Inputs are
-- re-truncated with left() so a direct RPC call can't overflow the CHECKs.
-- ----------------------------------------------------------------------------
create or replace function public.record_client_error(
  p_source     text,
  p_context    text default null,
  p_message    text default null,
  p_digest     text default null,
  p_path       text default null,
  p_user_agent text default null,
  p_release    text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_source not in ('client', 'server') then
    raise exception 'invalid source: %', p_source using errcode = '22023';
  end if;

  insert into public.app_errors
    (owner_id, source, context, message, digest, path, user_agent, release)
  values (
    (select auth.uid()),
    p_source,
    left(p_context, 200),
    left(p_message, 2000),
    left(p_digest, 100),
    left(p_path, 500),
    left(p_user_agent, 500),
    left(p_release, 100)
  );
end;
$$;

-- Unauthenticated crashes must record too, so anon keeps EXECUTE here (unlike the
-- owner-only RPCs). The function's self-stamping owner_id makes that safe.
revoke execute on function public.record_client_error(text, text, text, text, text, text, text)
  from public;
grant execute on function public.record_client_error(text, text, text, text, text, text, text)
  to anon, authenticated;

-- ----------------------------------------------------------------------------
-- recent_app_errors: the sole read path. Owner-gated exactly like owner_metrics
-- (private.app_config singleton). Returns a jsonb array newest-first to the
-- owner, NULL to anyone else. limit clamped to [1, 500].
-- ----------------------------------------------------------------------------
create or replace function public.recent_app_errors(p_limit int default 100)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) = (select owner_user_id from private.app_config where id)
    then coalesce(
      (
        select jsonb_agg(to_jsonb(e) order by e.occurred_at desc)
        from (
          select id, occurred_at, owner_id, source, context, message, digest,
                 path, user_agent, release
          from public.app_errors
          order by occurred_at desc
          limit least(greatest(coalesce(p_limit, 100), 1), 500)
        ) e
      ),
      '[]'::jsonb
    )
    else null
  end;
$$;

revoke execute on function public.recent_app_errors(int) from anon, public;
grant execute on function public.recent_app_errors(int) to authenticated;
