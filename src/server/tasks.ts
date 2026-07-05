import { cache } from "react";

import { computeNextDueOn, parseRecurrence } from "@/domain/scheduling";
import { TASK_TYPE_TO_CARE_EVENT, type TaskFormInput } from "@/domain/task-form";
import { createClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/database.types";

/**
 * Server-side data access for tasks. Every query runs through the request-scoped
 * Supabase client, so RLS restricts rows to the signed-in owner; the explicit
 * `owner_id` on insert matches the RLS `with check`. Completion and skip don't
 * use a plain update — they mutate status *and* spawn the next occurrence, so
 * they go through the atomic `complete_task` RPC (see `resolveTask`).
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

/**
 * Shared resolution path for complete + skip. Computes the season-aware next due
 * date in TS (`computeNextDueOn` — the single source of truth for the recurrence
 * math), then performs every write atomically via the `complete_task` RPC. The
 * RPC's status guard makes a double-submit a no-op raise, not a duplicate series.
 */
async function resolveTask(
  taskId: string,
  outcome: "done" | "skipped",
  opts: { completedOn: string; logEvent?: boolean; careNotes?: string | null },
): Promise<void> {
  const supabase = await createClient();

  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (readError) throw new Error(`Failed to load task: ${readError.message}`);
  if (!task) throw new Error("Task not found.");

  // Next occurrence for a recurring task, from the verified domain function.
  // A non-null recurrence that fails to parse can only mean out-of-band DB
  // corruption (every write path validates it) — we leave nextDueOn null rather
  // than guess, so the series stops instead of scheduling a garbage date.
  let nextDueOn: string | null = null;
  if (task.recurrence) {
    const parsed = parseRecurrence(task.recurrence);
    if (parsed.ok) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("hemisphere")
        .eq("id", task.owner_id)
        .maybeSingle();
      // Fail loud on a read error: silently defaulting the hemisphere could write
      // a wrong-season successor (the exact ADR-0006 risk). The `?? "northern"`
      // is only the canonical default for a genuinely absent profile row.
      if (profileError) {
        throw new Error(`Failed to load your profile for scheduling: ${profileError.message}`);
      }
      nextDueOn = computeNextDueOn(
        { dueOn: task.due_on, completedOn: opts.completedOn },
        parsed.value,
        profile?.hemisphere ?? "northern",
      );
    }
  }

  // Only log a care event for a tree-scoped task: a care_log_entry requires a tree
  // (NOT NULL), so never request one for a collection-wide (tree-less) task.
  const careType =
    outcome === "done" && opts.logEvent && task.tree_id ? TASK_TYPE_TO_CARE_EVENT[task.type] : null;

  // Optional RPC args are omitted (undefined) rather than null when absent — the
  // Postgres function's own defaults (null) apply. Matches the generated types,
  // which type defaulted params as non-nullable.
  const { error } = await supabase.rpc("complete_task", {
    p_task_id: taskId,
    p_outcome: outcome,
    p_completed_on: opts.completedOn,
    p_log_event: careType !== null,
    p_care_type: careType ?? undefined,
    p_care_notes: opts.careNotes ?? undefined,
    p_next_due_on: nextDueOn ?? undefined,
  });
  if (error) {
    throw new Error(`Failed to ${outcome === "done" ? "complete" : "skip"} task: ${error.message}`);
  }
}

/** Marks a task done, optionally logging a linked care event, and (if recurring)
 * spawns the next occurrence — all atomically. */
export async function completeTask(
  taskId: string,
  opts: { completedOn: string; logEvent?: boolean; careNotes?: string | null },
): Promise<void> {
  await resolveTask(taskId, "done", opts);
}

/** Marks a task skipped; a recurring task still spawns its next occurrence (you
 * skipped this one, not the plan). */
export async function skipTask(taskId: string, completedOn: string): Promise<void> {
  await resolveTask(taskId, "skipped", { completedOn });
}
