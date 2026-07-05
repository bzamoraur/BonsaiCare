-- ============================================================================
-- Account deletion (Milestone M5 — ADR-0008: data ownership).
--
-- `delete_my_account()` erases the caller's account. Deleting their `auth.users`
-- row cascades every owned row in public.* (all `owner_id` / `profiles.id` FKs
-- are `on delete cascade`), so this one statement removes the entire DB record.
-- Storage objects are NOT foreign-keyed to the user, so the application removes
-- them (RLS-scoped) *before* calling this — see src/server/account.ts.
--
-- Why a SECURITY DEFINER function: the auth roles exposed to the API are "weak"
-- and cannot touch `auth.users`. A definer function created by the migration
-- role can. Safety comes from deriving the target **only** from `auth.uid()`
-- (never a parameter), so a caller can only ever delete themselves; an empty
-- search_path with schema-qualified names; and execute granted to `authenticated`
-- alone. This is the standard Supabase self-deletion pattern.
-- ============================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Cascades to every public.* row owned by this user (see FKs).
  delete from auth.users where id = uid;
end;
$$;

-- Only signed-in users may call it; never anon/public.
revoke execute on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
