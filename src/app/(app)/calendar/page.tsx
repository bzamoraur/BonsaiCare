import { listCalendarProjections, listCalendarTasks } from "@/server/dashboard";

import { completeFromCalendarAction, skipFromCalendarAction } from "./actions";
import { CalendarView, type AgendaTask } from "./calendar-view";

export const metadata = {
  title: "Calendar",
};

const pad = (n: number) => String(n).padStart(2, "0");
const monthParam = (year: number, month: number) => `${year}-${pad(month)}`;

// Within a day: actionable (pending) first, then settled (done), then forecast
// (projected) last.
const itemRank = (item: AgendaTask) => (item.projected ? 2 : item.task.status === "done" ? 1 : 0);

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
  // Real rows in the month, plus forecast occurrences of recurring series whose only
  // stored row is elsewhere (a recurring task keeps just its next date as a row).
  const [tasks, projections] = await Promise.all([
    listCalendarTasks(monthStart, monthEnd),
    listCalendarProjections(monthStart, monthEnd, serverToday),
  ]);

  // Per-day tallies split by kind so the grid can show open / settled / planned dots.
  const monthKey = monthParam(year, month);
  const counts: Record<string, { pending: number; done: number; projected: number }> = {};
  const byDay = new Map<string, AgendaTask[]>();
  const bump = (iso: string, kind: "pending" | "done" | "projected") => {
    const bucket = (counts[iso] ??= { pending: 0, done: 0, projected: 0 });
    bucket[kind] += 1;
  };
  const push = (iso: string, item: AgendaTask) => {
    const list = byDay.get(iso);
    if (list) list.push(item);
    else byDay.set(iso, [item]);
  };

  // Real tasks carry inline complete/skip actions (pre-bound to id + viewed month, so
  // an action's error redirect keeps the viewer on this month). Only pending rows
  // render them, but binding is cheap and keeps the shape uniform.
  for (const task of tasks) {
    bump(task.due_on, task.status === "done" ? "done" : "pending");
    push(task.due_on, {
      task,
      complete: completeFromCalendarAction.bind(null, task.id, monthKey),
      skip: skipFromCalendarAction.bind(null, task.id, monthKey),
    });
  }
  // Projected occurrences are read-only forecasts: a synthetic id + the forecast date,
  // flagged `projected` so the view renders them faded with no actions.
  for (const { iso, task } of projections) {
    bump(iso, "projected");
    push(iso, {
      task: { ...task, id: `${task.id}:${iso}`, due_on: iso, status: "pending" },
      projected: true,
    });
  }

  const agenda = [...byDay.keys()].sort().map((iso) => ({
    iso,
    tasks: byDay.get(iso)!.sort((a, b) => itemRank(a) - itemRank(b)),
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
