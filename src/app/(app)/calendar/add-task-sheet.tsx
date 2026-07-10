"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { TaskFields, type TaskDefaults } from "@/app/(app)/collection/[id]/task-fields";
import type { TaskFormState } from "@/app/(app)/collection/[id]/task-types";
import { getQuickAddData } from "@/app/(app)/log/quick-actions";
import type { QuickAddTree } from "@/server/trees";
import { Button } from "@/components/ui/button";

import { createTaskFromCalendarAction } from "./actions";

const initialState: TaskFormState = { status: "idle" };

const selectClass =
  "border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-base outline-none focus-visible:ring-2";

/**
 * Add a task straight from the calendar (native `<dialog>` bottom sheet, same
 * pattern as the quick-add sheet). The tree is chosen here — including a "Whole
 * collection" option that creates a tree-less task — and the clicked/opened day is
 * prefilled as the due date. Body mounts only while open so each open re-reads the
 * prefill into the uncontrolled TaskFields.
 */
export function AddTaskSheet({
  open,
  prefillDate,
  onClose,
}: {
  open: boolean;
  prefillDate: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="add-task-title"
      className="bg-card text-foreground fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border-0 p-0 backdrop:bg-black/50"
    >
      {open ? <AddTaskBody prefillDate={prefillDate} onClose={onClose} /> : null}
    </dialog>
  );
}

function AddTaskBody({ prefillDate, onClose }: { prefillDate: string; onClose: () => void }) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createTaskFromCalendarAction, initialState);
  const [trees, setTrees] = useState<QuickAddTree[]>([]);
  const [treeId, setTreeId] = useState(""); // "" = whole collection (a tree-less task)

  // Load the tree list on open (setState only in the async callback — the repo bans
  // setState in an effect body). Preselect when there's exactly one tree.
  useEffect(() => {
    let active = true;
    getQuickAddData()
      .then((data) => {
        if (!active) return;
        setTrees(data.trees);
        if (data.trees.length === 1) setTreeId(data.trees[0].id);
      })
      .catch(() => {
        // A load failure still leaves a usable form: a collection-level task.
      });
    return () => {
      active = false;
    };
  }, []);

  // Close + refresh the calendar once the task is created.
  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  const defaults: TaskDefaults = {
    title: "",
    type: "watering",
    dueOn: prefillDate,
    notes: "",
    recurring: false,
    intervalDays: "14",
    anchor: "completion",
    seasonal: false,
    seasonStartMonth: "3",
    seasonEndMonth: "10",
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id="add-task-title" className="text-lg font-semibold tracking-tight">
          {t("newTask")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mr-1 rounded-md p-1 outline-none focus-visible:ring-2"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="calendar-task-tree" className="text-sm font-medium">
            {t("whichTree")}
          </label>
          <select
            id="calendar-task-tree"
            name="treeId"
            value={treeId}
            onChange={(e) => setTreeId(e.target.value)}
            className={selectClass}
          >
            <option value="">{t("wholeCollection")}</option>
            {trees.map((tree) => (
              <option key={tree.id} value={tree.id}>
                {tree.name}
              </option>
            ))}
          </select>
        </div>

        <TaskFields defaults={defaults} />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? t("adding") : t("addTask")}
          </Button>
          {state.status === "error" ? (
            <span role="alert" className="text-destructive text-sm">
              {state.message}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
