/**
 * Pure scheduling helpers — no React, no Supabase, no I/O.
 *
 * This module is the first inhabitant of the domain layer: the place where
 * correctness-critical logic (overdue, recurrence, seasonality) lives so it can
 * be unit-tested in isolation and reused by a future native client.
 * See docs/architecture/overview.md and
 * docs/decisions/0006-task-scheduling-and-recurrence.md.
 *
 * Dates are ISO local-date strings ("YYYY-MM-DD"). For two valid ISO dates,
 * lexicographic string comparison equals chronological comparison, which keeps
 * these helpers timezone-free and trivially testable.
 */

export type TaskStatus = "pending" | "done" | "skipped";

/** The minimal shape `isOverdue` needs — not the full Task entity. */
export interface SchedulableTask {
  status: TaskStatus;
  /** Due date as an ISO local-date string, e.g. "2026-06-27". */
  dueOn: string;
}

/**
 * A task is overdue when it is still pending and its due date is strictly before
 * today. Done/skipped tasks are never overdue; a task due *today* is not yet
 * overdue. Overdue is always derived, never stored
 * (see ADR-0006).
 *
 * @param task  the task to evaluate
 * @param today today's ISO local-date string ("YYYY-MM-DD")
 */
export function isOverdue(task: SchedulableTask, today: string): boolean {
  return task.status === "pending" && task.dueOn < today;
}
