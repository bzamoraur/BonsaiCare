import { listCalendarTasks, type DashboardTask } from "@/server/dashboard";

import { completeFromCalendarAction, skipFromCalendarAction } from "./actions";
import { CalendarView, type AgendaTask } from "./calendar-view";

export const metadata = {
  title: "Calendar",
};

const pad = (n: number) => String(n).padStart(2, "0");
const monthParam = (year: number, month: number) => `${year}-${pad(month)}`;

// Within a day, still-to-do tasks sort before completed ones (actionable first).
const statusRank = (task: DashboardTask) => (task.status === "done" ? 1 : 0);

/** Parse `?m=YYYY-MM` to `{year, month}` (1-based month); default to the server's
 * current month. The viewer's local month may differ at a boundary — the view's
 * "Today" link corrects that — but the data fetch has to pick a month server-side. */
function parseMonth(m: string | undefined, serverToday: string): { year: number; month: number } {
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [year, month] = m.split("-").map(Number);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const [year, month] = serverToday.split("-").map(Number);
  return { year, month };
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const zero = month - 1 + delta;
  return { year: year + Math.floor(zero / 12), month: (((zero % 12) + 12) % 12) + 1 };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; error?: string }>;
}) {
  const { m, error } = await searchParams;
  const serverToday = new Date().toISOString().slice(0, 10);
  const { year, month } = parseMonth(m, serverToday);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${monthParam(year, month)}-01`;
  const monthEnd = `${monthParam(year, month)}-${pad(daysInMonth)}`;
  const tasks = await listCalendarTasks(monthStart, monthEnd);

  // Per-day tallies split by status so the grid can show open vs. settled dots.
  const counts: Record<string, { pending: number; done: number }> = {};
  const byDay = new Map<string, DashboardTask[]>();
  for (const task of tasks) {
    const bucket = counts[task.due_on] ?? { pending: 0, done: 0 };
    counts[task.due_on] = bucket;
    if (task.status === "done") bucket.done += 1;
    else bucket.pending += 1;
    const list = byDay.get(task.due_on);
    if (list) list.push(task);
    else byDay.set(task.due_on, [task]);
  }
  // Sort each day (pending first), then bind the per-task complete/skip actions so
  // the agenda rows can act inline. Only pending rows render them, but binding is
  // cheap and keeps the shape uniform. The viewed month is bound too so an action's
  // error redirect keeps the viewer on this month, not the server's current one.
  const monthKey = monthParam(year, month);
  const agenda = [...byDay.keys()].sort().map((iso) => ({
    iso,
    tasks: byDay
      .get(iso)!
      .sort((a, b) => statusRank(a) - statusRank(b))
      .map(
        (task): AgendaTask => ({
          task,
          complete: completeFromCalendarAction.bind(null, task.id, monthKey),
          skip: skipFromCalendarAction.bind(null, task.id, monthKey),
        }),
      ),
  }));

  // Month structure (day count, weekday of the 1st) is timezone-independent, so it
  // stays server-side. Weekday of the 1st, Monday-first (0 = Mon … 6 = Sun).
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  return (
    <CalendarView
      serverToday={serverToday}
      year={year}
      month={month}
      cells={cells}
      counts={counts}
      agenda={agenda}
      prevParam={monthParam(prev.year, prev.month)}
      nextParam={monthParam(next.year, next.month)}
      hasError={error === "task"}
    />
  );
}
