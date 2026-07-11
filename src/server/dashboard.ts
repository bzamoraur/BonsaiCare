import { parseRecurrence, projectFutureOccurrences } from "@/domain/scheduling";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

/**
 * Server-side reads for the Today dashboard. Owner-scoped by RLS; the task query
 * rides the `(owner_id, status, due_on)` index. Imports `next/headers` → Server-only.
 */

export type DashboardTask = Tables<"tasks"> & {
  tree: { id: string; name: string } | null;
};

/** A forecast occurrence of a recurring task on a future date (no row exists yet). */
export type ProjectedOccurrence = { iso: string; task: DashboardTask };

/** Normalize the `tree` embed: a to-one FK yields an object, but be robust to an
 * array or null so a card never dereferences the wrong shape. */
function normalizeTasks(data: unknown[] | null): DashboardTask[] {
  return (data ?? []).map((row) => {
    const { tree, ...task } = row as Tables<"tasks"> & { tree: unknown };
    const one = Array.isArray(tree) ? (tree[0] ?? null) : (tree ?? null);
    return { ...task, tree: one as DashboardTask["tree"] };
  });
}

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

  return normalizeTasks(data);
}

/**
 * Recently completed tasks (done), newest first — the Today "Recently done"
 * history, so finishing a task leaves a visible trace instead of vanishing from
 * the dashboard. Bounded to the last `sinceDays` days and a row cap; owner-scoped
 * by RLS. (A `done` task always carries `completed_at`, set by `complete_task`.)
 */
export async function listPastTasks(sinceDays = 14, limit = 20): Promise<DashboardTask[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - sinceDays);

  const { data, error } = await supabase
    .from("tasks")
    .select("*, tree:trees(id, name)")
    .eq("status", "done")
    .gte("completed_at", since.toISOString())
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load your history: ${error.message}`);

  return normalizeTasks(data);
}

/**
 * Tasks with `due_on` in `[fromIso, toIso]` (inclusive) for the calendar's month
 * grid + agenda — both **pending** (still to do) and **done**, so a completed
 * action leaves a visible trace on the calendar instead of vanishing. `skipped`
 * tasks are excluded: they carry no `completed_at` and represent a deliberate
 * "not this time", so on the calendar they'd be noise rather than history. Soonest
 * first, each with its tree name; the `(owner_id, status, due_on)` index still
 * serves the range scan. Owner-scoped by RLS.
 */
export async function listCalendarTasks(fromIso: string, toIso: string): Promise<DashboardTask[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*, tree:trees(id, name)")
    .in("status", ["pending", "done"])
    .gte("due_on", fromIso)
    .lte("due_on", toIso)
    .order("due_on", { ascending: true });
  if (error) throw new Error(`Failed to load the calendar: ${error.message}`);

  return normalizeTasks(data);
}

/**
 * Forecast occurrences of recurring tasks that fall in `[fromIso, toIso]` but have
 * no row yet. Only ONE pending row exists per recurring series (its next due date;
 * a new one is spawned on completion), so future occurrences never appear on the
 * calendar. This projects each pending recurring task forward (season-aware, via
 * the domain `projectFutureOccurrences`) so the month shows the plan ahead. The
 * real next occurrence is excluded — it's already returned by `listCalendarTasks`
 * and rendered actionable; these projections are read-only "planned" markers.
 * Owner-scoped by RLS.
 */
export async function listCalendarProjections(
  fromIso: string,
  toIso: string,
  todayIso: string,
): Promise<ProjectedOccurrence[]> {
  // A forecast only makes sense forward: never paint "planned" markers on days that
  // have already passed (an overdue series would otherwise dot earlier days of the
  // current month, and past months would show forecasts entirely). Clamp the window
  // start to today. (Uses the server's UTC day as a generous floor — a day of
  // timezone slack on a read-only forecast marker is immaterial.)
  const rangeStart = todayIso > fromIso ? todayIso : fromIso;
  if (rangeStart > toIso) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Season interpretation needs the owner's hemisphere; a genuinely absent profile
  // falls back to the canonical northern default (matches resolveTask).
  const { data: profile } = await supabase
    .from("profiles")
    .select("hemisphere")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const hemisphere = profile?.hemisphere ?? "northern";

  // A series whose next occurrence is already past the window can't project into it.
  const { data, error } = await supabase
    .from("tasks")
    .select("*, tree:trees(id, name)")
    .eq("status", "pending")
    .not("recurrence", "is", null)
    .lte("due_on", toIso)
    .order("due_on", { ascending: true });
  if (error) throw new Error(`Failed to load the calendar forecast: ${error.message}`);

  const projections: ProjectedOccurrence[] = [];
  for (const task of normalizeTasks(data)) {
    const parsed = parseRecurrence(task.recurrence);
    // A recurrence that fails to parse is out-of-band corruption (every write path
    // validates it) — skip that series rather than guess a schedule.
    if (!parsed.ok) continue;
    for (const iso of projectFutureOccurrences(
      task.due_on,
      parsed.value,
      hemisphere,
      rangeStart,
      toIso,
    )) {
      projections.push({ iso, task });
    }
  }
  return projections;
}
