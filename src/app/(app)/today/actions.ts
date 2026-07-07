"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActionError } from "@/lib/log-action-error";
import { completeTask, skipTask } from "@/server/tasks";

/** A trusted "YYYY-MM-DD" completion date (real calendar validity), else today. */
function safeCompletedOn(raw: FormDataEntryValue | null): string {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00Z`);
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === raw) return raw;
  }
  return new Date().toISOString().slice(0, 10);
}

/** Complete a task from the dashboard (taskId bound). Revalidates Today + Calendar. */
export async function completeFromTodayAction(taskId: string, formData: FormData): Promise<void> {
  let ok = true;
  try {
    await completeTask(taskId, {
      completedOn: safeCompletedOn(formData.get("completedOn")),
      logEvent: formData.get("logEvent") === "on",
    });
  } catch (error) {
    logActionError("completeFromToday", error);
    ok = false;
  }

  if (!ok) redirect("/today?error=task");
  revalidatePath("/today");
  revalidatePath("/calendar");
}

/** Skip a task from the dashboard (taskId bound). A recurring task still advances.
 * `completedOn` is the viewer's local day, submitted by the skip form. */
export async function skipFromTodayAction(taskId: string, formData: FormData): Promise<void> {
  let ok = true;
  try {
    await skipTask(taskId, safeCompletedOn(formData.get("completedOn")));
  } catch (error) {
    logActionError("skipFromToday", error);
    ok = false;
  }

  if (!ok) redirect("/today?error=task");
  revalidatePath("/today");
  revalidatePath("/calendar");
}
