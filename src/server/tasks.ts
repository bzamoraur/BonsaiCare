import { cache } from "react";

import type { TaskFormInput } from "@/domain/task-form";
import { createClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/database.types";

/**
 * Server-side data access for tasks. Every query runs through the request-scoped
 * Supabase client, so RLS restricts rows to the signed-in owner; the explicit
 * `owner_id` on insert matches the RLS `with check`. Completion and skip are NOT
 * here — they mutate status *and* spawn the next occurrence atomically, so they
 * go through a Postgres RPC (next slice), not a plain update.
 *
 * Imports `next/headers` (via the server client) → Server-only.
 */

export type Task = Tables<"tasks">;

/** Maps validated form input to the tasks columns. owner_id/id/status/completed_at
 * are set by the caller or the DB defaults. */
function toRow(input: TaskFormInput) {
  return {
    tree_id: input.treeId,
    type: input.type,
    title: input.title,
    due_on: input.dueOn,
    notes: input.notes,
    recurrence: input.recurrence as unknown as Json,
  };
}

/** One task by id, or null if it doesn't exist or isn't the caller's (RLS). */
export const getTask = cache(async (id: string): Promise<Task | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load task: ${error.message}`);
  return data;
});

/** A tree's tasks, soonest due first. */
export async function listTreeTasks(treeId: string): Promise<Task[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("tree_id", treeId)
    .order("due_on", { ascending: true });
  if (error) throw new Error(`Failed to load tasks: ${error.message}`);
  return data ?? [];
}

/** Inserts a task owned by the current user; returns the new row id. */
export async function createTask(input: TaskFormInput): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  // If attached to a tree, confirm it's the caller's (defense-in-depth beyond RLS).
  if (input.treeId) {
    const { data: tree } = await supabase
      .from("trees")
      .select("id")
      .eq("id", input.treeId)
      .maybeSingle();
    if (!tree) throw new Error("Tree not found.");
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({ owner_id: user.id, ...toRow(input) })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return data;
}

/** Updates an existing task. RLS + the id filter scope the write to the owner. */
export async function updateTask(id: string, input: TaskFormInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(toRow(input)).eq("id", id);
  if (error) throw new Error(`Failed to update task: ${error.message}`);
}

/** Hard-deletes a task. A task is a *plan*, not history — deleting an intended
 * action loses nothing (completed tasks live on as care-log entries). */
export async function deleteTask(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}
