import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { parseRecurrence } from "@/domain/scheduling";
import { getTask, type Task } from "@/server/tasks";
import { getTree } from "@/server/trees";

import { ConfirmDeleteButton } from "../../confirm-delete-button";
import { EditTaskForm } from "../../edit-task-form";
import type { TaskDefaults } from "../../task-fields";
import { deleteTaskAction, updateTaskAction } from "../../task-actions";

type Params = { id: string; taskId: string };

/** Fill the form defaults from a stored task, expanding its recurrence JSONB. */
function taskToDefaults(task: Task): TaskDefaults {
  const parsed = parseRecurrence(task.recurrence);
  const r = parsed.ok ? parsed.value : null;
  return {
    title: task.title,
    type: task.type,
    dueOn: task.due_on,
    notes: task.notes ?? "",
    recurring: r !== null,
    intervalDays: r ? String(r.interval_days) : "14",
    anchor: r?.anchor ?? "completion",
    seasonal: Boolean(r?.season_start_month),
    seasonStartMonth: r?.season_start_month ? String(r.season_start_month) : "3",
    seasonEndMonth: r?.season_end_month ? String(r.season_end_month) : "10",
  };
}

export async function generateMetadata() {
  return { title: "Edit task" };
}

export default async function EditTaskPage({ params }: { params: Promise<Params> }) {
  const { id, taskId } = await params;
  const [tree, task] = await Promise.all([getTree(id), getTask(taskId)]);
  if (!tree || !task || task.tree_id !== id) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <Link
        href={`/collection/${id}`}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {tree.name}
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Edit task</h1>
      </header>

      <EditTaskForm
        action={updateTaskAction.bind(null, id, taskId)}
        defaults={taskToDefaults(task)}
      />

      <hr className="border-border" />

      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-sm">Delete this task</span>
        <ConfirmDeleteButton
          action={deleteTaskAction.bind(null, taskId, id)}
          srLabel="Delete task"
        />
      </div>
    </main>
  );
}
