import { ChevronLeft, Leaf, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { DEVELOPMENT_STAGE_LABELS, HEALTH_STATUS_LABELS, ORIGIN_LABELS } from "@/lib/tree-labels";
import { cn } from "@/lib/utils";
import { getLocationName } from "@/server/locations";
import { listTreePhotos } from "@/server/photos";
import { getTreeTags } from "@/server/tags";
import { getTree } from "@/server/trees";

import { archiveTreeAction } from "./actions";
import { ArchiveTreeForm } from "./archive-tree-form";
import { DeletePhotoButton } from "./delete-photo-button";
import { deletePhotoAction, setCoverAction } from "./photo-actions";
import { PhotoUploader } from "./photo-uploader";

type Params = { id: string };

const ERROR_MESSAGES: Record<string, string> = {
  archive: "We couldn't archive this tree. Please try again.",
  cover: "We couldn't set that cover photo. Please try again.",
  photo: "We couldn't delete that photo. Please try again.",
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
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const [tree, photos, tags] = await Promise.all([
    getTree(id),
    listTreePhotos(id),
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
  const heroPhoto = photos.find((p) => p.id === tree.cover_photo_id) ?? photos[0] ?? null;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;

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

      {/* Hero — the cover photo (or first photo), else a placeholder. */}
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

      {/* Photos */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium">Photos</h2>
          <PhotoUploader treeId={tree.id} ownerId={tree.owner_id} />
        </div>

        {photos.length === 0 ? (
          <p className="text-muted-foreground text-sm text-balance">
            No photos yet. Add one to start this tree&apos;s visual history.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <li key={photo.id} className="flex flex-col gap-1.5">
                <div className="bg-muted aspect-square overflow-hidden rounded-xl">
                  {photo.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- private signed URL, next/image caching doesn't fit
                    <img
                      src={photo.url}
                      alt={`${tree.name} photo`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-1">
                  {photo.id === tree.cover_photo_id ? (
                    <span className="text-muted-foreground px-1 text-xs font-medium">Cover</span>
                  ) : (
                    <form action={setCoverAction.bind(null, tree.id, photo.id)}>
                      <Button type="submit" variant="ghost" size="sm">
                        Set cover
                      </Button>
                    </form>
                  )}
                  <DeletePhotoButton action={deletePhotoAction.bind(null, photo.id, tree.id)} />
                </div>
              </li>
            ))}
          </ul>
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
