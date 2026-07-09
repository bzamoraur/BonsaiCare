"use server";

import { revalidatePath } from "next/cache";

import { parseCareForm } from "@/lib/care-form";
import { logActionError } from "@/lib/log-action-error";
import { createClient } from "@/lib/supabase/server";
import { createCareEntry } from "@/server/care";
import { listQuickAddTrees, type QuickAddTree } from "@/server/trees";

import type { LogCareState } from "../collection/[id]/care-types";

export type QuickAddData = { trees: QuickAddTree[]; userId: string | null };

/**
 * Data for the global quick-add sheet: the owner's non-archived trees + their user
 * id (the photo storage path is prefixed with it). Fetched lazily when the sheet
 * opens, so the list is always fresh and no query runs on pages where the sheet is
 * never used.
 */
export async function getQuickAddData(): Promise<QuickAddData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const trees = await listQuickAddTrees();
  return { trees, userId: user?.id ?? null };
}

/**
 * Logs a care entry from the quick-add sheet. Unlike `logCareAction`, the tree is
 * chosen in the form (read here, then ownership-checked by `createCareEntry` via
 * RLS). Revalidates the day/collection/calendar surfaces so the new entry shows
 * wherever the sheet was opened.
 */
export async function quickLogCareAction(
  _prev: LogCareState,
  formData: FormData,
): Promise<LogCareState> {
  const treeId = formData.get("treeId");
  if (typeof treeId !== "string" || treeId === "") {
    return { status: "error", message: "Pick a tree first." };
  }

  const parsed = parseCareForm(treeId, formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  try {
    await createCareEntry(parsed.value);
  } catch (error) {
    logActionError("quickLogCare", error);
    return { status: "error", message: "We couldn't log that. Please try again." };
  }

  revalidatePath("/today");
  revalidatePath("/collection");
  revalidatePath("/calendar");
  revalidatePath(`/collection/${treeId}`);
  return { status: "success" };
}
