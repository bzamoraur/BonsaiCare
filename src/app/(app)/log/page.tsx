import { Leaf } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listTrees, type TreeCard } from "@/server/trees";

export const metadata = {
  title: "Log care",
};

export default async function LogPage() {
  let trees: TreeCard[] = [];
  let loadError = false;
  try {
    trees = await listTrees();
  } catch {
    loadError = true;
  }

  // With exactly one tree, skip the picker and go straight to logging.
  if (!loadError && trees.length === 1) {
    redirect(`/collection/${trees[0].id}?log=1`);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Log care</h1>

      {loadError ? (
        <p role="alert" className="text-destructive text-sm">
          We couldn&apos;t load your trees right now. Please refresh to try again.
        </p>
      ) : trees.length === 0 ? (
        <section className="border-border bg-card flex flex-col items-center gap-4 rounded-2xl border p-8 text-center">
          <p className="text-muted-foreground text-balance">
            Add a tree first — then you can log its care from anywhere.
          </p>
          <Link href="/collection/new" className={cn(buttonVariants())}>
            Add a tree
          </Link>
        </section>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">Which tree?</p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {trees.map((tree) => (
              <li key={tree.id}>
                <Link
                  href={`/collection/${tree.id}?log=1`}
                  className="focus-visible:ring-ring block rounded-2xl outline-none focus-visible:ring-2"
                >
                  <article className="border-border bg-card hover:border-foreground/20 overflow-hidden rounded-2xl border transition-colors">
                    <div className="bg-muted flex aspect-square items-center justify-center overflow-hidden">
                      {tree.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- private signed URL, next/image caching doesn't fit
                        <img
                          src={tree.coverUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Leaf className="text-muted-foreground/40 size-10" aria-hidden />
                      )}
                    </div>
                    <div className="p-3">
                      <h2 className="truncate text-sm font-medium" title={tree.name}>
                        {tree.name}
                      </h2>
                    </div>
                  </article>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
