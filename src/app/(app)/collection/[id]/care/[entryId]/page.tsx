import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { type CareDefaults } from "@/components/care-entry-fields";
import { careDetailsToStrings } from "@/lib/care-details";
import { getCareEntry } from "@/server/care";
import { getTree } from "@/server/trees";

import { updateCareAction } from "../../care-actions";
import { EditCareForm } from "../../edit-care-form";

export async function generateMetadata() {
  const t = await getTranslations("careForm");
  return { title: t("editTitle") };
}

type Params = { id: string; entryId: string };

export default async function EditCarePage({ params }: { params: Promise<Params> }) {
  const { id, entryId } = await params;
  const [tree, entry, t] = await Promise.all([
    getTree(id),
    getCareEntry(entryId),
    getTranslations("careForm"),
  ]);
  if (!tree || !entry || entry.tree_id !== id) notFound();

  const defaults: CareDefaults = {
    type: entry.type,
    occurredAtDate: entry.occurred_on,
    title: entry.title ?? "",
    notes: entry.notes ?? "",
    details: careDetailsToStrings(entry.details),
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
        <h1 className="text-2xl font-semibold tracking-tight">{t("editTitle")}</h1>
      </div>

      <EditCareForm
        action={updateCareAction.bind(null, id, entryId)}
        defaults={defaults}
        cancelHref={`/collection/${id}`}
      />
    </main>
  );
}
