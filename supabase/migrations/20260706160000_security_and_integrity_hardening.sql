-- ============================================================================
-- Bonsai Companion — security + integrity hardening (improvement plan S08.3)
--
-- Three concerns, all ADDITIVE to the running app (no column renames, no
-- signature changes), so the deployed frontend keeps working before and after
-- `supabase db push`:
--
--   1. SECURITY DEFINER exposure. Supabase's default privileges EXPLICITLY grant
--      EXECUTE to `anon` (and `authenticated`) on every new function, so a plain
--      `revoke ... from public` in the original migrations did NOT stop an
--      unauthenticated caller — the 2026-07-06 hosted advisors confirmed `anon`
--      could still call all three definer functions. We revoke EXECUTE from
--      `anon`/`public` on the app-callable functions (keeping `authenticated`)
--      and from every role on the trigger-only functions (a trigger fires
--      regardless of EXECUTE grants, so nothing needs to call them directly).
--
--   2. owner_metrics is now gated INSIDE the database, not just at the /admin
--      page. It returns the aggregate counts only to the configured owner and
--      NULL to anyone else — defense in depth against another registered user
--      calling the RPC directly. The owner id lives in a `private` schema table
--      the API never sees; the owner seeds it once (see the accompanying guide).
--
--   3. Data-integrity constraints the app already honours but the schema did not
--      enforce: non-blank names, JSON-object shape for `details`/`recurrence`,
--      positive photo dimensions, and OWNER-CONSISTENCY composite FKs so a child
--      row (photo/care entry/task/tree_tag) can never reference a tree or tag
--      owned by a different user — a gap RLS alone leaves open (a user may set
--      owner_id = self while pointing tree_id at someone else's tree).
--
-- The CHECK/FK constraints are added WITHOUT `NOT VALID` (immediate validation)
-- on purpose: a read-only pre-flight against the hosted DB on 2026-07-06 found
-- ZERO existing rows violating any of them (blank names, non-object json,
-- non-positive dims, owner-mismatched children), so validation is guaranteed to
-- pass and the constraints are fully trusted the moment they exist. CI applies
-- this to a fresh (empty) DB, so CI green does NOT prove prod-data validity —
-- the pre-flight does. Re-run that check if this is ever applied to a DB whose
-- rows predate it.
--
-- References: docs/decisions/0008-data-ownership.md, docs/architecture/
-- data-and-privacy.md, PROJECT_EXPORT.md (audit findings), improvement-plan S08.3.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1a. Private config: who is the owner? Lives in a schema the API never exposes
--     (PostgREST only serves `public`), so no role but the definer functions can
--     read it. Singleton by construction: the boolean PK + CHECK allows exactly
--     one row (id = true). The owner seeds it post-push with their auth user id.
-- ----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.app_config (
  id boolean primary key default true,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  constraint app_config_singleton check (id)
);
-- No grants to anon/authenticated: the table is invisible to the API by design.

-- ----------------------------------------------------------------------------
-- 1b. owner_metrics: gate inside the function. Same signature + aggregates as
--     before (so `.rpc('owner_metrics')` is unchanged), but returns the object
--     only when the caller IS the configured owner, else NULL. `auth.uid() = <no
--     row>` evaluates to NULL → the CASE falls through to NULL, so an un-seeded
--     config simply yields NULL rather than leaking. Still SECURITY DEFINER with
--     an empty search_path; every object schema-qualified.
-- ----------------------------------------------------------------------------
create or replace function public.owner_metrics()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) = (select owner_user_id from private.app_config where id)
    then jsonb_build_object(
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
    )
    else null
  end;
$$;

-- ----------------------------------------------------------------------------
-- 1c. Revoke the leftover anon/public EXECUTE. CREATE OR REPLACE above preserved
--     owner_metrics' old ACL (incl. the default anon grant), so the revoke is
--     what actually closes it. Revokes of a not-held privilege are harmless
--     no-ops. `authenticated` keeps EXECUTE on the app-callable functions.
-- ----------------------------------------------------------------------------

