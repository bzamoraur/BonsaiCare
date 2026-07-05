import type { CareEventType } from "@/domain/care";

/**
 * Past-tense labels for care event types — read naturally on a timeline
 * ("Watered", "Repotted"). Exhaustive `Record` so a new enum value fails the
 * build until it gets a label.
 */
export const CARE_EVENT_LABELS: Record<CareEventType, string> = {
  watering: "Watered",
  fertilizing: "Fertilized",
  pruning: "Pruned",
  wiring: "Wired",
  repotting: "Repotted",
  pest_treatment: "Pest treatment",
  styling: "Styled",
  defoliation: "Defoliated",
  observation: "Observation",
  note: "Note",
};

/** A short one-line summary of a care entry's `details` JSONB for list display. */
export function careDetailSummary(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  return Object.values(details as Record<string, unknown>)
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .join(" · ");
}
