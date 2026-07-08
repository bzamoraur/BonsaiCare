import { z } from "zod";

import { Constants, type Enums } from "@/types/database.types";

/**
 * Validation for care-log entries. Per
 * [ADR-0011](../../docs/decisions/0011-server-actions-and-validation.md), the
 * type-specific `details` JSONB is validated by a Zod schema per
 * `care_event_type`. Pure and framework-free so it runs at the Server Action
 * boundary and is unit-tested without a database. Every detail field is optional
 * — structure must never block a <10s capture.
 */

export type CareEventType = Enums<"care_event_type">;

/** The most recent `occurred_on` ("YYYY-MM-DD") per care type, for one tree. */
export type CareRecency = Partial<Record<CareEventType, string>>;

/** Trimmed, length-capped optional text; a blank value becomes absent (kept out
 * of the JSONB payload). */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional()
    .transform((v) => (v ? v : undefined));

const noDetails = z.strictObject({});

/**
 * One Zod schema per `care_event_type` for the `details` payload. `satisfies`
 * makes this exhaustive — a new enum value fails the build until it gets a
 * schema. `strictObject` rejects unknown keys so junk can't reach the DB.
 */
const DETAILS_SCHEMAS = {
  watering: z.strictObject({ amount: optionalText(60, "Amount") }),
  fertilizing: z.strictObject({
    product: optionalText(120, "Product"),
    npk: optionalText(20, "NPK"),
    amount: optionalText(60, "Amount"),
  }),
  pruning: z.strictObject({
    intensity: z
      .enum(["light", "moderate", "hard"], "Choose a valid pruning intensity.")
      .optional(),
  }),
  wiring: z.strictObject({
    branches: optionalText(200, "Branches"),
    gauge: optionalText(40, "Wire gauge"),
  }),
  repotting: z.strictObject({
    new_pot: optionalText(120, "New pot"),
    soil_mix: optionalText(160, "Soil mix"),
    root_work: optionalText(200, "Root work"),
  }),
  pest_treatment: z.strictObject({
    issue: optionalText(120, "Issue"),
    treatment: optionalText(160, "Treatment"),
  }),
  styling: noDetails,
  defoliation: z.strictObject({
    extent: z.enum(["partial", "full"], "Choose a valid defoliation extent.").optional(),
  }),
  observation: noDetails,
  note: noDetails,
} satisfies Record<CareEventType, z.ZodType>;

const CARE_EVENT_TYPES = [...Constants.public.Enums.care_event_type] as [
  CareEventType,
  ...CareEventType[],
];

const CoreSchema = z.strictObject({
  treeId: z.uuid("Please choose a tree."),
  type: z.enum(CARE_EVENT_TYPES, "Please choose a valid care type."),
  occurredAt: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine(
      (v) => v === undefined || !Number.isNaN(Date.parse(v)),
      "Please enter a valid date and time.",
    ),
  title: optionalText(120, "Title"),
  notes: optionalText(2000, "Notes"),
});

export type CareEntryInput = {
  treeId: string;
  type: CareEventType;
  occurredAt: string | null;
  title: string | null;
  notes: string | null;
  details: Record<string, unknown>;
};

export type ParseCareResult = { ok: true; value: CareEntryInput } | { ok: false; message: string };

export type RawCareEntry = {
  treeId: unknown;
  type: unknown;
  occurredAt?: unknown;
  title?: unknown;
  notes?: unknown;
  details?: unknown;
};

function firstMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "That care entry isn't valid.";
}

/**
 * Validates raw care-entry input: core fields first, then the `details` payload
 * against the schema for its `type`. Returns a discriminated result mirroring
 * `parseTreeForm`.
 */
export function parseCareEntry(raw: RawCareEntry): ParseCareResult {
  const core = CoreSchema.safeParse({
    treeId: raw.treeId,
    type: raw.type,
    occurredAt: raw.occurredAt,
    title: raw.title,
    notes: raw.notes,
  });
  if (!core.success) return { ok: false, message: firstMessage(core.error) };

  const detailsSchema = DETAILS_SCHEMAS[core.data.type];
  const details = detailsSchema.safeParse(raw.details ?? {});
  if (!details.success) return { ok: false, message: firstMessage(details.error) };

  return {
    ok: true,
    value: {
      treeId: core.data.treeId,
      type: core.data.type,
      occurredAt: core.data.occurredAt ?? null,
      title: core.data.title ?? null,
      notes: core.data.notes ?? null,
      details: details.data as Record<string, unknown>,
    },
  };
}
