"use server";

import { revalidatePath } from "next/cache";

import { parseCareEntry } from "@/domain/care";
import { ALL_DETAIL_FIELD_NAMES } from "@/lib/care-fields";
import { createCareEntry } from "@/server/care";

import type { LogCareState } from "./care-types";

/**
 * Logs a care entry against a tree. `treeId` is bound server-side (`.bind`).
 * Validation lives in the pure `parseCareEntry`; the per-type Zod schema rejects
 * unknown/invalid `details`. On success the page revalidates so the new entry
 * shows in the tree's care log.
 */
export async function logCareAction(
  treeId: string,
  _prev: LogCareState,
  formData: FormData,
): Promise<LogCareState> {
  // Collect only the known detail field names; the per-type schema decides which
  // are valid for the chosen type (and rejects the rest).
  const details: Record<string, string> = {};
  for (const name of ALL_DETAIL_FIELD_NAMES) {
    const value = formData.get(name);
    if (typeof value === "string" && value.trim() !== "") details[name] = value;
  }

  const parsed = parseCareEntry({
    treeId,
    type: formData.get("type"),
    occurredAt: formData.get("occurred_at"),
    title: formData.get("title"),
    notes: formData.get("notes"),
    details,
  });
  if (!parsed.ok) return { status: "error", message: parsed.message };

  try {
    await createCareEntry(parsed.value);
  } catch {
    return { status: "error", message: "We couldn't log that. Please try again." };
  }

  revalidatePath(`/collection/${treeId}`);
  return { status: "success" };
}
