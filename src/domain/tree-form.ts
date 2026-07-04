import { Constants, type Enums } from "@/types/database.types";

/**
 * Validated shape for creating or editing a tree. Only `name` is required;
 * everything else is optional and normalised to `null` when omitted. Enum fields
 * are constrained to the values the database accepts (sourced from the generated
 * Constants, so this stays in lockstep with the schema).
 *
 * The add form supplies a subset (the rest arrive as null); the edit form
 * supplies the full set — both go through `parseTreeForm`.
 */
export type TreeFormInput = {
  name: string;
  speciesLabel: string | null;
  developmentStage: Enums<"development_stage"> | null;
  origin: Enums<"tree_origin"> | null;
  style: string | null;
  currentPot: string | null;
  currentSubstrate: string | null;
  acquiredOn: string | null; // ISO date, "YYYY-MM-DD"
  acquiredFrom: string | null;
  healthStatus: Enums<"health_status"> | null;
  notes: string | null;
};

export type ParseResult = { ok: true; value: TreeFormInput } | { ok: false; message: string };

export const MAX_NAME_LENGTH = 80;
export const MAX_SPECIES_LENGTH = 120;
export const MAX_STYLE_LENGTH = 60;
export const MAX_POT_LENGTH = 80;
export const MAX_SUBSTRATE_LENGTH = 80;
export const MAX_ACQUIRED_FROM_LENGTH = 120;
export const MAX_NOTES_LENGTH = 2000;

/** Sentinel distinguishing "no value given" (valid → null) from "bad value". */
const INVALID = Symbol("invalid");

function parseOptionalText(value: unknown, maxLength: number): string | null | typeof INVALID {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > maxLength) return INVALID;
  return trimmed;
}

function parseOptionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null | typeof INVALID {
  if (typeof value !== "string" || value.trim() === "") return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : INVALID;
}

function parseOptionalDate(value: unknown): string | null | typeof INVALID {
  if (typeof value !== "string" || value.trim() === "") return null;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return INVALID;
  const date = new Date(`${v}T00:00:00Z`);
  // Reject impossible dates (JS would silently roll 2024-02-31 over to March).
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== v) return INVALID;
  return v;
}

type RawTreeForm = {
  name: unknown;
  speciesLabel: unknown;
  developmentStage: unknown;
  origin: unknown;
  style: unknown;
  currentPot: unknown;
  currentSubstrate: unknown;
  acquiredOn: unknown;
  acquiredFrom: unknown;
  healthStatus: unknown;
  notes: unknown;
};

/**
 * Parses and validates raw form values into a `TreeFormInput`. Pure and
 * synchronous so it can be unit-tested without a database or FormData; the
 * server actions feed it `formData.get(...)` values.
 */
export function parseTreeForm(raw: RawTreeForm): ParseResult {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name === "") return { ok: false, message: "Please give your tree a name." };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, message: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }

  const speciesLabel = parseOptionalText(raw.speciesLabel, MAX_SPECIES_LENGTH);
  if (speciesLabel === INVALID) {
    return { ok: false, message: `Species must be ${MAX_SPECIES_LENGTH} characters or fewer.` };
  }
  const style = parseOptionalText(raw.style, MAX_STYLE_LENGTH);
  if (style === INVALID) {
    return { ok: false, message: `Style must be ${MAX_STYLE_LENGTH} characters or fewer.` };
  }
  const currentPot = parseOptionalText(raw.currentPot, MAX_POT_LENGTH);
  if (currentPot === INVALID) {
    return { ok: false, message: `Pot must be ${MAX_POT_LENGTH} characters or fewer.` };
  }
  const currentSubstrate = parseOptionalText(raw.currentSubstrate, MAX_SUBSTRATE_LENGTH);
  if (currentSubstrate === INVALID) {
    return { ok: false, message: `Substrate must be ${MAX_SUBSTRATE_LENGTH} characters or fewer.` };
  }
  const acquiredFrom = parseOptionalText(raw.acquiredFrom, MAX_ACQUIRED_FROM_LENGTH);
  if (acquiredFrom === INVALID) {
    return {
      ok: false,
      message: `"Acquired from" must be ${MAX_ACQUIRED_FROM_LENGTH} characters or fewer.`,
    };
  }
  const notes = parseOptionalText(raw.notes, MAX_NOTES_LENGTH);
  if (notes === INVALID) {
    return { ok: false, message: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.` };
  }

  const developmentStage = parseOptionalEnum(
    raw.developmentStage,
    Constants.public.Enums.development_stage,
  );
  if (developmentStage === INVALID) {
    return { ok: false, message: "Please choose a valid development stage." };
  }
  const origin = parseOptionalEnum(raw.origin, Constants.public.Enums.tree_origin);
  if (origin === INVALID) {
    return { ok: false, message: "Please choose a valid origin." };
  }
  const healthStatus = parseOptionalEnum(raw.healthStatus, Constants.public.Enums.health_status);
  if (healthStatus === INVALID) {
    return { ok: false, message: "Please choose a valid health status." };
  }

  const acquiredOn = parseOptionalDate(raw.acquiredOn);
  if (acquiredOn === INVALID) {
    return { ok: false, message: "Please enter a valid acquired date." };
  }

  return {
    ok: true,
    value: {
      name,
      speciesLabel,
      developmentStage,
      origin,
      style,
      currentPot,
      currentSubstrate,
      acquiredOn,
      acquiredFrom,
      healthStatus,
      notes,
    },
  };
}
