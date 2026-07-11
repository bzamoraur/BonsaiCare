"use client";

import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { TaskActions } from "@/components/task-actions";
import { buttonVariants } from "@/components/ui/button";
import { useLocalToday } from "@/lib/local-day";
import { TASK_TYPE_ICONS } from "@/lib/task-labels";
import { cn } from "@/lib/utils";
import type { DashboardTask } from "@/server/dashboard";

import { AddTaskSheet } from "./add-task-sheet";

const pad = (n: number) => String(n).padStart(2, "0");

/** One agenda entry: the task plus its complete/skip server actions, pre-bound to
 * the task id on the server. Only real pending rows carry the actions; a `projected`
 * entry is a read-only forecast of a recurring series' future occurrence. */
export type AgendaTask = {
  task: DashboardTask;
  projected?: boolean;
  complete?: (formData: FormData) => void;
  skip?: (formData: FormData) => void;
};

/**
 * The month grid + agenda. A client component so every "today" marker — the
 * highlighted cell, the "· Today" agenda header, and the "Today" back-link —
 * reflects the VIEWER's local day, not the server's UTC day (the "today" audit
 * finding). The page (server) still picks the *default* month from its UTC clock
 * to fetch data; at a month boundary a viewer in another timezone may land on the
 * UTC month, but the "Today" link then points at their own local month, so one
 * tap corrects it.
 */
