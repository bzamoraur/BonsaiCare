import { Plus } from "lucide-react";
import Link from "next/link";

import { TreeCard } from "@/components/tree-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listTrees, type TreeCard as TreeCardData } from "@/server/trees";

export const metadata = {
  title: "Collection",
};

export default async function CollectionPage() {
  let trees: TreeCardData[] = [];
  let loadError = false;
  try {
    trees = await listTrees();
  } catch {
    loadError = true;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Collection</h1>
        {trees.length > 0 ? (
          <Link href="/collection/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus aria-hidden />
            Add tree
          </Link>
        ) : null}
      </div>

      {loadError ? (
        <p role="alert" className="text-destructive text-sm">
          We couldn&apos;t load your collection right now. Please refresh to try again.
        </p>
      ) : trees.length === 0 ? (
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
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {trees.map((tree) => (
            <li key={tree.id}>
              <TreeCard tree={tree} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
