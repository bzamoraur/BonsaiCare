"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import type { FertilizeState } from "./actions";

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

const initialState: FertilizeState = { status: "idle" };

type TreeOption = { id: string; name: string };

/**
 * The fertilization-template form: multi-select trees, pre-filled with the classic
 * "every 14 days, Mar–Oct, from when I do it" schedule (all editable). Submitting
 * creates one task per selected tree. Tree selection is controlled state so
 * "Select all" works; checked boxes still submit their `treeId` via FormData.
 */
export function FertilizeForm({
  trees,
  defaultDueOn,
  action,
}: {
  trees: TreeOption[];
  defaultDueOn: string;
  action: (prev: FertilizeState, formData: FormData) => Promise<FertilizeState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const successRef = useRef<HTMLDivElement>(null);

  // Move focus to the confirmation on success so it's announced and the user
  // isn't stranded on <body> after the submit button unmounts.
  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
  }, [state.status]);

  const allSelected = trees.length > 0 && selected.size === trees.length;

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
          Created {state.count} fertilizing {state.count === 1 ? "schedule" : "schedules"}. 🌿
        </p>
        <Link
          href="/today"
          className="text-primary text-sm font-medium underline-offset-4 hover:underline"
        >
          See them on Today →
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Which trees?</legend>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium" aria-hidden="true">
            Which trees?
          </span>
          <button
            type="button"
            onClick={() => setSelected(allSelected ? new Set() : new Set(trees.map((t) => t.id)))}
            className="text-muted-foreground hover:text-foreground text-xs font-medium underline-offset-4 hover:underline"
          >
            {allSelected ? "Clear" : "Select all"}
          </button>
        </div>
        <div className="border-border flex max-h-64 flex-col gap-0.5 overflow-y-auto rounded-xl border p-2">
          {trees.map((tree) => (
            <label
              key={tree.id}
              className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                name="treeId"
                value={tree.id}
                checked={selected.has(tree.id)}
                onChange={() => toggle(tree.id)}
                className="size-4"
              />
              {tree.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fert-interval" className="text-sm font-medium">
            Every (days)
          </label>
          <input
            id="fert-interval"
            name="intervalDays"
            type="number"
            min={1}
            defaultValue="14"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fert-start" className="text-sm font-medium">
            Starting
          </label>
          <input
            id="fert-start"
            name="dueOn"
            type="date"
            defaultValue={defaultDueOn}
            className={inputClass}
          />
        </div>
      </div>

      <fieldset className="border-border flex flex-col gap-3 rounded-xl border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="seasonal" defaultChecked className="size-4" />
          Only during the growing season
        </label>
        <div className="grid gap-4 pl-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fert-season-start" className="text-sm font-medium">
              From
            </label>
            <select
              id="fert-season-start"
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
            <label htmlFor="fert-season-end" className="text-sm font-medium">
              To
            </label>
            <select
              id="fert-season-end"
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
      </fieldset>

      <input type="hidden" name="title" value="Fertilize" />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || selected.size === 0}>
          {pending
            ? "Creating…"
            : selected.size === 0
              ? "Pick trees to schedule"
              : `Create ${selected.size} schedule${selected.size === 1 ? "" : "s"}`}
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
