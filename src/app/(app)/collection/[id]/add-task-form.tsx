"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

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
  const toggleRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const prevOpen = useRef(open);

  // Collapse when a submit newly succeeds (React's adjust-state-during-render
  // pattern — fires only on the transition, so a manual reopen stays open).
  // Remounting on reopen resets TaskFields' toggle state cleanly.
  if (state.status !== prevStatus) {
    setPrevStatus(state.status);
    if (state.status === "success") setOpen(false);
  }

  // Keep focus sane across the open/collapse transition: into the form's first
  // field on open, back to the "Add task" trigger on collapse (never to <body>).
  useEffect(() => {
    if (open && !prevOpen.current) {
      formRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    } else if (!open && prevOpen.current) {
      toggleRef.current?.focus();
    }
    prevOpen.current = open;
  }, [open]);

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

  return (
    <div className="flex flex-col gap-3">
      {/* Persistent polite region so "added" is reliably announced across the
          form→collapsed swap (a region mounted with its content often isn't). */}
      <span role="status" aria-live="polite" className="sr-only">
        {state.status === "success" ? "Task added" : ""}
      </span>

      {open ? (
        <form
          ref={formRef}
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
      ) : (
        <div className="flex items-center gap-3">
          <Button
            ref={toggleRef}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOpen(true)}
          >
            <Plus aria-hidden />
            Add task
          </Button>
          {state.status === "success" ? (
            <span className="text-primary text-sm" aria-hidden="true">
              Added ✓
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
