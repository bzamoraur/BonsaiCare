"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseCareForm } from "@/lib/care-form";
import { logActionError } from "@/lib/log-action-error";
import {
  createCareEntry,
  deleteCareEntry,
  getLatestCareEntry,
  updateCareEntry,
} from "@/server/care";

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
  const parsed = parseCareForm(treeId, formData);
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
  const parsed = parseCareForm(treeId, formData);
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

/**
 * Re-logs a tree's most recent care entry with today's date — the one-tap
 * "Repeat last" on the tree page. `treeId` is bound server-side; the entry to
 * clone is fetched server-side (never trusted from the client). `redirect()`
 * stays outside the try/catch.
 */
export async function repeatLastCareAction(treeId: string): Promise<void> {
  let ok = true;
  try {
    const last = await getLatestCareEntry(treeId);
    if (!last) throw new Error("No care to repeat.");
    await createCareEntry({
      treeId,
      type: last.type,
      occurredAt: null, // today — a fresh re-log, not a copy of the original date
      title: last.title,
      notes: last.notes,
      details: (last.details ?? {}) as Record<string, unknown>,
    });
  } catch (error) {
    logActionError("repeatLastCare", error);
    ok = false;
  }

  if (!ok) redirect(`/collection/${treeId}?error=care`);
  revalidatePath(`/collection/${treeId}`);
  revalidatePath("/collection");
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
