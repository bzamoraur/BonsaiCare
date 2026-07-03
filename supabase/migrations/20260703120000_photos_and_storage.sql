-- ============================================================================
-- Bonsai Companion — photos + private storage (Milestone M2)
--
-- Adds the `photos` table (every photo belongs to a tree), wires
-- `trees.cover_photo_id`, and provisions the private `tree-photos` Storage
-- bucket with owner-scoped RLS (each object's path is prefixed by the owner's
-- user id, so a user can only touch objects under their own prefix).
--
-- References: docs/architecture/domain-model.md (photo entity + integrity notes),
-- docs/architecture/data-and-privacy.md (storage isolation via signed URLs).
-- Conventions match 20260627094143_init.sql: per-command owner policies,
-- `(select auth.uid())`, `to authenticated`, explicit grants, indexed owner_id.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- photos — one row per uploaded image, always owned and tied to a tree.
-- (care_log_entry_id is deferred to M3, added with the care_log_entries table.)
-- ----------------------------------------------------------------------------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  tree_id uuid not null references public.trees (id) on delete cascade,
  storage_path text not null,
  taken_at timestamptz not null default now(),
  caption text,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);
create index photos_owner_id_idx on public.photos (owner_id);
create index photos_tree_id_idx on public.photos (tree_id);

-- The hero image for a tree's profile/grid card. Deleting a cover photo nulls
-- the reference (domain-model integrity note). The "cover belongs to this tree"
-- invariant is enforced in application logic, not the FK (per the domain model).
alter table public.trees
  add column cover_photo_id uuid references public.photos (id) on delete set null;
create index trees_cover_photo_id_idx on public.trees (cover_photo_id);

-- ============================================================================
-- Grants + RLS for photos (same per-command owner model as every other table).
-- ============================================================================
grant select, insert, update, delete on public.photos to authenticated;

alter table public.photos enable row level security;
create policy "photos_select_own" on public.photos
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "photos_insert_own" on public.photos
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "photos_update_own" on public.photos
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "photos_delete_own" on public.photos
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- ============================================================================
-- Private Storage bucket for photo objects.
-- Layout: `<owner_id>/<tree_id>/<file>` — the first path segment is the owner's
-- user id. RLS below enforces that a user can only read/write objects under
-- their own id prefix. The bucket is PRIVATE; the app serves images via
-- short-lived signed URLs. (RLS is already enabled on storage.objects by
-- Supabase; we only add bucket-scoped policies.)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('tree-photos', 'tree-photos', false)
on conflict (id) do nothing;

create policy "tree_photos_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tree-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "tree_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tree-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "tree_photos_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'tree-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'tree-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "tree_photos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'tree-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
