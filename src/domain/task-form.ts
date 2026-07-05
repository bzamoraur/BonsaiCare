import { Constants, type Enums } from "@/types/database.types";

import { parseRecurrence, type Recurrence } from "./scheduling";

/**
 * Validated shape for creating or editing a task. Flat fields use hand-rolled
 * pure validators (the [ADR-0011](../../docs/decisions/0011-server-actions-and-validation.md)
 * pattern); the `recurrence` JSONB is delegated to `parseRecurrence` (Zod). Pure
 * and synchronous so it runs at the Server Action boundary and is unit-tested
 * without a database or FormData.
 *
 * `treeId` null = a collection-wide task ("order akadama"). `recurrence` null =
 * a one-off task.
 */
export type TaskFormInput = {
  title: string;
  type: Enums<"task_type">;
  treeId: string | null;
  dueOn: string; // ISO local date, "YYYY-MM-DD"
  notes: string | null;
  recurrence: Recurrence | null;
};

export type ParseTaskResult = { ok: true; value: TaskFormInput } | { ok: false; message: string };

export const MAX_TASK_TITLE_LENGTH = 120;
export const MAX_TASK_NOTES_LENGTH = 2000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Raw form values; the recurrence sub-fields are only read when `recurring`. */
type RawTaskForm = {
  title: unknown;
  type: unknown;
  treeId?: unknown;
  dueOn: unknown;
  notes?: unknown;
  recurring?: unknown; // truthy → build & validate a recurrence rule
  intervalDays?: unknown;
  anchor?: unknown;
  seasonal?: unknown; // truthy → include the season window
  seasonStartMonth?: unknown;
  seasonEndMonth?: unknown;
};

const isTruthy = (v: unknown) => v === true || v === "true" || v === "on" || v === "1";

/** Coerce a form value to a number; NaN for anything non-numeric so the Zod
 * recurrence schema's `.int()`/`.min()` rejects it with a friendly message. */
function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
}

function isValidIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  // Reject impossible dates (JS silently rolls 2024-02-31 into March).
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function parseTaskForm(raw: RawTaskForm): ParseTaskResult {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (title === "") return { ok: false, message: "Please give the task a title." };
  if (title.length > MAX_TASK_TITLE_LENGTH) {
    return { ok: false, message: `Title must be ${MAX_TASK_TITLE_LENGTH} characters or fewer.` };
  }

  const type =
    typeof raw.type === "string" &&
    (Constants.public.Enums.task_type as readonly string[]).includes(raw.type)
      ? (raw.type as Enums<"task_type">)
      : null;
  if (!type) return { ok: false, message: "Please choose a valid task type." };

  let treeId: string | null = null;
  if (typeof raw.treeId === "string" && raw.treeId.trim() !== "") {
    if (!UUID_RE.test(raw.treeId.trim())) return { ok: false, message: "That tree is invalid." };
    treeId = raw.treeId.trim();
  }

  const dueOn = typeof raw.dueOn === "string" ? raw.dueOn.trim() : "";
  if (!isValidIsoDate(dueOn)) return { ok: false, message: "Please enter a valid due date." };

  let notes: string | null = null;
  if (typeof raw.notes === "string" && raw.notes.trim() !== "") {
    const trimmed = raw.notes.trim();
    if (trimmed.length > MAX_TASK_NOTES_LENGTH) {
      return { ok: false, message: `Notes must be ${MAX_TASK_NOTES_LENGTH} characters or fewer.` };
    }
    notes = trimmed;
  }

  let recurrence: Recurrence | null = null;
  if (isTruthy(raw.recurring)) {
    const withSeason = isTruthy(raw.seasonal);
    const rawRecurrence = {
      interval_days: toNumber(raw.intervalDays),
      anchor: raw.anchor,
      ...(withSeason
        ? {
            season_start_month: toNumber(raw.seasonStartMonth),
            season_end_month: toNumber(raw.seasonEndMonth),
          }
        : {}),
    };
    const parsed = parseRecurrence(rawRecurrence);
    if (!parsed.ok) return { ok: false, message: parsed.message };
    recurrence = parsed.value;
  }

  return { ok: true, value: { title, type, treeId, dueOn, notes, recurrence } };
}
