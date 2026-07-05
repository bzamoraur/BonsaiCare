import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { listTrees } from "@/server/trees";

import { createFertilizePlanAction } from "./actions";
import { FertilizeForm } from "./fertilize-form";

export const metadata = {
  title: "Fertilizing schedule",
};

export default async function FertilizePlanPage() {
  const trees = await listTrees();
  const defaultDueOn = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <Link
        href="/collection"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Collection
      </Link>

      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Fertilizing schedule</h1>
        <p className="text-muted-foreground text-sm text-balance">
          The classic bonsai plan — every 14 days through the growing season — set up across as many
          trees as you like. It skips winter automatically, and you can edit any of it later per
          tree.
        </p>
      </header>

      {trees.length === 0 ? (
        <p className="text-muted-foreground text-sm text-balance">
          Add a tree first, then come back to plan its feeding.
        </p>
      ) : (
        <FertilizeForm
          trees={trees.map((tree) => ({ id: tree.id, name: tree.name }))}
          defaultDueOn={defaultDueOn}
          action={createFertilizePlanAction}
        />
      )}
    </main>
  );
}
