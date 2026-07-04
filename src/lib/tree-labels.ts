import type { Enums } from "@/types/database.types";

/**
 * Human-readable labels for the tree enum fields, shared by the add form (option
 * text) and the collection cards (display). Typed as full `Record`s so adding a
 * new enum value to the schema fails the build until a label is provided.
 */
export const DEVELOPMENT_STAGE_LABELS: Record<Enums<"development_stage">, string> = {
  raw_material: "Raw material",
  development: "In development",
  refinement: "Refinement",
  maintenance: "Maintenance",
};

export const HEALTH_STATUS_LABELS: Record<Enums<"health_status">, string> = {
  thriving: "Thriving",
  healthy: "Healthy",
  struggling: "Struggling",
  critical: "Critical",
  dormant: "Dormant",
};
