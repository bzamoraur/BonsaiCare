"use client";

import { useLocale, useTranslations } from "next-intl";

import { isOverdue } from "@/domain/scheduling";
import { useLocalToday } from "@/lib/local-day";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database.types";

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
  const t = useTranslations("taskForm");
  const locale = useLocale();
  const today = useLocalToday(serverToday);
  const overdue = isOverdue({ status, dueOn }, today);
  // Localize the month name, but keep the day-first order (es + en-GB both do) so an
  // English reader never sees a US month-first date. Format a bare "YYYY-MM-DD" at
  // local midnight so the day survives any timezone.
  const dueFormatter = new Intl.DateTimeFormat(locale === "es" ? "es" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <span
      className={cn(
        "shrink-0 text-xs",
        overdue ? "text-destructive font-medium" : "text-muted-foreground",
      )}
    >
      {overdue ? `${t("overdue")} · ` : ""}
      {dueFormatter.format(new Date(`${dueOn}T00:00:00`))}
    </span>
  );
}
