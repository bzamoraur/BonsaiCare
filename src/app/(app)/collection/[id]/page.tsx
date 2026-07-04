import { ChevronLeft, Leaf, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { DEVELOPMENT_STAGE_LABELS, HEALTH_STATUS_LABELS, ORIGIN_LABELS } from "@/lib/tree-labels";
import { cn } from "@/lib/utils";
import { getTree } from "@/server/trees";

import { archiveTreeAction } from "./actions";
import { ArchiveTreeForm } from "./archive-tree-form";

type Params = { id: string };

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
  const tree = await getTree(id);
  if (!tree) notFound();

  const facts = [
    {
      label: "Development stage",
      value: tree.development_stage ? DEVELOPMENT_STAGE_LABELS[tree.development_stage] : null,
    },
    {
      label: "Health",
      value: tree.health_status ? HEALTH_STATUS_LABELS[tree.health_status] : null,
    },
    { label: "Origin", value: tree.origin ? ORIGIN_LABELS[tree.origin] : null },
    { label: "Style", value: tree.style },
    { label: "Pot", value: tree.current_pot },
    { label: "Substrate", value: tree.current_substrate },
    { label: "Acquired", value: tree.acquired_on ? formatAcquired(tree.acquired_on) : null },
    { label: "Acquired from", value: tree.acquired_from },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  const isArchived = Boolean(tree.archived_at);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <Link
        href="/collection"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Collection
      </Link>

      {error === "archive" ? (
        <p role="alert" className="text-destructive text-sm">
          We couldn&apos;t archive this tree. Please try again.
        </p>
      ) : null}

      {/* Hero — cover photo lands in the photo slice. */}
      <div className="bg-muted flex aspect-video items-center justify-center rounded-2xl">
        <Leaf className="text-muted-foreground/40 size-16" aria-hidden />
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

      {facts.length === 0 && !tree.notes ? (
        <p className="text-muted-foreground text-sm text-balance">
          No details yet. Use Edit to add species, stage, notes and more.
        </p>
      ) : null}

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
