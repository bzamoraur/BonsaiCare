"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { TreeMultiSelect } from "@/components/tree-multi-select";
import { Button } from "@/components/ui/button";
import { TASK_TYPE_LABELS } from "@/lib/task-labels";
import { Constants, type Enums } from "@/types/database.types";

import type { SchedulePlanState } from "./actions";

const fieldBase =
  "border-input bg-background focus-visible:ring-ring rounded-md border px-3 text-base outline-none focus-visible:ring-2";
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

const initialState: SchedulePlanState = { status: "idle" };

type TreeOption = { id: string; name: string };

/**
 * Plan the same task across many trees at once: pick a care type, choose the
 * trees (all or a subset), and make it recurring or a one-off. Tree selection and
 * the type/toggles are controlled state; checked boxes submit their `treeId` via
 * FormData. Submitting creates one task per selected tree.
 */
export function ScheduleForm({
  trees,
  defaultDueOn,
  action,
}: {
  trees: TreeOption[];
  defaultDueOn: string;
  action: (prev: SchedulePlanState, formData: FormData) => Promise<SchedulePlanState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [type, setType] = useState<Enums<"task_type">>("watering");
  const [recurring, setRecurring] = useState(true);
  const [seasonal, setSeasonal] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);

  // Move focus to the confirmation on success so it's announced and the user
  // isn't stranded on <body> after the submit button unmounts.
  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
  }, [state.status]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (state.status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="border-border bg-card flex flex-col items-center gap-3 rounded-2xl border p-8 text-center outline-none"
      >
        <p className="text-balance">
          Scheduled {state.label.toLowerCase()} on {state.count}{" "}
          {state.count === 1 ? "tree" : "trees"}. 🌿
        </p>
        <Link
          href="/today"
          className="text-primary text-sm font-medium underline-offset-4 hover:underline"
        >
          See it on Today →
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-type" className="text-sm font-medium">
            What care?
          </label>
          <select
            id="plan-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as Enums<"task_type">)}
            className={inputClass}
          >
            {Constants.public.Enums.task_type.map((t) => (
              <option key={t} value={t}>
                {TASK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-title" className="text-sm font-medium">
            Title <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="plan-title"
            name="title"
            type="text"
            maxLength={120}
            placeholder={TASK_TYPE_LABELS[type]}
            className={inputClass}
          />
        </div>
      </div>

      <TreeMultiSelect
        trees={trees}
        selected={selected}
        onToggle={toggle}
        onToggleAll={(all) => setSelected(all ? new Set(trees.map((t) => t.id)) : new Set())}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="plan-due" className="text-sm font-medium">
          {recurring ? "Starting" : "Due"}
        </label>
        <input
          id="plan-due"
          name="dueOn"
          type="date"
          defaultValue={defaultDueOn}
          className={`${inputClass} sm:w-1/2`}
        />
      </div>

      <fieldset className="border-border flex flex-col gap-3 rounded-xl border p-3">
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
                <label htmlFor="plan-interval" className="text-sm font-medium">
                  Every (days)
                </label>
                <input
                  id="plan-interval"
                  name="intervalDays"
                  type="number"
                  min={1}
                  defaultValue="14"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="plan-anchor" className="text-sm font-medium">
                  Counting from
                </label>
                <select
                  id="plan-anchor"
                  name="anchor"
                  defaultValue="completion"
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
                  <label htmlFor="plan-season-start" className="text-sm font-medium">
                    From
                  </label>
                  <select
                    id="plan-season-start"
                    name="seasonStartMonth"
                    defaultValue="3"
                    className={inputClass}
                  >
                    {MONTHS.map((month, i) => (
                      <option key={month} value={i + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="plan-season-end" className="text-sm font-medium">
                    To
                  </label>
                  <select
                    id="plan-season-end"
                    name="seasonEndMonth"
                    defaultValue="10"
                    className={inputClass}
                  >
                    {MONTHS.map((month, i) => (
                      <option key={month} value={i + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || selected.size === 0}>
          {pending
            ? "Creating…"
            : selected.size === 0
              ? "Pick trees to schedule"
              : `Schedule on ${selected.size} tree${selected.size === 1 ? "" : "s"}`}
        </Button>
        {state.status === "error" ? (
          <span role="alert" className="text-destructive text-sm">
            {state.message}
          </span>
        ) : null}
      </div>

      <p className="text-muted-foreground text-xs">
        Feeding your trees? The{" "}
        <Link href="/plan/fertilize" className="underline-offset-4 hover:underline">
          fertilizing preset
        </Link>{" "}
        pre-fills the classic every-14-days, growing-season schedule.
      </p>
    </form>
  );
}
