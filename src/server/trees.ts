import type { NewTreeInput } from "@/domain/tree-form";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

/**
 * Server-side data access for trees. Every query runs through the request-scoped
 * Supabase client, so RLS restricts results to the signed-in owner; the explicit
 * `owner_id` on insert matches the RLS `with check` and keeps intent obvious.
 *
 * This module imports `next/headers` (via the server client), so it can only be
 * used from Server Components, Route Handlers, and Server Actions.
 */

export type TreeCard = Pick<
  Tables<"trees">,
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

/** Inserts a tree owned by the current user; returns the new row id. */
export async function createTree(input: NewTreeInput): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("trees")
    .insert({
      owner_id: user.id,
      name: input.name,
      species_label: input.speciesLabel,
      development_stage: input.developmentStage,
      health_status: input.healthStatus,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create tree: ${error.message}`);
  return data;
}
