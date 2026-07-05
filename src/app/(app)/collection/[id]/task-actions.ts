"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseTaskForm } from "@/domain/task-form";
import { createTask, deleteTask, updateTask } from "@/server/tasks";

import type { TaskFormState } from "./task-types";

/** Builds the raw task input from a form. `treeId` is bound server-side (this
 * form always creates a tree-scoped task), so it's never trusted from the client. */
function parseFromForm(treeId: string, formData: FormData) {
  return parseTaskForm({
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
}

/** Adds a task to a tree. `treeId` is bound server-side; on success the page
 * revalidates so the task appears in the care plan. */
export async function createTaskAction(
  treeId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const parsed = parseFromForm(treeId, formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  try {
    await createTask(parsed.value);
  } catch {
    return { status: "error", message: "We couldn't add that task. Please try again." };
  }

  revalidatePath(`/collection/${treeId}`);
  return { status: "success" };
}

/** Saves edits to a task, then returns to the tree detail. `treeId`/`taskId` are
 * bound server-side; RLS + the id filter scope the write to the owner. */
export async function updateTaskAction(
  treeId: string,
  taskId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const parsed = parseFromForm(treeId, formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  try {
    await updateTask(taskId, parsed.value);
  } catch {
    return { status: "error", message: "We couldn't save your changes. Please try again." };
  }

  revalidatePath(`/collection/${treeId}`);
  redirect(`/collection/${treeId}`);
}

/** Form action (task + tree bound server-side): delete a task. */
export async function deleteTaskAction(taskId: string, treeId: string): Promise<void> {
  let deleted = true;
  try {
    await deleteTask(taskId);
  } catch {
    deleted = false;
  }

  if (!deleted) {
    redirect(`/collection/${treeId}?error=task`);
  }

  revalidatePath(`/collection/${treeId}`);
}
