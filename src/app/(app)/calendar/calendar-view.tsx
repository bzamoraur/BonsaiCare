"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { TaskActions } from "@/components/task-actions";
import { useLocalToday } from "@/lib/local-day";
import { TASK_TYPE_ICONS } from "@/lib/task-labels";
import { cn } from "@/lib/utils";
import type { DashboardTask } from "@/server/dashboard";

const MONTH_NAMES = [
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
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // Monday-first

const pad = (n: number) => String(n).padStart(2, "0");

const agendaFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
// Format a bare "YYYY-MM-DD" at local midnight so the day survives any timezone.
const formatDayHeader = (iso: string) => agendaFormatter.format(new Date(`${iso}T00:00:00`));

// Grid dot count, read out for assistive tech: e.g. "2 due, 1 done".
function dotsLabel(pending: number, done: number): string {
  const parts: string[] = [];
  if (pending > 0) parts.push(`${pending} due`);
  if (done > 0) parts.push(`${done} done`);
  return parts.join(", ");
}

/** One agenda entry: the task plus its complete/skip server actions, pre-bound to
 * the task id on the server. Only pending rows render the actions. */
export type AgendaTask = {
  task: DashboardTask;
  complete: (formData: FormData) => void;
  skip: (formData: FormData) => void;
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
  counts: Record<string, { pending: number; done: number }>;
  agenda: { iso: string; tasks: AgendaTask[] }[];
  prevParam: string;
  nextParam: string;
  hasError: boolean;
}) {
  const today = useLocalToday(serverToday);
  const monthPrefix = `${year}-${pad(month)}`; // "YYYY-MM" of the rendered month
  const localMonthParam = today.slice(0, 7); // "YYYY-MM" of the viewer's local day
  const isCurrentMonth = monthPrefix === localMonthParam;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        {!isCurrentMonth ? (
          <Link
            href={`/calendar?m=${localMonthParam}`}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            Today
          </Link>
        ) : null}
      </div>

      {hasError ? (
        <p role="alert" className="text-destructive text-sm">
          We couldn&apos;t update that task. Please try again.
        </p>
      ) : null}

      {/* Month navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/calendar?m=${prevParam}`}
          aria-label="Previous month"
          className="text-muted-foreground hover:text-foreground rounded-md p-1"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <span className="text-sm font-medium">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <Link
          href={`/calendar?m=${nextParam}`}
          aria-label="Next month"
          className="text-muted-foreground hover:text-foreground rounded-md p-1"
        >
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </div>

      {/* Month grid */}
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
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
            const total = pending + done;
            const isToday = iso === today;
            const cellClass = cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-sm",
              isToday ? "border-foreground" : "border-border",
            );
            // Pending dots (solid brand) first, then completed ones (a muted grey —
            // "settled" but opaque enough to still read as a dot); capped at 3.
            // Decorative here: the enclosing cell carries the label for AT.
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
                          i < pending ? "bg-primary" : "bg-muted-foreground/70",
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
                aria-label={`${dotsLabel(pending, done)} — ${formatDayHeader(iso)}`}
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
          <p className="text-muted-foreground text-sm text-balance">
            Nothing scheduled this month.
          </p>
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
                {iso === today ? " · Today" : ""}
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
    </main>
  );
}

function AgendaRow({ item, serverToday }: { item: AgendaTask; serverToday: string }) {
  const { task, complete, skip } = item;
  const t = useTranslations("taskTypes");
  const done = task.status === "done";
  // A completed action reads as settled: a check in a primary-tint circle plus a
  // "Done" tag. Pending rows carry inline Done/Skip actions; the title links to the
  // owning tree (kept out of the same interactive element as the buttons).
  const Icon = done ? Check : TASK_TYPE_ICONS[task.type];
  return (
    <li className="border-border bg-card flex flex-col gap-2 rounded-xl border p-3">
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
            {task.tree ? ` · ${task.tree.name}` : " · Collection task"}
            {done ? " · Done" : ""}
          </span>
        </div>
      </div>
      {!done ? (
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
