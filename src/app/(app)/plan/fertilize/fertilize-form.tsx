"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { TreeMultiSelect } from "@/components/tree-multi-select";
import { Button } from "@/components/ui/button";
import { monthNames } from "@/lib/months";

import type { FertilizeState } from "./actions";

const fieldBase =
  "border-input bg-background focus-visible:ring-ring rounded-md border px-3 text-base outline-none focus-visible:ring-2";
const inputClass = `${fieldBase} h-10`;

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
  const t = useTranslations("plan");
  const tType = useTranslations("taskTypes");
  const months = monthNames(useLocale());

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
        <p className="text-balance">{t("fertilizeSuccess", { count: state.count })}</p>
        <Link
          href="/today"
          className="text-primary text-sm font-medium underline-offset-4 hover:underline"
        >
          {t("seeThemOnToday")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <TreeMultiSelect
        trees={trees}
        selected={selected}
        onToggle={toggle}
        onToggleAll={(all) => setSelected(all ? new Set(trees.map((t) => t.id)) : new Set())}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fert-interval" className="text-sm font-medium">
            {t("everyDays")}
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
            {t("starting")}
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
          {t("growingSeasonOnly")}
        </label>
        <div className="grid gap-4 pl-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fert-season-start" className="text-sm font-medium">
              {t("seasonFrom")}
            </label>
            <select
              id="fert-season-start"
              name="seasonStartMonth"
              defaultValue="3"
              className={inputClass}
            >
              {months.map((month, i) => (
                <option key={month} value={i + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fert-season-end" className="text-sm font-medium">
              {t("seasonTo")}
            </label>
            <select
              id="fert-season-end"
              name="seasonEndMonth"
              defaultValue="10"
              className={inputClass}
            >
              {months.map((month, i) => (
                <option key={month} value={i + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* Stores the fertilize task's title in the creator's language. */}
      <input type="hidden" name="title" value={tType("fertilizing")} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || selected.size === 0}>
          {pending
            ? t("creating")
            : selected.size === 0
              ? t("pickTrees")
              : t("createSchedulesButton", { count: selected.size })}
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
