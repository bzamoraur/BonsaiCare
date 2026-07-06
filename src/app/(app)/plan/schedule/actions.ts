"use server";

import { revalidatePath } from "next/cache";

import { parseTaskForm } from "@/domain/task-form";
import { logActionError } from "@/lib/log-action-error";
import { TASK_TYPE_LABELS } from "@/lib/task-labels";
import { createTasksForTrees } from "@/server/tasks";
import { Constants, type Enums } from "@/types/database.types";

export type SchedulePlanState =
  | { status: "idle" }
  | { status: "success"; count: number; label: string }
  | { status: "error"; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TASK_TYPES: readonly string[] = Constants.public.Enums.task_type;

/**
 * Creates the same task across every selected tree — any care type, recurring or
 * one-off. Validated once through `parseTaskForm` (identical across trees), then
 * bulk-inserted. Generalizes the fertilizing template to arbitrary actions.
 */
export async function createSchedulePlanAction(
  _prev: SchedulePlanState,
  formData: FormData,
): Promise<SchedulePlanState> {
  const treeIds = formData
    .getAll("treeId")
    .filter((v): v is string => typeof v === "string" && UUID_RE.test(v));
  if (treeIds.length === 0) {
    return { status: "error", message: "Pick at least one tree." };
  }

  const typeRaw = formData.get("type");
  if (typeof typeRaw !== "string" || !TASK_TYPES.includes(typeRaw)) {
    return { status: "error", message: "Choose a valid type of care." };
  }
  const type = typeRaw as Enums<"task_type">;

  const titleRaw = formData.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim() : TASK_TYPE_LABELS[type];

  const parsed = parseTaskForm({
    title,
    type,
    treeId: treeIds[0],
    dueOn: formData.get("dueOn"),
    notes: null,
    recurring: formData.get("recurring"),
    intervalDays: formData.get("intervalDays"),
    anchor: (formData.get("anchor") as string) || "completion",
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
    return { status: "success", count, label: TASK_TYPE_LABELS[type] };
  } catch (error) {
    logActionError("createSchedulePlan", error);
    return { status: "error", message: "We couldn't create that plan. Please try again." };
  }
}
