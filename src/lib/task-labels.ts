import {
  Cable,
  Camera,
  Droplets,
  Eye,
  FlaskConical,
  ListTodo,
  Scissors,
  Shovel,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { parseRecurrence } from "@/domain/scheduling";
import type { Enums } from "@/types/database.types";

// Task-type labels ("Water", "Prune") — a task is an *intention* vs a care entry's
// *history* ("Watered") — now live in the `taskTypes` message namespace (translate
// via useTranslations/getTranslations). messages.test.ts keeps every enum present.

export const TASK_TYPE_ICONS = {
  watering: Droplets,
  fertilizing: FlaskConical,
  pruning: Scissors,
  repotting: Shovel,
  wiring: Cable,
  inspection: Eye,
  photo: Camera,
  custom: ListTodo,
} satisfies Record<Enums<"task_type">, LucideIcon>;

export type RecurrenceInfo =
  | { kind: "oneOff" }
  | { kind: "everyDay" }
  | { kind: "interval"; days: number }
  | { kind: "seasonal"; days: number; startMonth: number; endMonth: number };

/**
 * Structured description of a task's schedule — the view renders/translates it
 * (labels live in the `recurrence` message namespace). Takes the raw JSONB so
 * callers pass `task.recurrence` directly; unparseable/null reads as one-off.
 * Season months are stored northern-canonical (correct for a northern profile).
 */
export function recurrenceInfo(raw: unknown): RecurrenceInfo {
  const parsed = parseRecurrence(raw);
  if (!parsed.ok) return { kind: "oneOff" };
  const r = parsed.value;
  if (r.season_start_month && r.season_end_month) {
    return {
      kind: "seasonal",
      days: r.interval_days,
      startMonth: r.season_start_month,
      endMonth: r.season_end_month,
    };
  }
  if (r.interval_days === 1) return { kind: "everyDay" };
  return { kind: "interval", days: r.interval_days };
}
