"use client";

import Link from "next/link";

import { TaskActions } from "@/components/task-actions";
import { addLocalDaysIso, useLocalToday } from "@/lib/local-day";
import { TASK_TYPE_ICONS } from "@/lib/task-labels";
import type { DashboardTask } from "@/server/dashboard";

export type DashboardItem = {
  task: DashboardTask;
  complete: (formData: FormData) => void;
  skip: (formData: FormData) => void;
};

const dueFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const formatDue = (iso: string) => dueFormatter.format(new Date(`${iso}T00:00:00`));

/**
 * The Today buckets. Starts rendered against `serverToday` (so SSR and the first
 * client render match), then re-buckets against the viewer's *local* today on
 * mount — so "overdue" and "today" reflect their clock, not the server's UTC day
 * (the dashboard's credibility hinges on that boundary being right).
 */
export function TodayDashboard({
  items,
  serverToday,
}: {
  items: DashboardItem[];
  serverToday: string;
}) {
  // serverToday on the server + first hydration render (matches SSR); the viewer's
  // real local today on the client thereafter — no effect, no hydration mismatch.
  const today = useLocalToday(serverToday);

  if (items.length === 0) {
    return (
      <section className="border-border bg-card rounded-2xl border p-8 text-center">
        <p className="text-muted-foreground text-balance">
          Nothing needs attention right now. Enjoy your trees. 🌱
        </p>
      </section>
    );
  }

  const in7 = addLocalDaysIso(today, 7);
  const overdue = items.filter((i) => i.task.due_on < today);
  const dueToday = items.filter((i) => i.task.due_on === today);
  const upcoming = items.filter((i) => i.task.due_on > today && i.task.due_on <= in7);

  return (
    <div className="flex flex-col gap-8">
      <Bucket title="Overdue" items={overdue} serverToday={serverToday} />
      <Bucket
        title="Today"
        items={dueToday}
        serverToday={serverToday}
        emptyHint="Nothing due today."
      />
      <Bucket title="Next 7 days" items={upcoming} serverToday={serverToday} />
    </div>
  );
}

function Bucket({
  title,
  items,
  serverToday,
  emptyHint,
}: {
  title: string;
  items: DashboardItem[];
  serverToday: string;
  emptyHint?: string;
}) {
  if (items.length === 0 && !emptyHint) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">
        {title}
        {items.length > 0 ? <span className="text-muted-foreground"> ({items.length})</span> : null}
      </h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyHint}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.map((item) => (
            <TaskRow key={item.task.id} item={item} serverToday={serverToday} />
          ))}
        </ol>
      )}
    </section>
  );
}

function TaskRow({ item, serverToday }: { item: DashboardItem; serverToday: string }) {
  const { task } = item;
  const Icon = TASK_TYPE_ICONS[task.type];
  return (
    <li className="border-border bg-card flex items-start gap-3 rounded-xl border p-3">
      <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">{task.title}</span>
          <span className="text-muted-foreground shrink-0 text-xs">{formatDue(task.due_on)}</span>
        </div>
        {task.tree ? (
          <Link
            href={`/collection/${task.tree.id}`}
            className="text-muted-foreground hover:text-foreground w-fit text-xs underline-offset-4 hover:underline"
          >
            {task.tree.name}
          </Link>
        ) : (
          <span className="text-muted-foreground text-xs">Collection task</span>
        )}
        <div className="mt-1">
          <TaskActions
            type={task.type}
            serverToday={serverToday}
            completeAction={item.complete}
            skipAction={item.skip}
          />
        </div>
      </div>
    </li>
  );
}
