import type { CareEventType } from "@/domain/care";

/**
 * Per-type `details` field config, shared by the log-care form (what to render)
 * and the server action (which field names to collect). Keeping one source keeps
 * the form, the action, and the Zod schemas in `domain/care.ts` in lockstep.
 * Field caps mirror the Zod schemas (which remain authoritative).
 */
export type CareField =
  | { name: string; label: string; kind: "text"; maxLength: number; placeholder?: string }
  | { name: string; label: string; kind: "select"; options: { value: string; label: string }[] };

export const CARE_FIELDS: Record<CareEventType, CareField[]> = {
  watering: [
    { name: "amount", label: "Amount", kind: "text", maxLength: 60, placeholder: "e.g. thorough" },
  ],
  fertilizing: [
    {
      name: "product",
      label: "Product",
      kind: "text",
      maxLength: 120,
      placeholder: "e.g. Biogold",
    },
    { name: "npk", label: "NPK", kind: "text", maxLength: 20, placeholder: "e.g. 5-5-5" },
    { name: "amount", label: "Amount", kind: "text", maxLength: 60 },
  ],
  pruning: [
    {
      name: "intensity",
      label: "Intensity",
      kind: "select",
      options: [
        { value: "light", label: "Light" },
        { value: "moderate", label: "Moderate" },
        { value: "hard", label: "Hard" },
      ],
    },
  ],
  wiring: [
    {
      name: "branches",
      label: "Branches",
      kind: "text",
      maxLength: 200,
      placeholder: "e.g. lower left, apex",
    },
    { name: "gauge", label: "Wire gauge", kind: "text", maxLength: 40, placeholder: "e.g. 2.5mm" },
  ],
  repotting: [
    { name: "new_pot", label: "New pot", kind: "text", maxLength: 120 },
    {
      name: "soil_mix",
      label: "Soil mix",
      kind: "text",
      maxLength: 160,
      placeholder: "e.g. akadama/pumice/lava",
    },
    { name: "root_work", label: "Root work", kind: "text", maxLength: 200 },
  ],
  pest_treatment: [
    {
      name: "issue",
      label: "Issue",
      kind: "text",
      maxLength: 120,
      placeholder: "e.g. spider mites",
    },
    { name: "treatment", label: "Treatment", kind: "text", maxLength: 160 },
  ],
  styling: [],
  defoliation: [
    {
      name: "extent",
      label: "Extent",
      kind: "select",
      options: [
        { value: "partial", label: "Partial" },
        { value: "full", label: "Full" },
      ],
    },
  ],
  observation: [],
  note: [],
};

/** Every possible detail field name — the action collects only these from the form. */
export const ALL_DETAIL_FIELD_NAMES: readonly string[] = Array.from(
  new Set(
    Object.values(CARE_FIELDS)
      .flat()
      .map((f) => f.name),
  ),
);
