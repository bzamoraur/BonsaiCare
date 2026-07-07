import { listCalendarTasks, type DashboardTask } from "@/server/dashboard";

import { CalendarView } from "./calendar-view";

export const metadata = {
  title: "Calendar",
};

const pad = (n: number) => String(n).padStart(2, "0");
const monthParam = (year: number, month: number) => `${year}-${pad(month)}`;

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
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const serverToday = new Date().toISOString().slice(0, 10);
  const { year, month } = parseMonth(m, serverToday);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${monthParam(year, month)}-01`;
  const monthEnd = `${monthParam(year, month)}-${pad(daysInMonth)}`;
  const tasks = await listCalendarTasks(monthStart, monthEnd);

  const counts: Record<string, number> = {};
  const byDay = new Map<string, DashboardTask[]>();
  for (const task of tasks) {
    counts[task.due_on] = (counts[task.due_on] ?? 0) + 1;
    const list = byDay.get(task.due_on);
    if (list) list.push(task);
    else byDay.set(task.due_on, [task]);
  }
  const agenda = [...byDay.keys()].sort().map((iso) => ({ iso, tasks: byDay.get(iso)! }));

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
    />
  );
}
