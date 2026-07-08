import { TreeCard } from "@/components/tree-card";
import { listDashboardTasks } from "@/server/dashboard";
import { listTriageTrees } from "@/server/trees";

import { completeFromTodayAction, skipFromTodayAction } from "./actions";
import { TodayDashboard, type DashboardItem } from "./today-dashboard";

export const metadata = {
  title: "Today",
};

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [tasks, triage] = await Promise.all([listDashboardTasks(), listTriageTrees()]);

  const serverToday = new Date().toISOString().slice(0, 10);
  const items: DashboardItem[] = tasks.map((task) => ({
    task,
    complete: completeFromTodayAction.bind(null, task.id),
    skip: skipFromTodayAction.bind(null, task.id),
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Today</h1>

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
    </main>
  );
}
