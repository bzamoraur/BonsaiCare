import { cache } from "react";

import type { TreeFormInput } from "@/domain/tree-form";
import { logActionError } from "@/lib/log-action-error";
import { createClient } from "@/lib/supabase/server";
import { thumbPath } from "@/lib/thumb-path";
import type { Enums, Tables } from "@/types/database.types";

/**
 * Server-side data access for trees. Every query runs through the request-scoped
 * Supabase client, so RLS restricts rows to the signed-in owner; the explicit
 * `owner_id` on insert matches the RLS `with check` and keeps intent obvious.
 *
 * This module imports `next/headers` (via the server client), so it can only be
 * used from Server Components, Route Handlers, and Server Actions.
 */

export type Tree = Tables<"trees">;

export type TreeCard = Pick<
  Tree,
  "id" | "name" | "species_label" | "development_stage" | "health_status"
> & { coverUrl: string | null; coverThumbUrl: string | null };

const TREE_CARD_COLUMNS =
  "id, name, species_label, development_stage, health_status, cover_photo_id";
const COVER_URL_TTL_SECONDS = 60 * 60; // 1 hour

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Resolves cover-photo ids → signed URLs in two batched, Storage-friendly queries
 * (ids → paths, then a single `createSignedUrls`). Returns a map keyed by
 * `cover_photo_id`; ids with no row or a failed sign are simply absent. Shared by
 * the collection grid and the dashboard triage strip so both keep the batching
 * discipline (no per-card signing).
 */
async function coverUrlMap(
  supabase: ServerClient,
  coverIds: (string | null)[],
): Promise<Map<string, { full: string; thumb: string | null }>> {
  const ids = coverIds.filter((v): v is string => Boolean(v));
  if (ids.length === 0) return new Map();

  // Cover art is decorative, so a failed lookup/sign degrades to "no image" —
  // but it must never degrade silently (a Storage outage looked like nothing).
  const { data: covers, error: coversError } = await supabase
    .from("photos")
    .select("id, storage_path")
    .in("id", ids);
  if (coversError) logActionError("coverUrlMap.photos", coversError);
  const pathById = new Map((covers ?? []).map((c) => [c.id, c.storage_path]));
  const paths = [...pathById.values()];
  if (paths.length === 0) return new Map();

  const signUrls = async (list: string[], label: string) => {
    const { data, error } = await supabase.storage
      .from("tree-photos")
      .createSignedUrls(list, COVER_URL_TTL_SECONDS);
    if (error) logActionError(label, error);
    return new Map(
      (data ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])),
    );
  };
  // Full covers are authoritative; thumbs (S10.1) are a separate best-effort batch
  // so a missing/failed thumb never blanks the grid — cards fall back to the full.
  const [fullUrls, thumbUrls] = await Promise.all([
    signUrls(paths, "coverUrlMap.sign"),
    signUrls(paths.map(thumbPath), "coverUrlMap.signThumb"),
  ]);

  const result = new Map<string, { full: string; thumb: string | null }>();
  for (const [id, path] of pathById) {
    const full = fullUrls.get(path);
    if (full) result.set(id, { full, thumb: thumbUrls.get(thumbPath(path)) ?? null });
  }
  return result;
}

export type TreeSort = "newest" | "oldest" | "name";
export type TreeFilters = {
  q?: string;
  locationId?: string;
  tagId?: string;
  stage?: Enums<"development_stage">;
  health?: Enums<"health_status">;
  sort?: TreeSort;
  /** When true, list the *archived* trees instead of the active ones. */
  archived?: boolean;
};

/** Strips characters that are special in a PostgREST `.or()` filter (and ilike
 * wildcards), leaving a safe "contains" search term. */
function sanitizeSearch(q: string): string {
  return q
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .slice(0, 60);
}

/**
 * Non-archived trees for the current user, filtered/sorted, each with a signed
 * cover-photo URL (batched into one Storage call). All inputs are owner-scoped by
 * RLS; enum filters are validated by the caller before reaching Postgres.
 */
