import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { NewTreeForm } from "./new-tree-form";

export const metadata = {
  title: "Add a tree",
};

export default function NewTreePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          href="/collection"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Collection
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Add a tree</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Just a name is enough to start — you can fill in the rest anytime.
        </p>
      </div>

      <NewTreeForm />
    </main>
  );
}
