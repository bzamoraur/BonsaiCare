import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { TASK_TYPE_ICONS, TASK_TYPE_LABELS } from "@/lib/task-labels";
import { listCalendarTasks, type DashboardTask } from "@/server/dashboard";

export const metadata = {
  title: "Calendar",
};

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
const monthParam = (year: number, month: number) => `${year}-${pad(month)}`;

const agendaFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const formatDayHeader = (iso: string) => agendaFormatter.format(new Date(`${iso}T00:00:00`));

/** Parse `?m=YYYY-MM` to `{year, month}` (1-based month); default to this month. */
function parseMonth(m: string | undefined): { year: number; month: number } {
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [year, month] = m.split("-").map(Number);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const zero = month - 1 + delta;
  return { year: year + Math.floor(zero / 12), month: (((zero % 12) + 12) % 12) + 1 };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const { year, month } = parseMonth(m);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${monthParam(year, month)}-01`;
  const monthEnd = `${monthParam(year, month)}-${pad(daysInMonth)}`;
  const tasks = await listCalendarTasks(monthStart, monthEnd);

  const countByDate = new Map<string, number>();
  const byDay = new Map<string, DashboardTask[]>();
  for (const task of tasks) {
    countByDate.set(task.due_on, (countByDate.get(task.due_on) ?? 0) + 1);
    const list = byDay.get(task.due_on);
    if (list) list.push(task);
    else byDay.set(task.due_on, [task]);
  }

  const today = new Date().toISOString().slice(0, 10);
  // Weekday of the 1st, Monday-first (0 = Mon … 6 = Sun).
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const now = new Date();
  const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;
  const agendaDays = [...byDay.keys()].sort();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        {!isCurrentMonth ? (
          <Link
            href="/calendar"
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            Today
          </Link>
        ) : null}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/calendar?m=${monthParam(prev.year, prev.month)}`}
          aria-label="Previous month"
          className="text-muted-foreground hover:text-foreground rounded-md p-1"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <span className="text-sm font-medium">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <Link
          href={`/calendar?m=${monthParam(next.year, next.month)}`}
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
            const iso = `${monthParam(year, month)}-${pad(day)}`;
            const count = countByDate.get(iso) ?? 0;
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
        {agendaDays.length === 0 ? (
          <p className="text-muted-foreground text-sm text-balance">
            Nothing scheduled this month.
          </p>
        ) : (
          agendaDays.map((iso) => (
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
                {byDay.get(iso)!.map((task) => (
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
