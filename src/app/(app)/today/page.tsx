import { Check, ListChecks } from "lucide-react";
import Link from "next/link";

import { TreeCard } from "@/components/tree-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listDashboardTasks, listPastTasks } from "@/server/dashboard";
import { listTriageTrees } from "@/server/trees";

import { completeFromTodayAction, skipFromTodayAction } from "./actions";
import { TodayDashboard, type DashboardItem } from "./today-dashboard";

export const metadata = {
  title: "Today",
};

// Completed-at is a full instant; the history shows the calendar day it was done.
const doneFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [tasks, triage, past] = await Promise.all([
    listDashboardTasks(),
    listTriageTrees(),
    listPastTasks(),
  ]);

  const serverToday = new Date().toISOString().slice(0, 10);
  const items: DashboardItem[] = tasks.map((task) => ({
    task,
    complete: completeFromTodayAction.bind(null, task.id),
    skip: skipFromTodayAction.bind(null, task.id),
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        {/* Batch care, discoverable where the day lives (not buried in Collection). */}
        <Link href="/log/batch" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          <ListChecks aria-hidden />
          Log several
        </Link>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          We couldn&apos;t update that task. Please try again.
        </p>
      ) : null}

      <TodayDashboard items={items} serverToday={serverToday} />

      {triage.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Needs attention</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {triage.map((tree) => (
              <li key={tree.id}>
                <TreeCard tree={tree} serverToday={serverToday} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">
            Recently done <span className="text-muted-foreground">({past.length})</span>
          </h2>
          <ol className="flex flex-col gap-2">
            {past.map((task) => (
              <li
                key={task.id}
                className="border-border bg-card flex items-center gap-3 rounded-xl border p-3"
              >
                <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-4" aria-hidden />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">{task.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {task.tree ? task.tree.name : "Collection task"}
                    {task.completed_at
                      ? ` · ${doneFormatter.format(new Date(task.completed_at))}`
                      : ""}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
