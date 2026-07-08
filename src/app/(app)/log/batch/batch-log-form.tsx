"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { type CareDefaults, CareEntryFields } from "@/components/care-entry-fields";
import { TreeMultiSelect, type TreeOption } from "@/components/tree-multi-select";
import { Button } from "@/components/ui/button";

import type { BatchLogState } from "./actions";

const initialState: BatchLogState = { status: "idle" };

// A blank date defers to the server's current_date, matching single-tree logging.
const CARE_DEFAULTS: CareDefaults = {
  type: "watering",
  occurredAtDate: "",
  title: "",
  notes: "",
  details: {},
};

/**
 * Log the same care event across many trees at once ("watered 12 trees"). Reuses
 * the shared tree picker and care-entry fields; the checked `treeId` boxes and the
 * care fields submit together, and one action writes an entry per selected tree.
 */
export function BatchLogForm({
  trees,
  action,
}: {
  trees: TreeOption[];
  action: (prev: BatchLogState, formData: FormData) => Promise<BatchLogState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const successRef = useRef<HTMLDivElement>(null);

  // Move focus to the confirmation on success so it's announced and the user
  // isn't stranded after the submit button unmounts.
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
          Logged for {state.count} {state.count === 1 ? "tree" : "trees"}. 🌿
        </p>
        <Link
          href="/collection"
          className="text-primary text-sm font-medium underline-offset-4 hover:underline"
        >
          Back to your collection →
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

      <CareEntryFields defaults={CARE_DEFAULTS} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || selected.size === 0}>
          {pending
            ? "Logging…"
            : selected.size === 0
              ? "Pick trees to log"
              : `Log for ${selected.size} tree${selected.size === 1 ? "" : "s"}`}
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
