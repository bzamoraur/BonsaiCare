import { Camera, ChevronDown, ChevronLeft, Leaf, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { CareLastByType } from "@/components/care-entry-fields";
import { CareRecencyChips } from "@/components/care-recency-chips";
import { PhotoZoom } from "@/components/photo-zoom";
import { careDetailsToStrings } from "@/lib/care-details";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CareEventType, CareRecency } from "@/domain/care";
import { CARE_EVENT_ICONS, CARE_EVENT_LABELS, careDetailSummary } from "@/lib/care-labels";
import { TASK_TYPE_ICONS, TASK_TYPE_LABELS, describeRecurrence } from "@/lib/task-labels";
import { groupTimelineByMonth, isMonthDefaultOpen } from "@/lib/timeline-groups";
import { DEVELOPMENT_STAGE_LABELS, HEALTH_STATUS_LABELS, ORIGIN_LABELS } from "@/lib/tree-labels";
import { cn } from "@/lib/utils";
import { getLocationName } from "@/server/locations";
import { getTreeTags } from "@/server/tags";
import { listTreeTasks, type Task } from "@/server/tasks";
import { listTreeTimeline, type TimelineItem } from "@/server/timeline";
import { getTree } from "@/server/trees";
import { Constants } from "@/types/database.types";

import { archiveTreeAction, unarchiveTreeAction } from "./actions";
import { AddTaskForm } from "./add-task-form";
import { ArchiveTreeForm } from "./archive-tree-form";
import { deleteCareAction, logCareAction, repeatLastCareAction } from "./care-actions";
import { ConfirmDeleteButton } from "./confirm-delete-button";
import { DeletePhotoButton } from "./delete-photo-button";
import { LogCareForm } from "./log-care-form";
import { deletePhotoAction, setCoverAction } from "./photo-actions";
import { PhotoUploader } from "./photo-uploader";
import {
  completeTaskAction,
  createTaskAction,
  deleteTaskAction,
  skipTaskAction,
} from "./task-actions";
import { TaskActions } from "@/components/task-actions";
import { TaskDueLabel } from "./task-due-label";
import { TimelineFilters, type FilterOption } from "./timeline-filters";

type Params = { id: string };

