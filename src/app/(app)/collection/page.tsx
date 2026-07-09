import { Plus } from "lucide-react";
import Link from "next/link";

import { TreeCard } from "@/components/tree-card";
import { buttonVariants } from "@/components/ui/button";
import type { CareRecency } from "@/domain/care";
import { logActionError } from "@/lib/log-action-error";
import { cn } from "@/lib/utils";
import { listTreeRecency } from "@/server/care";
import { listLocations, type LocationOption } from "@/server/locations";
import { listTags, type TagOption } from "@/server/tags";
import {
  countArchivedTrees,
  listTrees,
  type TreeCard as TreeCardData,
  type TreeFilters,
  type TreeSort,
} from "@/server/trees";
import { Constants } from "@/types/database.types";

import { CollectionToolbar } from "./collection-toolbar";

export const metadata = {
  title: "Collection",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Narrows a raw query value to a valid enum member (or undefined). */
function asEnum<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A raw value only if it's a UUID — so a bad id param is ignored, not a query error. */
function asUuid(value: string | undefined): string | undefined {
  return value && UUID_RE.test(value) ? value : undefined;
}

function parseFilters(sp: SearchParams): TreeFilters {
  const rawSort = first(sp.sort);
  const sort: TreeSort | undefined =
    rawSort === "oldest" || rawSort === "name" ? rawSort : undefined;

  return {
    q: first(sp.q)?.trim() || undefined,
    locationId: asUuid(first(sp.location)),
    tagId: asUuid(first(sp.tag)),
    stage: asEnum(first(sp.stage), Constants.public.Enums.development_stage),
    health: asEnum(first(sp.health), Constants.public.Enums.health_status),
    sort,
  };
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  if (first(sp.archived) === "1") return <ArchivedCollection />;

  const filters = parseFilters(sp);
  // Fetch the archived count in parallel — independent, so its failure (caught →
  // 0) never blanks the active grid; it just hides the "View archived" link.
  const archivedCountPromise = countArchivedTrees().catch((error) => {
    logActionError("collectionPage.archivedCount", error);
    return 0;
  });
  const hasActiveFilters = Boolean(
    filters.q ||
    filters.locationId ||
    filters.tagId ||
    filters.stage ||
    filters.health ||
    filters.sort,
  );

  let trees: TreeCardData[] = [];
  let locations: LocationOption[] = [];
  let tags: TagOption[] = [];
  let loadError = false;
  try {
    [trees, locations, tags] = await Promise.all([listTrees(filters), listLocations(), listTags()]);
  } catch (error) {
    logActionError("collectionPage.load", error);
    loadError = true;
  }

  // Recency chips are a nice-to-have — fetched separately so a failure here (or an
  // empty collection) never blanks the grid; the cards just render without chips.
  let recency = new Map<string, CareRecency>();
  if (!loadError && trees.length > 0) {
    try {
      recency = await listTreeRecency();
    } catch (error) {
      logActionError("collectionPage.recency", error);
    }
  }

  // The server's UTC day — SSR fallback for the client-local "today" the recency
  // chips resolve against (see CareRecencyChips / the S08.9 local-day pattern).
  const serverToday = new Date().toISOString().slice(0, 10);

  // Show the toolbar + Add button whenever the user has trees or is filtering; the
  // bare "add your first tree" state is only for a genuinely empty collection.
  const showToolbar = trees.length > 0 || hasActiveFilters;
  const archivedCount = await archivedCountPromise;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Collection</h1>
        {showToolbar ? (
          <div className="flex items-center gap-2">
            <Link
              href="/plan/schedule"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Plan care
            </Link>
            <Link href="/collection/new" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus aria-hidden />
              Add tree
            </Link>
          </div>
        ) : null}
      </div>

      {loadError ? (
        <p role="alert" className="text-destructive text-sm">
          We couldn&apos;t load your collection right now. Please refresh to try again.
        </p>
      ) : !showToolbar ? (
        <section className="border-border bg-card flex flex-col items-center gap-4 rounded-2xl border p-8 text-center">
          <p className="text-muted-foreground text-balance">
            No trees yet. Add your first bonsai to start tracking its journey.
          </p>
          <Link href="/collection/new" className={cn(buttonVariants())}>
            <Plus aria-hidden />
            Add your first tree
          </Link>
        </section>
      ) : (
        <>
          <CollectionToolbar locations={locations} tags={tags} />
          {trees.length > 0 ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {trees.map((tree) => (
                <li key={tree.id}>
                  <TreeCard tree={tree} recency={recency.get(tree.id)} serverToday={serverToday} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm text-balance">
              No trees match your filters.
            </p>
          )}
        </>
      )}

      {/* Archived trees live off the main grid but stay one tap away. Shown even
          when the active collection is empty (e.g. every tree is archived). */}
      {archivedCount > 0 ? (
        <Link
          href="/collection?archived=1"
          className="text-muted-foreground hover:text-foreground self-start text-sm underline-offset-4 hover:underline"
        >
          View archived ({archivedCount})
        </Link>
      ) : null}
    </main>
  );
}

/** The archived-trees view (`/collection?archived=1`): a simple grid of soft-deleted
 * trees, each linking to its detail page where it can be unarchived. No toolbar or
 * add/plan actions — this is a holding area, not the working collection. */
async function ArchivedCollection() {
  const serverToday = new Date().toISOString().slice(0, 10);

  let trees: TreeCardData[] = [];
  let loadError = false;
  try {
    trees = await listTrees({ archived: true });
  } catch (error) {
    logActionError("collectionPage.archived", error);
    loadError = true;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Archived</h1>
        <Link
          href="/collection"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Collection
        </Link>
      </div>

      {loadError ? (
        <p role="alert" className="text-destructive text-sm">
          We couldn&apos;t load your archived trees right now. Please refresh to try again.
        </p>
      ) : trees.length === 0 ? (
        <p className="text-muted-foreground text-sm text-balance">
          No archived trees. Archiving a tree hides it from your collection without losing its
          history.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm text-balance">
            Hidden from your collection, history intact. Open a tree to unarchive it.
          </p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {trees.map((tree) => (
              <li key={tree.id}>
                <TreeCard tree={tree} serverToday={serverToday} />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
