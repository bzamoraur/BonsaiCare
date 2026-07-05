"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import { type TaskDefaults, TaskFields } from "./task-fields";
import type { TaskFormState } from "./task-types";

const initialState: TaskFormState = { status: "idle" };

type Props = {
  action: (prev: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  /** Today (server-computed ISO date) so a new task defaults to a sensible due date. */
  defaultDueOn: string;
};

export function AddTaskForm({ action, defaultDueOn }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);
  const [prevStatus, setPrevStatus] = useState(state.status);

  // Collapse when a submit newly succeeds (React's adjust-state-during-render
  // pattern — fires only on the transition, so a manual reopen stays open).
  // Remounting on reopen resets TaskFields' toggle state cleanly.
  if (state.status !== prevStatus) {
    setPrevStatus(state.status);
    if (state.status === "success") setOpen(false);
  }

  const defaults: TaskDefaults = {
    title: "",
    type: "watering",
    dueOn: defaultDueOn,
    notes: "",
    recurring: false,
    intervalDays: "14",
    anchor: "completion",
    seasonal: false,
    seasonStartMonth: "3",
    seasonEndMonth: "10",
  };

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus aria-hidden />
          Add task
        </Button>
        {state.status === "success" ? (
          <span role="status" className="text-primary text-sm">
            Added ✓
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-4"
    >
      <TaskFields defaults={defaults} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add task"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Close
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
