import { Leaf } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { DEVELOPMENT_STAGE_LABELS, HEALTH_STATUS_LABELS } from "@/lib/tree-labels";
import type { TreeCard as TreeCardData } from "@/server/trees";

/**
 * Card for one tree in the collection grid — a link to its detail screen. Photos
 * land in a later M2 slice, so the image area shows a botanical placeholder.
 */
export function TreeCard({ tree }: { tree: TreeCardData }) {
  const stage = tree.development_stage ? DEVELOPMENT_STAGE_LABELS[tree.development_stage] : null;
  const health = tree.health_status ? HEALTH_STATUS_LABELS[tree.health_status] : null;

  return (
    <Link
      href={`/collection/${tree.id}`}
      className="focus-visible:ring-ring block rounded-2xl outline-none focus-visible:ring-2"
    >
      <article className="border-border bg-card hover:border-foreground/20 overflow-hidden rounded-2xl border transition-colors">
        <div className="bg-muted flex aspect-square items-center justify-center overflow-hidden">
          {tree.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- private signed URL, next/image caching doesn't fit
            <img src={tree.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <Leaf className="text-muted-foreground/40 size-10" aria-hidden />
          )}
        </div>
        <div className="flex flex-col gap-1 p-3">
          <h2 className="truncate text-sm font-medium" title={tree.name}>
            {tree.name}
          </h2>
          {tree.species_label ? (
            <p className="text-muted-foreground truncate text-xs">{tree.species_label}</p>
          ) : null}
          {stage || health ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {stage ? <Badge>{stage}</Badge> : null}
              {health ? <Badge>{health}</Badge> : null}
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[0.65rem] font-medium">
      {children}
    </span>
  );
}
