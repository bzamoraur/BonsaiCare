"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseCareEntry } from "@/domain/care";
import { ALL_DETAIL_FIELD_NAMES } from "@/lib/care-fields";
import { logActionError } from "@/lib/log-action-error";
import { createCareEntry, deleteCareEntry, updateCareEntry } from "@/server/care";

import type { LogCareState } from "./care-types";

/** Collects only the known detail field names; the per-type schema decides which
 * are valid for the chosen type (and rejects the rest). */
function collectDetails(formData: FormData): Record<string, string> {
  const details: Record<string, string> = {};
  for (const name of ALL_DETAIL_FIELD_NAMES) {
    const value = formData.get(name);
    if (typeof value === "string" && value.trim() !== "") details[name] = value;
  }
  return details;
}

function parseFromForm(treeId: string, formData: FormData) {
  return parseCareEntry({
    treeId,
    type: formData.get("type"),
    occurredAt: formData.get("occurred_at"),
    title: formData.get("title"),
    notes: formData.get("notes"),
    details: collectDetails(formData),
  });
}

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
  const parsed = parseFromForm(treeId, formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  try {
    await createCareEntry(parsed.value);
  } catch (error) {
    logActionError("createCareEntry", error);
    return { status: "error", message: "We couldn't log that. Please try again." };
  }

  revalidatePath(`/collection/${treeId}`);
  return { status: "success" };
}

/**
 * Saves edits to a care entry, then returns to the tree detail. `treeId` and
 * `entryId` are bound server-side; RLS + the id filter scope the write to the
 * owner. `redirect()` stays outside the try/catch.
 */
export async function updateCareAction(
  treeId: string,
  entryId: string,
  _prev: LogCareState,
  formData: FormData,
): Promise<LogCareState> {
  const parsed = parseFromForm(treeId, formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  try {
    await updateCareEntry(entryId, parsed.value);
  } catch (error) {
    logActionError("updateCareEntry", error);
    return { status: "error", message: "We couldn't save your changes. Please try again." };
  }

  revalidatePath(`/collection/${treeId}`);
  redirect(`/collection/${treeId}`);
}

/** Form action (entry + tree bound server-side): delete a care entry. */
export async function deleteCareAction(entryId: string, treeId: string): Promise<void> {
  let deleted = true;
  try {
    await deleteCareEntry(entryId);
  } catch (error) {
    logActionError("deleteCareEntry", error);
    deleted = false;
  }

  if (!deleted) {
    redirect(`/collection/${treeId}?error=care`);
  }

  revalidatePath(`/collection/${treeId}`);
}
