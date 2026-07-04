import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TreeNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Tree not found</h1>
      <p className="text-muted-foreground text-balance">
        This tree doesn&apos;t exist, or it isn&apos;t in your collection.
      </p>
      <Link href="/collection" className={cn(buttonVariants())}>
        Back to collection
      </Link>
    </main>
  );
}