const ERROR_MESSAGES: Record<string, string> = {
  archive: "We couldn't archive this tree. Please try again.",
  unarchive: "We couldn't unarchive this tree. Please try again.",
  cover: "We couldn't set that cover photo. Please try again.",
  photo: "We couldn't delete that photo. Please try again.",
  care: "We couldn't update the care log. Please try again.",
  task: "We couldn't update that task. Please try again.",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatAcquired(iso: string): string {
  // Construct at local midnight so the calendar day is preserved across zones.
  return dateFormatter.format(new Date(`${iso}T00:00:00`));
}

function formatTimelineDate(value: string): string {
  // occurred_on is a bare calendar date (YYYY-MM-DD) — pin it to local midnight
  // so the day survives any timezone (ADR-0012); taken_at is a full instant.
  const at = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return dateFormatter.format(at);
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const tree = await getTree(id);
  return { title: tree?.name ?? "Tree" };
}

export default async function TreeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ error?: string; log?: string; type?: string }>;
}) {
  const { id } = await params;
  const { error, log, type } = await searchParams;

  const [tree, timeline, tags, tasks] = await Promise.all([
    getTree(id),
    listTreeTimeline(id),
    getTreeTags(id),
    listTreeTasks(id),
  ]);
  if (!tree) notFound();

  // The server's UTC day — SSR fallback for the client-local "today" the care plan
  // resolves (TaskDueLabel / TaskActions), and the add-task default due date.
  const serverToday = new Date().toISOString().slice(0, 10);
  const currentMonthKey = serverToday.slice(0, 7); // opens today's timeline "folder"
  const pendingTasks = tasks.filter((t) => t.status === "pending");

  const locationName = tree.location_id ? await getLocationName(tree.location_id) : null;

  const facts = [
    {
      label: "Development stage",
      value: tree.development_stage ? DEVELOPMENT_STAGE_LABELS[tree.development_stage] : null,
    },
    {
      label: "Health",
      value: tree.health_status ? HEALTH_STATUS_LABELS[tree.health_status] : null,
    },
    { label: "Location", value: locationName },
    { label: "Origin", value: tree.origin ? ORIGIN_LABELS[tree.origin] : null },
    { label: "Style", value: tree.style },
    { label: "Pot", value: tree.current_pot },
    { label: "Substrate", value: tree.current_substrate },
    { label: "Acquired", value: tree.acquired_on ? formatAcquired(tree.acquired_on) : null },
    { label: "Acquired from", value: tree.acquired_from },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  const isArchived = Boolean(tree.archived_at);
  const errorMessage = error ? ERROR_MESSAGES[error] : null;

  // Every photo (standalone + attached), newest first, to resolve the hero cover.
  const allPhotos = timeline.flatMap((item) =>
    item.kind === "photo" ? [item.photo] : item.photos,
  );
  const heroPhoto = allPhotos.find((p) => p.id === tree.cover_photo_id) ?? allPhotos[0] ?? null;

  // Type filter (URL-driven). Options are only the kinds actually present.
  const careTypes = Constants.public.Enums.care_event_type;
  const activeFilter =
    type === "photos" || (type && (careTypes as readonly string[]).includes(type))
      ? type
      : undefined;

  const presentTypes = new Set(
    timeline.flatMap((item) => (item.kind === "care" ? [item.entry.type] : [])),
  );
  const filterOptions: FilterOption[] = [
    ...careTypes
      .filter((t) => presentTypes.has(t))
      .map((t) => ({ value: t, label: CARE_EVENT_LABELS[t] })),
    ...(timeline.some((item) => item.kind === "photo")
      ? [{ value: "photos", label: "Photos" }]
      : []),
  ];

  const visibleItems = activeFilter
    ? timeline.filter((item) =>
        activeFilter === "photos"
          ? item.kind === "photo"
          : item.kind === "care" && item.entry.type === activeFilter,
      )
    : timeline;

  // Care recency (chips) + the most-recent care type (one-tap "Repeat last care").
  // The timeline is newest-first, so the first care item is the latest, and the
  // first date seen per type is that type's latest.
  const careRecency: CareRecency = {};
  const lastCareByType: CareLastByType = {};
  let latestCareType: CareEventType | null = null;
  for (const item of timeline) {
    if (item.kind !== "care") continue;
    if (latestCareType === null) latestCareType = item.entry.type;
    if (careRecency[item.entry.type] === undefined) {
      careRecency[item.entry.type] = item.entry.occurred_on;
    }
    if (lastCareByType[item.entry.type] === undefined) {
      lastCareByType[item.entry.type] = careDetailsToStrings(item.entry.details);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <Link
        href="/collection"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Collection
      </Link>

      {errorMessage ? (
        <p role="alert" className="text-destructive text-sm">
          {errorMessage}
        </p>
      ) : null}

      {/* Hero — the cover photo (or newest), else a placeholder. */}
      <div className="bg-muted flex aspect-video items-center justify-center overflow-hidden rounded-2xl">
        {heroPhoto?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- private signed URL, next/image caching doesn't fit
          <img src={heroPhoto.url} alt={tree.name} className="h-full w-full object-cover" />
        ) : (
          <Leaf className="text-muted-foreground/40 size-16" aria-hidden />
        )}
      </div>

      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{tree.name}</h1>
          {isArchived ? (
            <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs font-medium">
              Archived
            </span>
          ) : null}
        </div>
        {tree.species_label ? <p className="text-muted-foreground">{tree.species_label}</p> : null}
        <CareRecencyChips recency={careRecency} serverToday={serverToday} className="mt-0.5" />
      </header>

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs"
            >
              {tag.name}
            </li>
          ))}
        </ul>
      ) : null}

      {facts.length > 0 ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs">{fact.label}</dt>
              <dd className="text-sm">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {tree.notes ? (
        <section className="flex flex-col gap-1.5">
          <h2 className="text-sm font-medium">Notes</h2>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">{tree.notes}</p>
        </section>
      ) : null}

      {/* Care plan — upcoming tasks for this tree. */}
      {!isArchived || pendingTasks.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium">Care plan</h2>
          {!isArchived ? (
            <AddTaskForm action={createTaskAction.bind(null, tree.id)} defaultDueOn={serverToday} />
          ) : null}
          {pendingTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm text-balance">
              No tasks planned. Add a watering or fertilizing schedule to stay on track.
            </p>
          ) : (
            <ol className="flex flex-col">
              {pendingTasks.map((task) => (
                <TaskItem key={task.id} task={task} treeId={tree.id} serverToday={serverToday} />
              ))}
            </ol>
          )}
        </section>
      ) : null}

      {/* Timeline — care events + photos, merged, newest first. */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium">Timeline</h2>
          <div className="flex items-center gap-2">
            {latestCareType && !isArchived ? (
              <form action={repeatLastCareAction.bind(null, tree.id)}>
                <Button type="submit" variant="outline" size="sm">
                  Repeat: {CARE_EVENT_LABELS[latestCareType]}
                </Button>
              </form>
            ) : null}
            <PhotoUploader treeId={tree.id} ownerId={tree.owner_id} />
          </div>
        </div>

        <LogCareForm
          action={logCareAction.bind(null, tree.id)}
          defaultOpen={log === "1"}
          lastByType={lastCareByType}
        />

        {filterOptions.length > 1 ? <TimelineFilters options={filterOptions} /> : null}

        {timeline.length === 0 ? (
          <p className="text-muted-foreground text-sm text-balance">
            No history yet. Log care or add a photo to start this tree&apos;s story.
          </p>
        ) : visibleItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">No entries match this filter.</p>
        ) : (
          // "Folders" by month so years of logs stay scannable. Native <details>
          // gives keyboard/AT expand-collapse for free (no client JS). The newest and
          // current months open by default; a filter opens every match's month.
          <div className="flex flex-col">
            {groupTimelineByMonth(visibleItems).map((group, index) => (
              <details
                // Fold the filter into the key so React remounts (re-applying the
                // computed open state) when a filter is toggled — a bare `open` prop is
                // uncontrolled and won't re-open a month the user had manually collapsed.
                key={`${group.key}-${activeFilter ?? "all"}`}
                open={isMonthDefaultOpen(index, group.key, currentMonthKey, Boolean(activeFilter))}
                className="group border-border border-b last:border-b-0"
              >
                <summary className="focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-md py-3 outline-none select-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-medium">{group.label}</span>
                  <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
                    {group.items.length} {group.items.length === 1 ? "entry" : "entries"}
                    <ChevronDown
                      className="size-4 transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </span>
                </summary>
                <ol className="flex flex-col pb-2">
                  {group.items.map((item) => (
                    <TimelineRow key={`${item.kind}-${item.id}`} item={item} tree={tree} />
                  ))}
                </ol>
              </details>
            ))}
          </div>
        )}
      </section>

      <hr className="border-border" />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/collection/${tree.id}/edit`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Pencil aria-hidden />
          Edit
        </Link>
        {isArchived ? (
          // Unarchiving is non-destructive, so no confirm step — one tap restores it.
          <form action={unarchiveTreeAction.bind(null, tree.id)}>
            <Button type="submit" variant="outline">
              Unarchive
            </Button>
          </form>
        ) : (
          <ArchiveTreeForm action={archiveTreeAction.bind(null, tree.id)} />
        )}
      </div>
    </main>
  );
}

function TaskItem({
  task,
  treeId,
  serverToday,
}: {
  task: Task;
  treeId: string;
  serverToday: string;
}) {
  const Icon = TASK_TYPE_ICONS[task.type];
  return (
    <li className="flex gap-3">
      <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="border-border flex flex-1 flex-col gap-1 border-b pb-4 last:border-b-0">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium">{task.title}</span>
          <TaskDueLabel status={task.status} dueOn={task.due_on} serverToday={serverToday} />
        </div>
        <p className="text-muted-foreground text-xs">
          {TASK_TYPE_LABELS[task.type]} · {describeRecurrence(task.recurrence)}
        </p>
        {task.notes ? (
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">{task.notes}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1">
          <TaskActions
            type={task.type}
            serverToday={serverToday}
            completeAction={completeTaskAction.bind(null, treeId, task.id)}
            skipAction={skipTaskAction.bind(null, treeId, task.id)}
          />
          <Link
            href={`/collection/${treeId}/tasks/${task.id}`}
            className="text-muted-foreground hover:text-foreground px-2 py-1 text-xs font-medium underline-offset-4 hover:underline"
          >
            Edit
          </Link>
          <ConfirmDeleteButton
            action={deleteTaskAction.bind(null, task.id, treeId)}
            srLabel="Delete task"
          />
        </div>
      </div>
    </li>
  );
}

function TimelineIcon({ item }: { item: TimelineItem }) {
  const Icon = item.kind === "care" ? CARE_EVENT_ICONS[item.entry.type] : Camera;
  return (
    <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
      <Icon className="size-4" aria-hidden />
    </div>
  );
}

/** One timeline entry (icon + card), shared by every month group. */
function TimelineRow({
  item,
  tree,
}: {
  item: TimelineItem;
  tree: { id: string; owner_id: string; name: string; cover_photo_id: string | null };
}) {
  return (
    <li className="flex gap-3">
      <TimelineIcon item={item} />
      <div className="border-border flex flex-1 flex-col gap-1.5 border-b pb-4 last:border-b-0">
        {item.kind === "care" ? (
          <CareItem item={item} treeId={tree.id} ownerId={tree.owner_id} treeName={tree.name} />
        ) : (
          <PhotoItem
            item={item}
            treeId={tree.id}
            treeName={tree.name}
            coverPhotoId={tree.cover_photo_id}
          />
        )}
      </div>
    </li>
  );
}

function CareItem({
  item,
  treeId,
  ownerId,
  treeName,
}: {
  item: Extract<TimelineItem, { kind: "care" }>;
  treeId: string;
  ownerId: string;
  treeName: string;
}) {
  const { entry, photos } = item;
  const summary = careDetailSummary(entry.details);
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{CARE_EVENT_LABELS[entry.type]}</span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {formatTimelineDate(entry.occurred_on)}
        </span>
      </div>
      {entry.title ? <p className="text-sm">{entry.title}</p> : null}
      {summary ? <p className="text-muted-foreground text-xs">{summary}</p> : null}
      {entry.notes ? (
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">{entry.notes}</p>
      ) : null}
      {photos.length > 0 ? (
        <div className="mt-1 grid grid-cols-3 gap-2">
          {photos.map((photo) =>
            photo.url ? (
              <PhotoZoom
                key={photo.id}
                thumbSrc={photo.thumbUrl}
                fullSrc={photo.url}
                alt={`${treeName} — ${CARE_EVENT_LABELS[entry.type]}`}
                className="bg-muted aspect-square w-full rounded-lg object-cover"
              />
            ) : null,
          )}
        </div>
      ) : null}
      <div className="flex items-center gap-1">
        <Link
          href={`/collection/${treeId}/care/${entry.id}`}
          className="text-muted-foreground hover:text-foreground px-2 py-1 text-xs font-medium underline-offset-4 hover:underline"
        >
          Edit
        </Link>
        <PhotoUploader treeId={treeId} ownerId={ownerId} careLogEntryId={entry.id} compact />
        <ConfirmDeleteButton
          action={deleteCareAction.bind(null, entry.id, treeId)}
          srLabel="Delete entry"
        />
      </div>
    </>
  );
}

function PhotoItem({
  item,
  treeId,
  treeName,
  coverPhotoId,
}: {
  item: Extract<TimelineItem, { kind: "photo" }>;
  treeId: string;
  treeName: string;
  coverPhotoId: string | null;
}) {
  const { photo } = item;
  const isCover = photo.id === coverPhotoId;
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">Photo</span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {formatTimelineDate(photo.taken_at)}
        </span>
      </div>
      <div className="bg-muted max-w-xs overflow-hidden rounded-xl">
        {photo.url ? (
          <PhotoZoom
            thumbSrc={photo.thumbUrl}
            fullSrc={photo.url}
            alt={`${treeName} photo`}
            width={photo.width}
            height={photo.height}
            className="h-auto w-full"
          />
        ) : null}
      </div>
      {photo.caption ? <p className="text-muted-foreground text-sm">{photo.caption}</p> : null}
      <div className="flex items-center gap-1">
        {isCover ? (
          <span className="text-muted-foreground px-1 text-xs font-medium">Cover</span>
        ) : (
          <form action={setCoverAction.bind(null, treeId, photo.id)}>
            <Button type="submit" variant="ghost" size="sm">
              Set cover
            </Button>
          </form>
        )}
        <DeletePhotoButton action={deletePhotoAction.bind(null, photo.id, treeId)} />
      </div>
    </>
  );
}
