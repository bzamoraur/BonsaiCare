"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { type TaskDefaults, TaskFields } from "./task-fields";
import type { TaskFormState } from "./task-types";

const initialState: TaskFormState = { status: "idle" };

/** Edit form for an existing task. On success the action redirects back to the
 * tree, so there's only an error state to surface here. */
export function EditTaskForm({
  action,
  defaults,
}: {
  action: (prev: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  defaults: TaskDefaults;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <TaskFields defaults={defaults} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state.status === "error" ? (
          <span role="alert" className="text-destructive text-sm">
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
