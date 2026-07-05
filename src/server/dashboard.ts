import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

/**
 * Server-side reads for the Today dashboard. Owner-scoped by RLS; the task query
 * rides the `(owner_id, status, due_on)` index. Imports `next/headers` → Server-only.
 */

export type DashboardTask = Tables<"tasks"> & {
  tree: { id: string; name: string } | null;
};

/**
 * Pending tasks due on/before `horizonDays` from now — so **all overdue** plus the
 * near future — soonest first, each with its tree's name (null for a
 * collection-wide task). One indexed range scan; the viewer's client buckets the
 * result by their local today (overdue vs today vs upcoming). The horizon bound
 * uses the server's UTC day, which is fine as a *generous* upper cutoff — the
 * credibility-critical overdue/today split happens client-side against local time.
 */
export async function listDashboardTasks(horizonDays = 8): Promise<DashboardTask[]> {
  const supabase = await createClient();

  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + horizonDays);
  const bound = horizon.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("tasks")
    .select("*, tree:trees(id, name)")
    .eq("status", "pending")
    .lte("due_on", bound)
    .order("due_on", { ascending: true });
  if (error) throw new Error(`Failed to load your day: ${error.message}`);

  // Normalize the embed: a to-one FK yields an object, but be robust to an array
  // or null so a card never dereferences the wrong shape.
  return (data ?? []).map((row) => {
    const { tree, ...task } = row as Tables<"tasks"> & { tree: unknown };
    const one = Array.isArray(tree) ? (tree[0] ?? null) : (tree ?? null);
    return { ...task, tree: one as DashboardTask["tree"] };
  });
}
