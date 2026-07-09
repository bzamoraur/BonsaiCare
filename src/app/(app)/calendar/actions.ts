"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActionError } from "@/lib/log-action-error";
import { safeCompletedOn } from "@/lib/safe-completed-on";
import { completeTask, skipTask } from "@/server/tasks";

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
