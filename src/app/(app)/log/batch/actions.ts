"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { parseCareForm } from "@/lib/care-form";
import { logActionError } from "@/lib/log-action-error";
import { createCareEntriesForTrees } from "@/server/care";

export type BatchLogState =
  { status: "idle" } | { status: "success"; count: number } | { status: "error"; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Logs the same care event across every selected tree in one action. The trees
 * come from the shared `TreeMultiSelect` (`treeId` checkboxes); the care fields
 * are validated once (identical across trees) and bulk-inserted. Trees the caller
 * doesn't own are dropped server-side.
 */
export async function logBatchCareAction(
  _prev: BatchLogState,
  formData: FormData,
): Promise<BatchLogState> {
  const t = await getTranslations("log");
  const treeIds = formData
    .getAll("treeId")
    .filter((v): v is string => typeof v === "string" && UUID_RE.test(v));
  if (treeIds.length === 0) {
    return { status: "error", message: t("errPickTree") };
  }

  // Validate the shared fields once, using any selected id as the representative.
  const parsed = parseCareForm(treeIds[0], formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  try {
    const count = await createCareEntriesForTrees(treeIds, {
      type: parsed.value.type,
      occurredAt: parsed.value.occurredAt,
      title: parsed.value.title,
      notes: parsed.value.notes,
      details: parsed.value.details,
    });
    // Care events show on each tree's timeline — refresh the ones we touched.
    for (const id of treeIds) revalidatePath(`/collection/${id}`);
    revalidatePath("/collection");
    return { status: "success", count };
  } catch (error) {
    logActionError("logBatchCare", error);
    return { status: "error", message: t("errLogFailed") };
  }
}
