import { cache } from "react";

import type { TreeFormInput } from "@/domain/tree-form";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

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
> & { coverUrl: string | null };

const TREE_CARD_COLUMNS =
  "id, name, species_label, development_stage, health_status, cover_photo_id";
const COVER_URL_TTL_SECONDS = 60 * 60; // 1 hour

/** Non-archived trees for the current user, newest first, each with a signed
 * cover-photo URL (batched into one Storage call). */
export async function listTrees(): Promise<TreeCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trees")
    .select(TREE_CARD_COLUMNS)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load trees: ${error.message}`);
  const rows = data ?? [];

  // Resolve cover photos → signed URLs in two batched queries (paths, then signs).
  const coverIds = rows.map((r) => r.cover_photo_id).filter((v): v is string => Boolean(v));
  const pathById = new Map<string, string>();
  if (coverIds.length > 0) {
    const { data: covers } = await supabase
      .from("photos")
      .select("id, storage_path")
      .in("id", coverIds);
    for (const cover of covers ?? []) pathById.set(cover.id, cover.storage_path);
  }

  const paths = [...pathById.values()];
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("tree-photos")
      .createSignedUrls(paths, COVER_URL_TTL_SECONDS);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  return rows.map(({ cover_photo_id, ...card }) => {
    const path = cover_photo_id ? pathById.get(cover_photo_id) : undefined;
    return { ...card, coverUrl: path ? (urlByPath.get(path) ?? null) : null };
  });
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
