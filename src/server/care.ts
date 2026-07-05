import type { CareEntryInput } from "@/domain/care";
import { createClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/database.types";

/**
 * Server-side data access for care-log entries. Owner-scoped by RLS; the explicit
 * `owner_id` on insert matches the RLS `with check`. Server-only (imports
 * `next/headers`). Payloads are validated by `parseCareEntry` before they get
 * here — this layer trusts a `CareEntryInput`.
 */

export type CareEntry = Tables<"care_log_entries">;

/** A tree's care entries, newest first. */
export async function listTreeEntries(treeId: string): Promise<CareEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("care_log_entries")
    .select("*")
    .eq("tree_id", treeId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(`Failed to load care log: ${error.message}`);
  return data ?? [];
}

/** Inserts a care entry owned by the current user; returns the new row id. */
export async function createCareEntry(input: CareEntryInput): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  // Defense-in-depth: the tree must be the caller's (RLS also enforces it).
  const { data: tree } = await supabase
    .from("trees")
    .select("id")
    .eq("id", input.treeId)
    .maybeSingle();
  if (!tree) throw new Error("Tree not found.");

  const { data, error } = await supabase
    .from("care_log_entries")
    .insert({
      owner_id: user.id,
      tree_id: input.treeId,
      type: input.type,
      // Omit occurred_at when absent so the DB default (now()) applies.
      ...(input.occurredAt ? { occurred_at: input.occurredAt } : {}),
      title: input.title,
      notes: input.notes,
      details: input.details as Json,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to log care: ${error.message}`);
  return data;
}
