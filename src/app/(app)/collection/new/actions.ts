"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseTreeForm } from "@/domain/tree-form";
import { logActionError } from "@/lib/log-action-error";
import { createTree } from "@/server/trees";

import type { NewTreeFormState } from "./types";

/**
 * Creates a tree from the add form, then redirects to the new tree's detail page —
 * its empty state invites the first photo/care log, so capture flows straight on
 * (S09.5). The add form supplies a subset of fields (the rest parse to null);
 * validation lives in the pure `parseTreeForm`. RLS + the explicit owner_id in
 * `createTree` enforce ownership. `redirect()` is called outside the try/catch so
 * its control flow isn't swallowed as an error.
 */
export async function createTreeAction(
  _prev: NewTreeFormState,
  formData: FormData,
): Promise<NewTreeFormState> {
  const parsed = parseTreeForm({
    name: formData.get("name"),
    speciesLabel: formData.get("species_label"),
    developmentStage: formData.get("development_stage"),
    healthStatus: formData.get("health_status"),
    origin: null,
    style: null,
    currentPot: null,
    currentSubstrate: null,
    acquiredOn: null,
    acquiredFrom: null,
    notes: null,
  });

  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }

  let treeId: string;
  try {
    ({ id: treeId } = await createTree(parsed.value));
  } catch (error) {
    logActionError("createTree", error);
    return { status: "error", message: "We couldn't save your tree. Please try again." };
  }

  revalidatePath("/collection");
  redirect(`/collection/${treeId}`);
}
