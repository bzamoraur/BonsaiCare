-- ============================================================================
-- Bonsai Companion — initial schema (Milestone M1 / PR2)
--
-- Tables: profiles, species, locations, trees, tags, tree_tags
-- Every user-owned table has RLS enabled with per-command owner policies.
-- References: docs/architecture/domain-model.md, docs/architecture/data-and-privacy.md,
-- docs/decisions/0002-backend-supabase.md.
--
-- RLS conventions (verified against current Supabase guidance):
--  * one policy per command (select/insert/update/delete), never `for all`;
--  * always scope `to authenticated`;
--  * wrap auth.uid() as `(select auth.uid())` so the optimizer caches it per-statement;
--  * index every column referenced by a policy (owner_id);
--  * 2026 Supabase does NOT auto-expose new tables to the API roles, so we GRANT
--    table privileges to `authenticated` explicitly (RLS still filters rows).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enum types
-- ----------------------------------------------------------------------------
create type public.hemisphere as enum ('northern', 'southern');
create type public.units as enum ('metric', 'imperial');
create type public.species_type as enum (
  'conifer', 'deciduous', 'broadleaf_evergreen', 'tropical', 'other'
);
create type public.development_stage as enum (
  'raw_material', 'development', 'refinement', 'maintenance'
);
create type public.tree_origin as enum (
  'nursery_stock', 'pre_bonsai', 'yamadori', 'seed', 'cutting', 'gift', 'other'
);
create type public.health_status as enum (
  'thriving', 'healthy', 'struggling', 'critical', 'dormant'
);

-- ----------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh on UPDATE
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles (1:1 with auth.users) — created on signup by a trigger (below)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  hemisphere public.hemisphere not null default 'northern',
  climate_zone text,
  units public.units not null default 'metric',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- species — global seeded rows (owner_id is null) + user-defined rows
-- ----------------------------------------------------------------------------
create table public.species (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade, -- null = global/seeded
  scientific_name text,
  common_name text not null,
  type public.species_type,
  default_care jsonb, -- reserved for future care guidance; null in MVP
  created_at timestamptz not null default now()
);
create index species_owner_id_idx on public.species (owner_id);
-- Prevent duplicate global species by scientific name (allows idempotent seeding).
create unique index species_global_scientific_name_key
  on public.species (scientific_name)
  where owner_id is null and scientific_name is not null;

-- ----------------------------------------------------------------------------
-- locations — where a tree physically lives
-- ----------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);
create index locations_owner_id_idx on public.locations (owner_id);

-- ----------------------------------------------------------------------------
-- trees — the central aggregate
-- (cover_photo_id is added in M2 alongside the photos table)
-- ----------------------------------------------------------------------------
create table public.trees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  species_id uuid references public.species (id) on delete set null,
  species_label text,
  development_stage public.development_stage,
  origin public.tree_origin,
  style text,
  location_id uuid references public.locations (id) on delete set null,
  current_pot text,
  current_substrate text,
  acquired_on date,
  acquired_from text,
  health_status public.health_status,
  notes text,
  archived_at timestamptz, -- soft archive: sold / died / gifted
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trees_owner_id_idx on public.trees (owner_id);
create index trees_owner_active_idx on public.trees (owner_id) where archived_at is null;
create index trees_species_id_idx on public.trees (species_id);
create index trees_location_id_idx on public.trees (location_id);

create trigger trees_set_updated_at
  before update on public.trees
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- tags + tree_tags (many-to-many). tree_tags carries owner_id (denormalized)
-- so its RLS policy is a simple owner check instead of a join.
-- ----------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);
create index tags_owner_id_idx on public.tags (owner_id);

create table public.tree_tags (
  tree_id uuid not null references public.trees (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  primary key (tree_id, tag_id)
);
create index tree_tags_owner_id_idx on public.tree_tags (owner_id);
create index tree_tags_tag_id_idx on public.tree_tags (tag_id);

-- ----------------------------------------------------------------------------
-- handle_new_user — create a profile row whenever an auth user is created.
-- SECURITY DEFINER (runs as owner) with an EMPTY search_path; every object is
-- schema-qualified. An exception here would block signups, so keep it minimal.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing; -- never let a duplicate profile abort a signup
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Grants — 2026 Supabase does not auto-expose new tables, so grant explicitly.
-- RLS policies below are what actually restrict the rows each user can touch.
-- ============================================================================
grant usage on schema public to authenticated; -- explicit; keeps the migration self-contained
grant select, insert, update, delete on
  public.profiles,
  public.species,
  public.locations,
  public.trees,
  public.tags,
  public.tree_tags
to authenticated;

-- ============================================================================
-- Row-Level Security
-- ============================================================================

-- profiles: read + update your own. Insert is done by the signup trigger
-- (SECURITY DEFINER bypasses RLS); there is intentionally no user insert/delete.
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- species: everyone (authenticated) can read global rows (owner_id is null) or
-- their own; they can only write their own rows.
alter table public.species enable row level security;
create policy "species_select_global_or_own" on public.species
  for select to authenticated
  using (owner_id is null or (select auth.uid()) = owner_id);
create policy "species_insert_own" on public.species
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "species_update_own" on public.species
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "species_delete_own" on public.species
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- locations: owner-scoped on every command.
alter table public.locations enable row level security;
create policy "locations_select_own" on public.locations
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "locations_insert_own" on public.locations
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "locations_update_own" on public.locations
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "locations_delete_own" on public.locations
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- trees: owner-scoped on every command.
alter table public.trees enable row level security;
create policy "trees_select_own" on public.trees
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "trees_insert_own" on public.trees
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "trees_update_own" on public.trees
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "trees_delete_own" on public.trees
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- tags: owner-scoped on every command.
alter table public.tags enable row level security;
create policy "tags_select_own" on public.tags
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "tags_insert_own" on public.tags
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "tags_update_own" on public.tags
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "tags_delete_own" on public.tags
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- tree_tags: owner-scoped on every command.
alter table public.tree_tags enable row level security;
create policy "tree_tags_select_own" on public.tree_tags
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "tree_tags_insert_own" on public.tree_tags
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "tree_tags_update_own" on public.tree_tags
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "tree_tags_delete_own" on public.tree_tags
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- ============================================================================
-- Seed: a small set of common bonsai species (global; owner_id is null).
-- Idempotent via the partial unique index on scientific_name.
-- A larger species-care database is explicitly out of MVP scope.
-- ============================================================================
insert into public.species (scientific_name, common_name, type) values
  ('Juniperus chinensis',   'Chinese juniper',          'conifer'),
  ('Juniperus procumbens',  'Japanese garden juniper',  'conifer'),
  ('Pinus thunbergii',      'Japanese black pine',      'conifer'),
  ('Pinus parviflora',      'Japanese white pine',      'conifer'),
  ('Picea jezoensis',       'Ezo spruce',               'conifer'),
  ('Acer palmatum',         'Japanese maple',           'deciduous'),
  ('Acer buergerianum',     'Trident maple',            'deciduous'),
  ('Ulmus parvifolia',      'Chinese elm',              'deciduous'),
  ('Zelkova serrata',       'Japanese zelkova',         'deciduous'),
  ('Carpinus betulus',      'Hornbeam',                 'deciduous'),
  ('Prunus mume',           'Japanese apricot',         'deciduous'),
  ('Ficus retusa',          'Ficus',                    'tropical'),
  ('Carmona retusa',        'Fukien tea',               'tropical'),
  ('Olea europaea',         'Olive',                    'broadleaf_evergreen'),
  ('Buxus sempervirens',    'Boxwood',                  'broadleaf_evergreen')
on conflict do nothing;
