"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseTagInput } from "@/domain/tags";
import { parseTreeForm } from "@/domain/tree-form";
import { logActionError } from "@/lib/log-action-error";
import { findOrCreateLocation } from "@/server/locations";
import { syncTreeTags } from "@/server/tags";
import { archiveTree, updateTree } from "@/server/trees";

import type { TreeFormState } from "./types";

/** Pulls the full tree form out of FormData (both actions share the field names). */
function rawTreeForm(formData: FormData) {
  return {
    name: formData.get("name"),
    speciesLabel: formData.get("species_label"),
    developmentStage: formData.get("development_stage"),
    origin: formData.get("origin"),
    style: formData.get("style"),
    currentPot: formData.get("current_pot"),
    currentSubstrate: formData.get("current_substrate"),
    acquiredOn: formData.get("acquired_on"),
    acquiredFrom: formData.get("acquired_from"),
    healthStatus: formData.get("health_status"),
    notes: formData.get("notes"),
  };
}

/**
 * Saves edits to a tree, then returns to its detail screen. `id` is bound by the
 * server (`.bind(null, id)`) so it can't be tampered with from the client; RLS +
 * the id filter scope the write to the owner. `redirect()` stays outside the
 * try/catch so its control flow isn't swallowed.
 */
export async function updateTreeAction(
  id: string,
  _prev: TreeFormState,
  formData: FormData,
): Promise<TreeFormState> {
  const parsed = parseTreeForm(rawTreeForm(formData));
  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }

  const locationName = formData.get("location");
  const tagNames = parseTagInput(formData.get("tags"));

  try {
    const locationId = await findOrCreateLocation(
      typeof locationName === "string" ? locationName : "",
    );
    await updateTree(id, parsed.value, locationId);
    await syncTreeTags(id, tagNames);
  } catch (error) {
    logActionError("updateTree", error);
    return { status: "error", message: "We couldn't save your changes. Please try again." };
  }

  revalidatePath("/collection");
  revalidatePath(`/collection/${id}`);
  redirect(`/collection/${id}`);
}

/** Archives a tree (soft delete) and returns to the collection. Used as a form
 * action with `id` pre-bound, so it needs no FormData argument. */
export async function archiveTreeAction(id: string): Promise<void> {
  let archived = true;
  try {
    await archiveTree(id);
  } catch (error) {
    logActionError("archiveTree", error);
    archived = false;
  }

  if (!archived) {
    redirect(`/collection/${id}?error=archive`);
  }

  revalidatePath("/collection");
  redirect("/collection");
}
