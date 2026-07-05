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

/**
 * Display metadata for task types. Kept separate from the care-log labels: a task
 * is an *intention* ("Water"), a care entry is *history* ("Watered"). `satisfies`
 * keeps both maps exhaustive against the task_type enum.
 */
export const TASK_TYPE_LABELS = {
  watering: "Water",
  fertilizing: "Fertilize",
  pruning: "Prune",
  repotting: "Repot",
  wiring: "Wire",
  inspection: "Inspect",
  photo: "Photo",
  custom: "Task",
} satisfies Record<Enums<"task_type">, string>;

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A short human description of a task's schedule for a card ("Every 14 days ·
 * Mar–Oct"). Takes the raw JSONB so callers pass `task.recurrence` directly; an
 * unparseable or null value reads as a one-off. Season months are shown as stored
 * (northern-canonical) — correct as-is for a northern profile.
 */
export function describeRecurrence(raw: unknown): string {
  const parsed = parseRecurrence(raw);
  if (!parsed.ok) return "One-off";
  const r = parsed.value;
  const base = r.interval_days === 1 ? "Every day" : `Every ${r.interval_days} days`;
  if (r.season_start_month && r.season_end_month) {
    return `${base} · ${MONTHS[r.season_start_month - 1]}–${MONTHS[r.season_end_month - 1]}`;
  }
  return base;
}
