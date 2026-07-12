-- ============================================================================
-- First-run onboarding tour — profiles.onboarding_seen_at flag
-- (improvement-plan S12.1, backlog "First-run tutorial / onboarding tour").
--
-- A short, skippable, re-openable-from-Settings guided walkthrough (add a tree →
-- log care → read the timeline) should be shown exactly once per USER — not once
-- per device — so its "seen" state lives on the user's profile row, not in
-- localStorage. This adds a single nullable timestamp: NULL = the tour has not
-- been dismissed yet (show it); a timestamp = when the user skipped or finished.
--
-- Why a plain column and NOT the app_errors lockdown model (RLS-on/no-policies +
-- SECURITY DEFINER RPCs): that model is for an OWNER-ONLY internal table. This is
-- ordinary per-user state the user both reads and writes on their OWN row, which
-- the existing profiles RLS already covers exactly:
--   * profiles_select_own  → the app reads the flag for the signed-in user;
--   * profiles_update_own   → the "mark tour seen" server action writes it.
-- So no new table, policy, grant, or RPC is needed (column privileges are
-- inherited from the table-level grant to `authenticated` in init.sql).
--
-- No DEFAULT on purpose: handle_new_user() inserts only (id, display_name), so a
-- new signup leaves onboarding_seen_at NULL → the tour shows for every new user
-- with no trigger change. The one-time backfill below marks EXISTING users
-- (today, only the owner) as already-seen so the tour does not ambush them.
--
-- ADDITIVE to the running app: no existing signature changes and nothing reads
-- this column until the follow-up app-code PR, so the deployed frontend keeps
-- working before and after `supabase db push`. Conventions match
-- 20260627094143_init.sql (additive ADD COLUMN precedent: 20260703120000).
-- ============================================================================

alter table public.profiles
  add column onboarding_seen_at timestamptz;

comment on column public.profiles.onboarding_seen_at is
  'When the user skipped or finished the first-run onboarding tour. NULL = not yet seen (show it). Set once by the mark-seen server action; a Settings "replay" re-opens the tour client-side without clearing this.';

-- One-time backfill: existing profiles predate the tour, so treat them as already
-- seen (do not re-onboard current users). New signups keep NULL via the trigger.
update public.profiles
  set onboarding_seen_at = now()
  where onboarding_seen_at is null;
