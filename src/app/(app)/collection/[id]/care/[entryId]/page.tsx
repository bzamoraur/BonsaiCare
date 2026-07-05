import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCareEntry } from "@/server/care";
import { getTree } from "@/server/trees";

import { updateCareAction } from "../../care-actions";
import { type CareDefaults } from "../../care-entry-fields";
import { EditCareForm } from "../../edit-care-form";

export const metadata = {
  title: "Edit care entry",
};

type Params = { id: string; entryId: string };

/** care entry details are all string values, but the column is Json. */
function detailsToStrings(details: unknown): Record<string, string> {
  if (!details || typeof details !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export default async function EditCarePage({ params }: { params: Promise<Params> }) {
  const { id, entryId } = await params;
  const [tree, entry] = await Promise.all([getTree(id), getCareEntry(entryId)]);
  if (!tree || !entry || entry.tree_id !== id) notFound();

  const defaults: CareDefaults = {
    type: entry.type,
    occurredAtDate: entry.occurred_at.slice(0, 10),
    title: entry.title ?? "",
    notes: entry.notes ?? "",
    details: detailsToStrings(entry.details),
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          href={`/collection/${id}`}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {tree.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit care entry</h1>
      </div>

      <EditCareForm
        action={updateCareAction.bind(null, id, entryId)}
        defaults={defaults}
        cancelHref={`/collection/${id}`}
      />
    </main>
  );
}
