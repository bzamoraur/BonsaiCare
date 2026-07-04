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
>;

const TREE_CARD_COLUMNS = "id, name, species_label, development_stage, health_status";

/** Non-archived trees for the current user, newest first. */
export async function listTrees(): Promise<TreeCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trees")
    .select(TREE_CARD_COLUMNS)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load trees: ${error.message}`);
  return data ?? [];
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

/** Updates an existing tree. RLS + the id filter scope the write to the owner. */
export async function updateTree(id: string, input: TreeFormInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("trees").update(toRow(input)).eq("id", id);
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
