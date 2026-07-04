import { Constants, type Enums } from "@/types/database.types";

/**
 * Validated shape for creating a tree. Only `name` is required; everything else
 * is optional and normalised to `null` when omitted. Enum fields are constrained
 * to the values the database accepts (sourced from the generated Constants, so
 * this stays in lockstep with the schema).
 */
export type NewTreeInput = {
  name: string;
  speciesLabel: string | null;
  developmentStage: Enums<"development_stage"> | null;
  healthStatus: Enums<"health_status"> | null;
};

export type ParseResult = { ok: true; value: NewTreeInput } | { ok: false; message: string };

export const MAX_NAME_LENGTH = 80;
export const MAX_SPECIES_LENGTH = 120;

/** Sentinel distinguishing "no value given" (valid → null) from "bad value". */
const INVALID = Symbol("invalid");

function parseOptionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null | typeof INVALID {
  if (typeof value !== "string" || value.trim() === "") return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : INVALID;
}

/**
 * Parses and validates raw form values into a `NewTreeInput`. Pure and
 * synchronous so it can be unit-tested without a database or FormData; the
 * server action feeds it `formData.get(...)` values.
 */
export function parseNewTree(raw: {
  name: unknown;
  speciesLabel: unknown;
  developmentStage: unknown;
  healthStatus: unknown;
}): ParseResult {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name === "") return { ok: false, message: "Please give your tree a name." };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, message: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }

  const speciesTrimmed = typeof raw.speciesLabel === "string" ? raw.speciesLabel.trim() : "";
  if (speciesTrimmed.length > MAX_SPECIES_LENGTH) {
    return { ok: false, message: `Species must be ${MAX_SPECIES_LENGTH} characters or fewer.` };
  }
  const speciesLabel = speciesTrimmed === "" ? null : speciesTrimmed;

  const developmentStage = parseOptionalEnum(
    raw.developmentStage,
    Constants.public.Enums.development_stage,
  );
  if (developmentStage === INVALID) {
    return { ok: false, message: "Please choose a valid development stage." };
  }

  const healthStatus = parseOptionalEnum(raw.healthStatus, Constants.public.Enums.health_status);
  if (healthStatus === INVALID) {
    return { ok: false, message: "Please choose a valid health status." };
  }

  return { ok: true, value: { name, speciesLabel, developmentStage, healthStatus } };
}
