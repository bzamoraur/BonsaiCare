import { Camera, ChevronLeft, Leaf, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { CARE_EVENT_ICONS, CARE_EVENT_LABELS, careDetailSummary } from "@/lib/care-labels";
import { DEVELOPMENT_STAGE_LABELS, HEALTH_STATUS_LABELS, ORIGIN_LABELS } from "@/lib/tree-labels";
import { cn } from "@/lib/utils";
import { getLocationName } from "@/server/locations";
import { getTreeTags } from "@/server/tags";
import { listTreeTimeline, type TimelineItem } from "@/server/timeline";
import { getTree } from "@/server/trees";
import { Constants } from "@/types/database.types";

import { archiveTreeAction } from "./actions";
import { ArchiveTreeForm } from "./archive-tree-form";
import { deleteCareAction, logCareAction } from "./care-actions";
import { ConfirmDeleteButton } from "./confirm-delete-button";
import { DeletePhotoButton } from "./delete-photo-button";
import { LogCareForm } from "./log-care-form";
import { deletePhotoAction, setCoverAction } from "./photo-actions";
import { PhotoUploader } from "./photo-uploader";
import { TimelineFilters, type FilterOption } from "./timeline-filters";

type Params = { id: string };

const ERROR_MESSAGES: Record<string, string> = {
  archive: "We couldn't archive this tree. Please try again.",
  cover: "We couldn't set that cover photo. Please try again.",
  photo: "We couldn't delete that photo. Please try again.",
  care: "We couldn't update the care log. Please try again.",
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

function formatTimelineDate(iso: string): string {
  // occurred_at / taken_at are full timestamp instants; format the calendar date.
  return dateFormatter.format(new Date(iso));
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

  const [tree, timeline, tags] = await Promise.all([
    getTree(id),
    listTreeTimeline(id),
    getTreeTags(id),
  ]);
  if (!tree) notFound();

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

      {/* Timeline — care events + photos, merged, newest first. */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium">Timeline</h2>
          <PhotoUploader treeId={tree.id} ownerId={tree.owner_id} />
        </div>

        <LogCareForm action={logCareAction.bind(null, tree.id)} defaultOpen={log === "1"} />

        {filterOptions.length > 1 ? <TimelineFilters options={filterOptions} /> : null}

        {timeline.length === 0 ? (
          <p className="text-muted-foreground text-sm text-balance">
            No history yet. Log care or add a photo to start this tree&apos;s story.
          </p>
        ) : visibleItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">No entries match this filter.</p>
        ) : (
          <ol className="flex flex-col">
            {visibleItems.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex gap-3">
                <TimelineIcon item={item} />
                <div className="border-border flex flex-1 flex-col gap-1.5 border-b pb-4 last:border-b-0">
                  {item.kind === "care" ? (
                    <CareItem
                      item={item}
                      treeId={tree.id}
                      ownerId={tree.owner_id}
                      treeName={tree.name}
                    />
                  ) : (
                    <PhotoItem item={item} treeId={tree.id} coverPhotoId={tree.cover_photo_id} />
                  )}
                </div>
              </li>
            ))}
          </ol>
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
        {!isArchived ? <ArchiveTreeForm action={archiveTreeAction.bind(null, tree.id)} /> : null}
      </div>
    </main>
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
          {formatTimelineDate(entry.occurred_at)}
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
              // eslint-disable-next-line @next/next/no-img-element -- private signed URL
              <img
                key={photo.id}
                src={photo.url}
                alt={`${treeName} — ${CARE_EVENT_LABELS[entry.type]}`}
                loading="lazy"
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
  coverPhotoId,
}: {
  item: Extract<TimelineItem, { kind: "photo" }>;
  treeId: string;
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
          // eslint-disable-next-line @next/next/no-img-element -- private signed URL
          <img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
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
