import type { CareEntryInput, CareRecency } from "@/domain/care";
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

/**
 * The latest date each care type was logged, per tree, for the whole collection —
 * one query, reduced in memory (rows are date-desc, so the first row seen for a
 * (tree, type) is the newest). Powers the "watered 2d ago · fed 12d ago" chips.
 * Bounded by a row cap; a `distinct on` recency view is the scaling follow-up.
 */
export async function listTreeRecency(): Promise<Map<string, CareRecency>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("care_log_entries")
    .select("tree_id, type, occurred_on")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(`Failed to load care recency: ${error.message}`);

  const byTree = new Map<string, CareRecency>();
  for (const row of data ?? []) {
    let recency = byTree.get(row.tree_id);
    if (!recency) {
      recency = {};
      byTree.set(row.tree_id, recency);
    }
    if (recency[row.type] === undefined) recency[row.type] = row.occurred_on;
  }
  return byTree;
}

/** A tree's single most-recent care entry (or null) — used to repeat it. */
export async function getLatestCareEntry(treeId: string): Promise<CareEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("care_log_entries")
    .select("*")
    .eq("tree_id", treeId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load latest care: ${error.message}`);
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

/**
 * Bulk-logs the same care event across many trees — the batch-log flow. One
 * ownership check (`.in`) + one array insert (atomic); trees not owned by the
 * caller are dropped. Returns the count actually logged. Mirrors
 * `createTasksForTrees`.
 */
export async function createCareEntriesForTrees(
  treeIds: string[],
  entry: Omit<CareEntryInput, "treeId">,
): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: owned } = await supabase.from("trees").select("id").in("id", treeIds);
  const ownedIds = new Set((owned ?? []).map((t) => t.id));
  const valid = treeIds.filter((id) => ownedIds.has(id));
  if (valid.length === 0) throw new Error("No matching trees.");

  const details = entry.details as Json;
  const rows = valid.map((treeId) => ({
    owner_id: user.id,
    tree_id: treeId,
    type: entry.type,
    // Omit occurred_on when absent so the DB default (current_date) applies.
    ...(entry.occurredAt ? { occurred_on: entry.occurredAt } : {}),
    title: entry.title,
    notes: entry.notes,
    details,
  }));
  const { error } = await supabase.from("care_log_entries").insert(rows);
  if (error) throw new Error(`Failed to log care: ${error.message}`);
  return valid.length;
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
