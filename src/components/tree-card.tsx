"use client";

import { Leaf } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";

import { CareRecencyChips } from "@/components/care-recency-chips";
import { Photo } from "@/components/photo";
import type { CareRecency } from "@/domain/care";
import type { TreeCard as TreeCardData } from "@/server/trees";

/**
 * Card for one tree in the collection grid — a link to its detail screen. Photos
 * land in a later M2 slice, so the image area shows a botanical placeholder.
 */
export function TreeCard({
  tree,
  recency,
  serverToday,
}: {
  tree: TreeCardData;
  recency?: CareRecency;
  serverToday: string;
}) {
  const tStage = useTranslations("stages");
  const tHealth = useTranslations("health");
  const stage = tree.development_stage ? tStage(tree.development_stage) : null;
  const health = tree.health_status ? tHealth(tree.health_status) : null;

  return (
    <Link
      href={`/collection/${tree.id}`}
      className="focus-visible:ring-ring block h-full rounded-2xl outline-none focus-visible:ring-2"
    >
      {/* h-full + flex column so every card fills its grid row equally (the grids use
          auto-rows-fr); ragged content can't change the card height. */}
      <article className="border-border bg-card hover:border-foreground/20 flex h-full flex-col overflow-hidden rounded-2xl border transition-colors">
        <div className="bg-muted flex aspect-square shrink-0 items-center justify-center overflow-hidden">
          {tree.coverUrl ? (
            <Photo
              thumbSrc={tree.coverThumbUrl}
              fullSrc={tree.coverUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Leaf className="text-muted-foreground/40 size-10" aria-hidden />
          )}
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h2 className="font-heading truncate text-sm font-medium" title={tree.name}>
            {tree.name}
          </h2>
          {/* Always render the species line (nbsp fallback) so with/without species is
              the same height. */}
          <p className="text-muted-foreground min-h-[1.25rem] truncate text-xs">
            {tree.species_label ?? " "}
          </p>
          {/* Meta pinned to the bottom with a reserved floor, so badge/chip presence
              never shifts the card's height. */}
          <div className="mt-auto flex min-h-[1.5rem] flex-col gap-1 pt-2">
            {stage || health ? (
              <div className="flex flex-wrap gap-1">
                {stage ? <Badge>{stage}</Badge> : null}
                {health ? <Badge>{health}</Badge> : null}
              </div>
            ) : null}
            <CareRecencyChips recency={recency} serverToday={serverToday} />
          </div>
        </div>
      </article>
    </Link>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[0.65rem] font-medium whitespace-nowrap">
      {children}
    </span>
  );
}
