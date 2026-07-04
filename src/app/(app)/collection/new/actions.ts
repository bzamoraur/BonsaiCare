"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseNewTree } from "@/domain/tree-form";
import { createTree } from "@/server/trees";

import type { NewTreeFormState } from "./types";

/**
 * Creates a tree from the add form, then redirects to the collection. Validation
 * lives in the pure `parseNewTree`; RLS + the explicit owner_id in `createTree`
 * enforce ownership. `redirect()` is called outside the try/catch so its control
 * flow isn't swallowed as an error.
 */
export async function createTreeAction(
  _prev: NewTreeFormState,
  formData: FormData,
): Promise<NewTreeFormState> {
  const parsed = parseNewTree({
    name: formData.get("name"),
    speciesLabel: formData.get("species_label"),
    developmentStage: formData.get("development_stage"),
    healthStatus: formData.get("health_status"),
  });

  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }

  try {
    await createTree(parsed.value);
  } catch {
    return { status: "error", message: "We couldn't save your tree. Please try again." };
  }

  revalidatePath("/collection");
  redirect("/collection");
}
