import { z } from "zod";

/**
 * Pure scheduling helpers — no React, no Supabase, no I/O, no `Date.now()`.
 *
 * This module is the correctness core of the task engine: overdue, recurrence,
 * and seasonality live here so they can be unit-tested in isolation and reused by
 * a future native client. Callers inject "today", the anchor dates, and the
 * profile's hemisphere — nothing is read from the ambient clock or environment.
 * See docs/architecture/overview.md and
 * docs/decisions/0006-task-scheduling-and-recurrence.md.
 *
 * Dates are ISO local-date strings ("YYYY-MM-DD"). For two valid ISO dates,
 * lexicographic string comparison equals chronological comparison, which keeps
 * these helpers timezone-free and trivially testable. Internal date arithmetic
 * uses UTC (`Date.UTC`) purely as a calendar calculator — never local time — so
 * there is no timezone drift.
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

// ---------------------------------------------------------------------------
// Recurrence & seasonality (ADR-0006)
// ---------------------------------------------------------------------------

/** Where the northern/southern seasons are inverted from. */
export type Hemisphere = "northern" | "southern";

/**
 * The recurrence rule stored on a task as JSONB (`null` = one-off). Deliberately
 * small per ADR-0006 — not a full RRULE.
 *
 * `season_start_month`/`season_end_month` (1–12, inclusive) are stored in
 * **northern-hemisphere canonical** terms. `isInSeasonWindow` inverts them for a
 * southern profile, so a single stored window is correct in both hemispheres —
 * the fix for the Bonsai Empire seasonality bug. A window may wrap the year end
 * (`start > end`, e.g. Nov–Feb). Both season months are present together or not
 * at all (absent = active year-round).
 */
export const RecurrenceSchema = z
  .strictObject({
    /** Days between occurrences, e.g. 14. */
    interval_days: z.number().int().min(1, "Interval must be at least 1 day."),
    /** Recompute the next date from when you *did* it, or from the due date. */
    anchor: z.enum(
      ["completion", "due"],
      "Choose whether to repeat from the due date or the completion date.",
    ),
    /** Northern-canonical month (1–12) the active window opens on. */
    season_start_month: z.number().int().min(1).max(12).optional(),
    /** Northern-canonical month (1–12) the active window closes on (inclusive). */
    season_end_month: z.number().int().min(1).max(12).optional(),
  })
  .refine(
    (r) => (r.season_start_month === undefined) === (r.season_end_month === undefined),
    "Set both a season start and end month, or neither.",
  );

export type Recurrence = z.infer<typeof RecurrenceSchema>;

export type ParseRecurrenceResult =
  | { ok: true; value: Recurrence }
  | { ok: false; message: string };

/**
 * Validates a raw recurrence rule (from a form or the DB JSONB column) per
 * ADR-0011. Returns a discriminated result mirroring `parseCareEntry`. A `null`
 * recurrence (one-off task) is handled by the caller — this validates the
 * recurring shape only.
 */
export function parseRecurrence(raw: unknown): ParseRecurrenceResult {
  const parsed = RecurrenceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "That schedule isn't valid." };
  }
  return { ok: true, value: parsed.data };
}

/** Shift a calendar month by six months (1-based, wrapping). Used to invert a
 * northern-canonical season window for the southern hemisphere. */
function shiftForHemisphere(month: number, hemisphere: Hemisphere): number {
  return hemisphere === "southern" ? ((month - 1 + 6) % 12) + 1 : month;
}

/**
 * Is `month` (1–12) within the recurrence's active season for `hemisphere`?
 *
 * With no season window, always true (year-round). Otherwise the stored
 * northern-canonical window is compared against the month, inverted by six months
 * for a southern profile. Windows that wrap the year end (`start > end`) are
 * handled. Passing `hemisphere` is mandatory so a caller can never silently
 * evaluate a season in the wrong hemisphere (the Bonsai Empire bug class).
 */
export function isInSeasonWindow(
  month: number,
  recurrence: Recurrence,
  hemisphere: Hemisphere,
): boolean {
  const { season_start_month: start, season_end_month: end } = recurrence;
  if (start === undefined || end === undefined) return true;
  const m = shiftForHemisphere(month, hemisphere);
  return start <= end ? m >= start && m <= end : m >= start || m <= end;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function toIso(dt: Date): string {
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** Add `days` to an ISO local-date string, rolling over months/years correctly. */
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toIso(dt);
}

const monthOf = (iso: string): number => Number(iso.slice(5, 7));

/**
 * The 1st of the first in-season month strictly after `iso`'s month. Called only
 * when `iso` is itself out of season, so it always advances. Bounded to 12 steps
 * — a valid window has at least one in-season month.
 */
function firstDayOfNextInSeasonMonth(
  iso: string,
  recurrence: Recurrence,
  hemisphere: Hemisphere,
): string {
  const [y, m] = iso.split("-").map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, 1));
  for (let i = 0; i < 12; i++) {
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    if (isInSeasonWindow(cursor.getUTCMonth() + 1, recurrence, hemisphere)) return toIso(cursor);
  }
  return toIso(cursor); // unreachable for a valid window; safe non-crashing fallback
}

/**
 * The next due date after an occurrence, honoring the season skip (ADR-0006).
 *
 * Adds `interval_days` to the anchor date — the completion date or the prior due
 * date, selected by `recurrence.anchor`. If the result lands out of season, it is
 * pushed forward to the 1st of the next in-season month (resuming, e.g.,
 * fertilizing at the start of spring rather than mid-winter). Returns an ISO
 * local-date string.
 *
 * @param anchors    both candidate anchor dates; the function picks per `anchor`
 * @param recurrence the (non-null) recurrence rule
 * @param hemisphere the owner's hemisphere, for season interpretation
 */
export function computeNextDueOn(
  anchors: { dueOn: string; completedOn: string },
  recurrence: Recurrence,
  hemisphere: Hemisphere,
): string {
  const base = recurrence.anchor === "completion" ? anchors.completedOn : anchors.dueOn;
  const candidate = addDays(base, recurrence.interval_days);

  if (recurrence.season_start_month === undefined || recurrence.season_end_month === undefined) {
    return candidate;
  }
  if (isInSeasonWindow(monthOf(candidate), recurrence, hemisphere)) return candidate;
  return firstDayOfNextInSeasonMonth(candidate, recurrence, hemisphere);
}
