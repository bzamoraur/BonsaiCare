"use client";

import { isOverdue } from "@/domain/scheduling";
import { useLocalToday } from "@/lib/local-day";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database.types";

const dueFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
// Format a bare "YYYY-MM-DD" at local midnight so the day survives any timezone.
const formatDue = (iso: string) => dueFormatter.format(new Date(`${iso}T00:00:00`));

/**
 * The due-date line on a care-plan task, with the "Overdue ·" prefix computed
 * against the VIEWER's local today (not the server's UTC day) — client component
 * so the overdue boundary matches the dashboard's.
 */
export function TaskDueLabel({
  status,
  dueOn,
  serverToday,
}: {
  status: Enums<"task_status">;
  dueOn: string;
  serverToday: string;
}) {
  const today = useLocalToday(serverToday);
  const overdue = isOverdue({ status, dueOn }, today);
  return (
    <span
      className={cn(
        "shrink-0 text-xs",
        overdue ? "text-destructive font-medium" : "text-muted-foreground",
      )}
    >
      {overdue ? "Overdue · " : ""}
      {formatDue(dueOn)}
    </span>
  );
}