export function CalendarView({
  serverToday,
  year,
  month,
  cells,
  counts,
  agenda,
  prevParam,
  nextParam,
  hasError,
}: {
  serverToday: string;
  year: number;
  month: number;
  cells: (number | null)[];
  counts: Record<string, { pending: number; done: number; projected: number }>;
  agenda: { iso: string; tasks: AgendaTask[] }[];
  prevParam: string;
  nextParam: string;
  hasError: boolean;
}) {
  const today = useLocalToday(serverToday);
  const monthPrefix = `${year}-${pad(month)}`; // "YYYY-MM" of the rendered month
  const localMonthParam = today.slice(0, 7); // "YYYY-MM" of the viewer's local day
  const isCurrentMonth = monthPrefix === localMonthParam;

  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [addDate, setAddDate] = useState<string | null>(null);

  // These format Date.UTC(...) instants, so they MUST read back in UTC — otherwise a
  // viewer west of UTC sees the previous month / a shifted weekday row (and an SSR
  // hydration mismatch). dayHeaderFmt below is correctly local (it formats a
  // local-midnight `${iso}T00:00:00`).
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  // 2024-01-01 is a Monday → indices 0..6 give Mon..Sun (Monday-first).
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    weekdayFmt.format(new Date(Date.UTC(2024, 0, 1 + i))),
  );
  const dayHeaderFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  // Format a bare "YYYY-MM-DD" at local midnight so the day survives any timezone.
  const formatDayHeader = (iso: string) => dayHeaderFmt.format(new Date(`${iso}T00:00:00`));
  const dotsLabel = (pending: number, done: number, projected: number) =>
    [
      pending > 0 ? t("dueCount", { count: pending }) : null,
      done > 0 ? t("doneCount", { count: done }) : null,
      projected > 0 ? t("plannedCount", { count: projected }) : null,
    ]
      .filter(Boolean)
      .join(", ");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-3">
          {!isCurrentMonth ? (
            <Link
              href={`/calendar?m=${localMonthParam}`}
              className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            >
              {t("today")}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setAddDate(isCurrentMonth ? today : `${monthPrefix}-01`)}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <Plus aria-hidden />
            {t("addTask")}
          </button>
        </div>
      </div>

      {hasError ? (
        <p role="alert" className="text-destructive text-sm">
          {tc("taskUpdateError")}
        </p>
      ) : null}

      {/* Month navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/calendar?m=${prevParam}`}
          aria-label={t("previousMonth")}
          className="text-muted-foreground hover:text-foreground rounded-md p-1"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <span className="text-sm font-medium">
          {monthLabel} {year}
        </span>
        <Link
          href={`/calendar?m=${nextParam}`}
          aria-label={t("nextMonth")}
          className="text-muted-foreground hover:text-foreground rounded-md p-1"
        >
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </div>

      {/* Month grid */}
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdays.map((w) => (
            <div key={w} className="text-muted-foreground text-xs font-medium">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} aria-hidden />;
            const iso = `${monthPrefix}-${pad(day)}`;
            const count = counts[iso];
            const pending = count?.pending ?? 0;
            const done = count?.done ?? 0;
            const projected = count?.projected ?? 0;
            const total = pending + done + projected;
            const isToday = iso === today;
            const cellClass = cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-sm",
              isToday ? "border-foreground" : "border-border",
            );
            // Dots read pending (solid brand) → done (muted grey, settled) → planned
            // (faint brand, a forecast); capped at 3. Decorative here: the enclosing
            // cell carries the label for AT.
            const content = (
              <>
                <span className={isToday ? "font-semibold" : undefined}>{day}</span>
                {total > 0 ? (
                  <span className="flex gap-0.5" aria-hidden>
                    {Array.from({ length: Math.min(total, 3) }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "size-1 rounded-full",
                          i < pending
                            ? "bg-primary"
                            : i < pending + done
                              ? "bg-muted-foreground/70"
                              : "bg-primary/30",
                        )}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="size-1" aria-hidden />
                )}
              </>
            );
            // A day with tasks jumps to its agenda section; empty days are inert.
            return total > 0 ? (
              <a
                key={idx}
                href={`#day-${iso}`}
                aria-label={`${dotsLabel(pending, done, projected)} — ${formatDayHeader(iso)}`}
                className={cn(
                  cellClass,
                  "hover:border-foreground/40 focus-visible:ring-ring outline-none focus-visible:ring-2",
                )}
              >
                {content}
              </a>
            ) : (
              <div key={idx} className={cellClass}>
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda for the month */}
      <section className="flex flex-col gap-4">
        {agenda.length === 0 ? (
          <p className="text-muted-foreground text-sm text-balance">{t("nothingScheduled")}</p>
        ) : (
          agenda.map(({ iso, tasks }) => (
            // scroll-mt gives the day a little breathing room when a grid cell
            // anchors to it (#day-<iso>).
            <div key={iso} id={`day-${iso}`} className="flex scroll-mt-6 flex-col gap-2">
              <h2
                className={cn(
                  "text-sm font-medium",
                  iso === today ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {formatDayHeader(iso)}
                {iso === today ? ` · ${t("today")}` : ""}
              </h2>
              <ol className="flex flex-col gap-2">
                {tasks.map((item) => (
                  <AgendaRow key={item.task.id} item={item} serverToday={serverToday} />
                ))}
              </ol>
            </div>
          ))
        )}
      </section>

      <AddTaskSheet
        open={addDate !== null}
        prefillDate={addDate ?? today}
        onClose={() => setAddDate(null)}
      />
    </main>
  );
}

function AgendaRow({ item, serverToday }: { item: AgendaTask; serverToday: string }) {
  const { task, projected, complete, skip } = item;
  const t = useTranslations("taskTypes");
  const tc = useTranslations("common");
  const tCal = useTranslations("calendar");
  const done = task.status === "done";
  // A completed action reads as settled: a check in a primary-tint circle plus a
  // "Done" tag. A projected occurrence is a dashed, faded forecast with a "Planned"
  // tag and no actions. Pending rows carry inline Done/Skip; the title links to the
  // owning tree (kept out of the same interactive element as the buttons).
  const Icon = done ? Check : TASK_TYPE_ICONS[task.type];
  return (
    <li
      className={cn(
        "border-border bg-card flex flex-col gap-2 rounded-xl border p-3",
        projected && "border-dashed opacity-75",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="flex flex-1 flex-col">
          {task.tree ? (
            <Link
              href={`/collection/${task.tree.id}`}
              className="focus-visible:ring-ring w-fit rounded text-sm font-medium underline-offset-2 outline-none hover:underline focus-visible:ring-2"
            >
              {task.title}
            </Link>
          ) : (
            <span className="text-sm font-medium">{task.title}</span>
          )}
          <span className="text-muted-foreground text-xs">
            {t(task.type)}
            {task.tree ? ` · ${task.tree.name}` : ` · ${tc("collectionTask")}`}
            {done ? ` · ${tCal("done")}` : ""}
            {projected ? ` · ${tCal("planned")}` : ""}
          </span>
        </div>
      </div>
      {!done && !projected && complete && skip ? (
        <div className="flex flex-wrap items-center gap-1 pl-11">
          <TaskActions
            type={task.type}
            serverToday={serverToday}
            completeAction={complete}
            skipAction={skip}
          />
        </div>
      ) : null}
    </li>
  );
}
