"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseTaskForm } from "@/domain/task-form";
import { logActionError } from "@/lib/log-action-error";
import { safeCompletedOn } from "@/lib/safe-completed-on";
import { completeTask, createTask, skipTask } from "@/server/tasks";

import type { TaskFormState } from "../collection/[id]/task-types";

/**
 * Create a task from the calendar sheet. Unlike the tree-bound createTaskAction,
 * the tree is chosen in the form — empty means a collection-level task (tree_id
 * null, the "· Collection task" rows). parseTaskForm UUID-validates the treeId and
 * createTask re-checks ownership (defense-in-depth beyond RLS). Stays on the page
 * (returns status); the sheet refreshes the calendar on success.
 */
export async function createTaskFromCalendarAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const treeIdRaw = formData.get("treeId");
  const treeId = typeof treeIdRaw === "string" && treeIdRaw !== "" ? treeIdRaw : null;

  const parsed = parseTaskForm({
    title: formData.get("title"),
    type: formData.get("type"),
    treeId,
    dueOn: formData.get("dueOn"),
    notes: formData.get("notes"),
    recurring: formData.get("recurring"),
    intervalDays: formData.get("intervalDays"),
    anchor: formData.get("anchor"),
    seasonal: formData.get("seasonal"),
    seasonStartMonth: formData.get("seasonStartMonth"),
    seasonEndMonth: formData.get("seasonEndMonth"),
  });
  if (!parsed.ok) return { status: "error", message: parsed.message };

  try {
    await createTask(parsed.value);
  } catch (error) {
    logActionError("createTaskFromCalendar", error);
    return { status: "error", message: "We couldn't add that task. Please try again." };
  }

  revalidatePath("/calendar");
  revalidatePath("/today");
  if (treeId) revalidatePath(`/collection/${treeId}`);
  return { status: "success" };
}

/**
 * Complete a task straight from the calendar agenda (taskId bound). Mirrors the
 * Today action but keeps the user on the calendar on failure. Revalidates both
 * surfaces so the completion shows wherever it's viewed.
 */
export async function completeFromCalendarAction(
  taskId: string,
  month: string,
  formData: FormData,
): Promise<void> {
  let ok = true;
  try {
    await completeTask(taskId, {
      completedOn: safeCompletedOn(formData.get("completedOn")),
      logEvent: formData.get("logEvent") === "on",
    });
  } catch (error) {
    logActionError("completeFromCalendar", error);
    ok = false;
  }

  // Keep the viewer on the month they were on (both id and month are bound
  // server-side, so neither is client-tamperable).
  if (!ok) redirect(`/calendar?m=${month}&error=task`);
  revalidatePath("/today");
  revalidatePath("/calendar");
}

/** Skip a task from the calendar agenda (taskId + viewed month bound). A recurring
 * task still advances. `completedOn` is the viewer's local day, from the skip form. */
export async function skipFromCalendarAction(
  taskId: string,
  month: string,
  formData: FormData,
): Promise<void> {
  let ok = true;
  try {
    await skipTask(taskId, safeCompletedOn(formData.get("completedOn")));
  } catch (error) {
    logActionError("skipFromCalendar", error);
    ok = false;
  }

  if (!ok) redirect(`/calendar?m=${month}&error=task`);
  revalidatePath("/today");
  revalidatePath("/calendar");
}
