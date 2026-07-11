"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { parseTaskForm } from "@/domain/task-form";
import { logActionError } from "@/lib/log-action-error";
import { createTasksForTrees } from "@/server/tasks";

export type FertilizeState =
  { status: "idle" } | { status: "success"; count: number } | { status: "error"; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Creates one fertilizing task per selected tree from a shared schedule. The
 * schedule is validated once through `parseTaskForm` (identical across trees),
 * then bulk-inserted. Anchored to completion — the bonsai norm ([ADR-0006](../../../../../docs/decisions/0006-task-scheduling-and-recurrence.md)).
 */
export async function createFertilizePlanAction(
  _prev: FertilizeState,
  formData: FormData,
): Promise<FertilizeState> {
  const t = await getTranslations("plan");
  const tType = await getTranslations("taskTypes");
  const treeIds = formData
    .getAll("treeId")
    .filter((v): v is string => typeof v === "string" && UUID_RE.test(v));
  if (treeIds.length === 0) {
    return { status: "error", message: t("errPickTree") };
  }

  const parsed = parseTaskForm({
    title: (formData.get("title") as string) || tType("fertilizing"),
    type: "fertilizing",
    treeId: treeIds[0],
    dueOn: formData.get("dueOn"),
    notes: null,
    recurring: "on",
    intervalDays: formData.get("intervalDays"),
    anchor: "completion",
    seasonal: formData.get("seasonal"),
    seasonStartMonth: formData.get("seasonStartMonth"),
    seasonEndMonth: formData.get("seasonEndMonth"),
  });
  if (!parsed.ok) return { status: "error", message: parsed.message };

  try {
    const count = await createTasksForTrees(treeIds, {
      title: parsed.value.title,
      type: parsed.value.type,
      dueOn: parsed.value.dueOn,
      notes: parsed.value.notes,
      recurrence: parsed.value.recurrence,
    });
    revalidatePath("/today");
    revalidatePath("/calendar");
    return { status: "success", count };
  } catch (error) {
    logActionError("createFertilizePlan", error);
    return { status: "error", message: t("errCreateFailed") };
  }
}
