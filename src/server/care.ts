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

/** One care entry by id, or null if it doesn't exist or isn't the caller's (RLS). */
export async function getCareEntry(id: string): Promise<CareEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("care_log_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load care entry: ${error.message}`);
  return data;
}

/** A tree's care entries, newest first. */
export async function listTreeEntries(treeId: string): Promise<CareEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("care_log_entries")
    .select("*")
    .eq("tree_id", treeId)
    // occurred_on is a calendar date; created_at desc is the same-day tiebreaker
    // (ADR-0012: newest logged first).
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
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
      // Omit occurred_on when absent so the DB default (current_date) applies.
      ...(input.occurredAt ? { occurred_on: input.occurredAt } : {}),
      title: input.title,
      notes: input.notes,
      details: input.details as Json,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to log care: ${error.message}`);
  return data;
}

/** Updates a care entry. RLS + the id filter scope the write to the owner. A
 * cleared date falls back to today (the column is NOT NULL). */
export async function updateCareEntry(id: string, input: CareEntryInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("care_log_entries")
    .update({
      type: input.type,
      occurred_on: input.occurredAt ?? new Date().toISOString().slice(0, 10),
      title: input.title,
      notes: input.notes,
      details: input.details as Json,
    })
    .eq("id", id);
  if (error) throw new Error(`Failed to update care entry: ${error.message}`);
}

/** Deletes a care entry. RLS + the id filter scope the delete to the owner. Any
 * photos attached to it keep existing (their care_log_entry_id FK is set null). */
export async function deleteCareEntry(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("care_log_entries").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete care entry: ${error.message}`);
}
