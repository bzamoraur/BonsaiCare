"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TASK_TYPE_TO_CARE_EVENT } from "@/domain/task-form";
import type { Enums } from "@/types/database.types";

const dateInputClass =
  "border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-2";

/**
 * Done / Skip controls for a task card. "Done" expands an inline confirm with the
 * completion date (backdatable) and, for a care-mappable type, a "log a care
 * event" toggle. Both submit bound Server Actions. "Skip" is one tap; a recurring
 * task still advances to its next occurrence either way.
 */
export function TaskActions({
  type,
  defaultDate,
  completeAction,
  skipAction,
}: {
  type: Enums<"task_type">;
  defaultDate: string;
  completeAction: (formData: FormData) => void;
  skipAction: (formData: FormData) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const canLog = TASK_TYPE_TO_CARE_EVENT[type] !== null;

  if (confirming) {
    return (
      <form action={completeAction} className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          name="completedOn"
          defaultValue={defaultDate}
          aria-label="Completed on"
          className={dateInputClass}
        />
        {canLog ? (
          <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <input type="checkbox" name="logEvent" defaultChecked className="size-4" />
            Log care event
          </label>
        ) : null}
        <Button type="submit" size="sm">
          Confirm
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button type="button" size="sm" onClick={() => setConfirming(true)}>
        Done
      </Button>
      <form action={skipAction}>
        <Button type="submit" variant="ghost" size="sm">
          Skip
        </Button>
      </form>
    </div>
  );
}