-- App-callable (the app calls these with a logged-in user's JWT = `authenticated`):
revoke execute on function public.owner_metrics() from anon, public;
revoke execute on function public.delete_my_account() from anon, public;
revoke execute on function public.complete_task(
  uuid, public.task_status, date, boolean, public.care_event_type, text, date
) from anon, public;
grant execute on function public.owner_metrics() to authenticated;

-- Trigger-only (fire from DML, never called directly — revoke from every role):
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.set_updated_at() from anon, authenticated, public;
revoke execute on function public.skip_pending_tasks_on_tree_archive()
  from anon, authenticated, public;

-- ----------------------------------------------------------------------------
-- 2. Integrity CHECK constraints (the app's Zod layer already enforces these; a
--    direct API/SQL call from a compromised token could not before). Nullable
--    optional fields (profiles.display_name, species.scientific_name) are left
--    unconstrained on purpose — display_name is set by the signup trigger and
--    must never be able to abort a signup.
-- ----------------------------------------------------------------------------
alter table public.trees
  add constraint trees_name_not_blank check (char_length(btrim(name)) > 0);
alter table public.locations
  add constraint locations_name_not_blank check (char_length(btrim(name)) > 0);
alter table public.tags
  add constraint tags_name_not_blank check (char_length(btrim(name)) > 0);
alter table public.species
  add constraint species_common_name_not_blank check (char_length(btrim(common_name)) > 0);
alter table public.tasks
  add constraint tasks_title_not_blank check (char_length(btrim(title)) > 0);

-- `details` defaults to '{}' and is only ever written as a validated object;
-- `recurrence` is null (one-off) or an ADR-0006 object.
alter table public.care_log_entries
  add constraint care_log_entries_details_is_object check (jsonb_typeof(details) = 'object');
alter table public.tasks
  add constraint tasks_recurrence_is_object
  check (recurrence is null or jsonb_typeof(recurrence) = 'object');

-- Photo dimensions come from the browser's measured image size; never <= 0.
alter table public.photos
  add constraint photos_width_positive check (width is null or width > 0);
alter table public.photos
  add constraint photos_height_positive check (height is null or height > 0);

-- ----------------------------------------------------------------------------
-- 3. Owner-consistency composite FKs. RLS proves `owner_id = auth.uid()` on a
--    write but says nothing about whether the referenced tree/tag belongs to the
--    same user — so a caller could set owner_id = self while pointing tree_id at
--    another user's tree. These FKs make the pair valid-or-rejected. They need a
--    UNIQUE target matching the exact column set (the PK is on id alone), hence
--    the (id, owner_id) unique constraints. ON DELETE CASCADE matches the
--    existing single-column tree_id/tag_id FKs, so deleting a tree/tag/account
--    behaves exactly as before (both cascade paths remove the same rows).
--    tasks.tree_id is nullable → MATCH SIMPLE skips the check for collection-wide
--    (tree-less) tasks, which is intended.
-- ----------------------------------------------------------------------------
alter table public.trees add constraint trees_id_owner_key unique (id, owner_id);
alter table public.tags  add constraint tags_id_owner_key  unique (id, owner_id);

alter table public.photos
  add constraint photos_tree_owner_fkey
  foreign key (tree_id, owner_id) references public.trees (id, owner_id) on delete cascade;

alter table public.care_log_entries
  add constraint care_log_entries_tree_owner_fkey
  foreign key (tree_id, owner_id) references public.trees (id, owner_id) on delete cascade;

alter table public.tasks
  add constraint tasks_tree_owner_fkey
  foreign key (tree_id, owner_id) references public.trees (id, owner_id) on delete cascade;

alter table public.tree_tags
  add constraint tree_tags_tree_owner_fkey
  foreign key (tree_id, owner_id) references public.trees (id, owner_id) on delete cascade;
alter table public.tree_tags
  add constraint tree_tags_tag_owner_fkey
  foreign key (tag_id, owner_id) references public.tags (id, owner_id) on delete cascade;
