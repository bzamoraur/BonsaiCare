"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { useLocalToday } from "@/lib/local-day";
import { TASK_TYPE_ICONS, TASK_TYPE_LABELS } from "@/lib/task-labels";
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
}: {
  serverToday: string;
  year: number;
  month: number;
  cells: (number | null)[];
  counts: Record<string, number>;
  agenda: { iso: string; tasks: DashboardTask[] }[];
  prevParam: string;
  nextParam: string;
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
            const count = counts[iso] ?? 0;
            const isToday = iso === today;
            return (
              <div
                key={idx}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-sm",
                  isToday ? "border-foreground" : "border-border",
                )}
              >
                <span className={isToday ? "font-semibold" : undefined}>{day}</span>
                {count > 0 ? (
                  <span className="flex gap-0.5" aria-label={`${count} due`}>
                    {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                      <span key={i} className="bg-primary size-1 rounded-full" />
                    ))}
                  </span>
                ) : (
                  <span className="size-1" aria-hidden />
                )}
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
            <div key={iso} className="flex flex-col gap-2">
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
                {tasks.map((task) => (
                  <AgendaRow key={task.id} task={task} />
                ))}
              </ol>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

function AgendaRow({ task }: { task: DashboardTask }) {
  const Icon = TASK_TYPE_ICONS[task.type];
  const body = (
    <div className="border-border bg-card flex items-center gap-3 rounded-xl border p-3">
      <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-medium">{task.title}</span>
        <span className="text-muted-foreground text-xs">
          {TASK_TYPE_LABELS[task.type]}
          {task.tree ? ` · ${task.tree.name}` : " · Collection task"}
        </span>
      </div>
    </div>
  );
  // Link to the owning tree when there is one; collection-wide tasks aren't linkable.
  return task.tree ? (
    <li>
      <Link
        href={`/collection/${task.tree.id}`}
        className="focus-visible:ring-ring block rounded-xl outline-none focus-visible:ring-2"
      >
        {body}
      </Link>
    </li>
  ) : (
    <li>{body}</li>
  );
}
