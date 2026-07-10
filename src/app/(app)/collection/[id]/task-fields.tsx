"use client";

import { useState } from "react";

import { TASK_TYPE_LABELS } from "@/lib/task-labels";
import { Constants, type Enums } from "@/types/database.types";

// `:user-invalid` turns a required field's border red once the user has tried to
// submit (or edited then emptied it) — a clear "this is missing" cue on top of the
// browser's native validation, no JS. Arbitrary variant so it compiles on any Tailwind.
const fieldBase =
  "border-input bg-background focus-visible:ring-ring rounded-md border px-3 text-base outline-none focus-visible:ring-2 [&:user-invalid]:border-destructive [&:user-invalid]:ring-destructive";
const inputClass = `${fieldBase} h-10`;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type TaskDefaults = {
  title: string;
  type: Enums<"task_type">;
  dueOn: string; // "YYYY-MM-DD"
  notes: string;
  recurring: boolean;
  intervalDays: string; // e.g. "14"
  anchor: "completion" | "due";
  seasonal: boolean;
  seasonStartMonth: string; // "1".."12" or ""
  seasonEndMonth: string;
};

/**
 * Shared field set for creating/editing a task. `recurring` and `seasonal` are
 * controlled toggles that reveal the recurrence editor; everything else is
 * uncontrolled with defaults so a parent `<form>` reads it via FormData. Field
 * names match `parseTaskForm`'s expected keys. The tree is bound server-side
 * (not a field here) — this form always creates a tree-scoped task.
 */
export function TaskFields({ defaults }: { defaults: TaskDefaults }) {
  const [recurring, setRecurring] = useState(defaults.recurring);
  const [seasonal, setSeasonal] = useState(defaults.seasonal);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-title" className="text-sm font-medium">
            Task
          </label>
          <input
            id="task-title"
            name="title"
            type="text"
            required
            maxLength={120}
            placeholder="Repot the juniper"
            defaultValue={defaults.title}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-type" className="text-sm font-medium">
            Type
          </label>
          <select id="task-type" name="type" defaultValue={defaults.type} className={inputClass}>
            {Constants.public.Enums.task_type.map((t) => (
              <option key={t} value={t}>
                {TASK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-due" className="text-sm font-medium">
          Due
        </label>
        <input
          id="task-due"
          name="dueOn"
          type="date"
          required
          defaultValue={defaults.dueOn}
          className={`${inputClass} sm:w-1/2`}
        />
      </div>

      <div className="border-border flex flex-col gap-3 rounded-xl border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="recurring"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="size-4"
          />
          Repeats
        </label>

        {recurring ? (
          <div className="flex flex-col gap-3 pl-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-interval" className="text-sm font-medium">
                  Every (days)
                </label>
                <input
                  id="task-interval"
                  name="intervalDays"
                  type="number"
                  min={1}
                  defaultValue={defaults.intervalDays}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-anchor" className="text-sm font-medium">
                  Counting from
                </label>
                <select
                  id="task-anchor"
                  name="anchor"
                  defaultValue={defaults.anchor}
                  className={inputClass}
                >
                  <option value="completion">when I do it</option>
                  <option value="due">the due date</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="seasonal"
                checked={seasonal}
                onChange={(e) => setSeasonal(e.target.checked)}
                className="size-4"
              />
              Only during a season
            </label>

            {seasonal ? (
              <div className="grid gap-4 pl-6 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-season-start" className="text-sm font-medium">
                    From
                  </label>
                  <select
                    id="task-season-start"
                    name="seasonStartMonth"
                    defaultValue={defaults.seasonStartMonth}
                    className={inputClass}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-season-end" className="text-sm font-medium">
                    To
                  </label>
                  <select
                    id="task-season-end"
                    name="seasonEndMonth"
                    defaultValue={defaults.seasonEndMonth}
                    className={inputClass}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-notes" className="text-sm font-medium">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="task-notes"
          name="notes"
          rows={2}
          maxLength={2000}
          defaultValue={defaults.notes}
          placeholder="Anything worth remembering."
          className={`${fieldBase} resize-y py-2`}
        />
      </div>
    </>
  );
}
