import type { CareEventType } from "@/domain/care";

/**
 * Per-type `details` field config, shared by the log-care form (what to render)
 * and the server action (which field names to collect). Keeping one source keeps
 * the form, the action, and the Zod schemas in `domain/care.ts` in lockstep.
 * Field caps mirror the Zod schemas (which remain authoritative).
 *
 * `labelKey` / `placeholderKey` / option `labelKey` are i18n keys under the
 * `careFields` namespace, resolved in `care-entry-fields.tsx` — the config carries
 * keys, not user-facing strings, so it stays a plain (non-React) module while the
 * copy is translated. `placeholderKey` is per-field on purpose: e.g. `amount` shows
 * a hint when watering but not when fertilizing.
 */
export type CareField =
  | { name: string; labelKey: string; kind: "text"; maxLength: number; placeholderKey?: string }
  | {
      name: string;
      labelKey: string;
      kind: "select";
      options: { value: string; labelKey: string }[];
    };

export const CARE_FIELDS: Record<CareEventType, CareField[]> = {
  watering: [
    {
      name: "amount",
      labelKey: "labelAmount",
      kind: "text",
      maxLength: 60,
      placeholderKey: "phThorough",
    },
  ],
  fertilizing: [
    {
      name: "product",
      labelKey: "labelProduct",
      kind: "text",
      maxLength: 120,
      placeholderKey: "phProduct",
    },
    { name: "npk", labelKey: "labelNpk", kind: "text", maxLength: 20, placeholderKey: "phNpk" },
    { name: "amount", labelKey: "labelAmount", kind: "text", maxLength: 60 },
  ],
  pruning: [
    {
      name: "intensity",
      labelKey: "labelIntensity",
      kind: "select",
      options: [
        { value: "light", labelKey: "optLight" },
        { value: "moderate", labelKey: "optModerate" },
        { value: "hard", labelKey: "optHard" },
      ],
    },
  ],
  wiring: [
    {
      name: "branches",
      labelKey: "labelBranches",
      kind: "text",
      maxLength: 200,
      placeholderKey: "phBranches",
    },
    {
      name: "gauge",
      labelKey: "labelGauge",
      kind: "text",
      maxLength: 40,
      placeholderKey: "phGauge",
    },
  ],
  repotting: [
    { name: "new_pot", labelKey: "labelNewPot", kind: "text", maxLength: 120 },
    {
      name: "soil_mix",
      labelKey: "labelSoilMix",
      kind: "text",
      maxLength: 160,
      placeholderKey: "phSoilMix",
    },
    { name: "root_work", labelKey: "labelRootWork", kind: "text", maxLength: 200 },
  ],
  pest_treatment: [
    {
      name: "issue",
      labelKey: "labelIssue",
      kind: "text",
      maxLength: 120,
      placeholderKey: "phIssue",
    },
    { name: "treatment", labelKey: "labelTreatment", kind: "text", maxLength: 160 },
  ],
  styling: [],
  defoliation: [
    {
      name: "extent",
      labelKey: "labelExtent",
      kind: "select",
      options: [
        { value: "partial", labelKey: "optPartial" },
        { value: "full", labelKey: "optFull" },
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
