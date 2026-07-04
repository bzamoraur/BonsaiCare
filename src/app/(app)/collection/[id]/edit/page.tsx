import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getLocationName, listLocations } from "@/server/locations";
import { getTreeTags } from "@/server/tags";
import { getTree } from "@/server/trees";

import { updateTreeAction } from "../actions";
import { EditTreeForm } from "./edit-tree-form";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const tree = await getTree(id);
  return { title: tree ? `Edit ${tree.name}` : "Edit tree" };
}

export default async function EditTreePage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const tree = await getTree(id);
  if (!tree) notFound();

  const [locations, locationValue, treeTags] = await Promise.all([
    listLocations(),
    tree.location_id ? getLocationName(tree.location_id) : Promise.resolve(null),
    getTreeTags(id),
  ]);

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
        <h1 className="text-2xl font-semibold tracking-tight">Edit tree</h1>
      </div>

      <EditTreeForm
        tree={tree}
        action={updateTreeAction.bind(null, id)}
        cancelHref={`/collection/${id}`}
        locationValue={locationValue ?? ""}
        locationOptions={locations.map((l) => l.name)}
        tagsValue={treeTags.map((t) => t.name).join(", ")}
      />
    </main>
  );
}
