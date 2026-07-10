import { Check, ListChecks } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Photo } from "@/components/photo";
import { TreeCard } from "@/components/tree-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listDashboardTasks, listPastTasks } from "@/server/dashboard";
import { listRecentPhotos } from "@/server/photos";
import { countActiveTrees, listTriageTrees } from "@/server/trees";

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
  const [t, tc] = await Promise.all([getTranslations("today"), getTranslations("common")]);
  const [tasks, triage, past, treeCount, recentPhotos] = await Promise.all([
    listDashboardTasks(),
    listTriageTrees(),
    listPastTasks(),
    countActiveTrees(),
    listRecentPhotos(),
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
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        {/* Batch care, discoverable where the day lives (not buried in Collection). */}
        <Link href="/log/batch" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          <ListChecks aria-hidden />
          {t("logSeveral")}
        </Link>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {tc("taskUpdateError")}
        </p>
      ) : null}

      <TodayDashboard items={items} serverToday={serverToday} treeCount={treeCount} />

      {triage.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">{t("needsAttention")}</h2>
          <ul className="grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-3">
            {triage.map((tree) => (
              <li key={tree.id}>
                <TreeCard tree={tree} serverToday={serverToday} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recentPhotos.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">{t("recentPhotos")}</h2>
          {/* A photo-first moment on an otherwise text-heavy dashboard: the newest
              images across the collection, each a shortcut to its tree. */}
          <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {recentPhotos.map((photo) => (
              <li key={photo.id} className="shrink-0">
                <Link
                  href={`/collection/${photo.treeId}`}
                  className="focus-visible:ring-ring bg-muted block size-24 overflow-hidden rounded-xl outline-none focus-visible:ring-2"
                >
                  <Photo
                    thumbSrc={photo.thumbUrl}
                    fullSrc={photo.url}
                    alt={photo.treeName}
                    className="h-full w-full object-cover"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">
            {t("recentlyDone")} <span className="text-muted-foreground">({past.length})</span>
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
                    {task.tree ? task.tree.name : tc("collectionTask")}
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