export async function listTrees(filters: TreeFilters = {}): Promise<TreeCard[]> {
  const supabase = await createClient();

  // Tag filter → the set of tree ids carrying that tag (empty ⇒ no matches).
  let tagTreeIds: string[] | null = null;
  if (filters.tagId) {
    const { data: rels, error: relError } = await supabase
      .from("tree_tags")
      .select("tree_id")
      .eq("tag_id", filters.tagId);
    if (relError) throw new Error(`Failed to filter by tag: ${relError.message}`);
    tagTreeIds = (rels ?? []).map((r) => r.tree_id);
    if (tagTreeIds.length === 0) return [];
  }

  let query = supabase.from("trees").select(TREE_CARD_COLUMNS);
  query = filters.archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);

  if (filters.locationId) query = query.eq("location_id", filters.locationId);
  if (filters.stage) query = query.eq("development_stage", filters.stage);
  if (filters.health) query = query.eq("health_status", filters.health);
  if (tagTreeIds) query = query.in("id", tagTreeIds);

  const term = filters.q ? sanitizeSearch(filters.q) : "";
  if (term) query = query.or(`name.ilike.%${term}%,species_label.ilike.%${term}%`);

  const sort = filters.sort ?? "newest";
  query =
    sort === "name"
      ? query.order("name", { ascending: true })
      : query.order("created_at", { ascending: sort === "oldest" });

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load trees: ${error.message}`);
  const rows = data ?? [];

  const urlByCoverId = await coverUrlMap(
    supabase,
    rows.map((r) => r.cover_photo_id),
  );
  return rows.map(({ cover_photo_id, ...card }) => {
    const cover = cover_photo_id ? urlByCoverId.get(cover_photo_id) : undefined;
    return { ...card, coverUrl: cover?.full ?? null, coverThumbUrl: cover?.thumb ?? null };
  });
}

/**
 * Non-archived trees needing attention (health `struggling` or `critical`), for
 * the Today dashboard's triage strip — each with a signed cover URL. Ordered
 * critical-first (descending the health enum, whose order runs …struggling,
 * critical, dormant).
 */
export async function listTriageTrees(): Promise<TreeCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trees")
    .select(TREE_CARD_COLUMNS)
    .is("archived_at", null)
    .in("health_status", ["struggling", "critical"])
    .order("health_status", { ascending: false });
  if (error) throw new Error(`Failed to load trees needing attention: ${error.message}`);
  const rows = data ?? [];

  const urlByCoverId = await coverUrlMap(
    supabase,
    rows.map((r) => r.cover_photo_id),
  );
  return rows.map(({ cover_photo_id, ...card }) => {
    const cover = cover_photo_id ? urlByCoverId.get(cover_photo_id) : undefined;
    return { ...card, coverUrl: cover?.full ?? null, coverThumbUrl: cover?.thumb ?? null };
  });
}

export type QuickAddTree = Pick<Tree, "id" | "name">;

/**
 * Minimal non-archived tree list (id + name, name-sorted) for the global quick-add
 * sheet — no cover signing, so it's a single cheap indexed read. Owner-scoped by RLS.
 */
export async function listQuickAddTrees(): Promise<QuickAddTree[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trees")
    .select("id, name")
    .is("archived_at", null)
    .order("name", { ascending: true });
  if (error) throw new Error(`Failed to load your trees: ${error.message}`);
  return data ?? [];
}

/** How many archived trees the owner has — drives the collection's "Archived (n)"
 * link (hidden at 0). A head-only exact count, so no rows are fetched. */
export async function countArchivedTrees(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("trees")
    .select("id", { count: "exact", head: true })
    .not("archived_at", "is", null);
  if (error) throw new Error(`Failed to count archived trees: ${error.message}`);
  return count ?? 0;
}

/** How many active (non-archived) trees the caller has — for the Today summary. */
export async function countActiveTrees(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("trees")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null);
  if (error) throw new Error(`Failed to count active trees: ${error.message}`);
  return count ?? 0;
}

/**
 * One tree by id, or null if it doesn't exist or isn't the caller's (RLS). Wrapped
 * in `cache` so a page and its `generateMetadata` share a single query per request.
 */
export const getTree = cache(async (id: string): Promise<Tree | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trees").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load tree: ${error.message}`);
  return data;
});

/** Maps the validated form input to the trees table's column names. */
function toRow(input: TreeFormInput) {
  return {
    name: input.name,
    species_label: input.speciesLabel,
    development_stage: input.developmentStage,
    origin: input.origin,
    style: input.style,
    current_pot: input.currentPot,
    current_substrate: input.currentSubstrate,
    acquired_on: input.acquiredOn,
    acquired_from: input.acquiredFrom,
    health_status: input.healthStatus,
    notes: input.notes,
  };
}

/** Inserts a tree owned by the current user; returns the new row id. */
export async function createTree(input: TreeFormInput): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("trees")
    .insert({ owner_id: user.id, ...toRow(input) })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create tree: ${error.message}`);
  return data;
}

/** Updates an existing tree (including its location). RLS + the id filter scope
 * the write to the owner. */
export async function updateTree(
  id: string,
  input: TreeFormInput,
  locationId: string | null,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("trees")
    .update({ ...toRow(input), location_id: locationId })
    .eq("id", id);
  if (error) throw new Error(`Failed to update tree: ${error.message}`);
}

/** Soft-deletes a tree (hidden from default views, history preserved). */
export async function archiveTree(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("trees")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Failed to archive tree: ${error.message}`);
}

/** Restores an archived tree (clears `archived_at`), returning it to default views.
 * RLS + the id filter scope the write to the owner. */
export async function unarchiveTree(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("trees").update({ archived_at: null }).eq("id", id);
  if (error) throw new Error(`Failed to unarchive tree: ${error.message}`);
}
