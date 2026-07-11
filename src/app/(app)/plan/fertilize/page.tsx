import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { listTrees } from "@/server/trees";

import { createFertilizePlanAction } from "./actions";
import { FertilizeForm } from "./fertilize-form";

export async function generateMetadata() {
  const t = await getTranslations("plan");
  return { title: t("fertilizeTitle") };
}

export default async function FertilizePlanPage() {
  const t = await getTranslations("plan");
  const tNav = await getTranslations("nav");
  const trees = await listTrees();
  const defaultDueOn = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <Link
        href="/collection"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {tNav("collection")}
      </Link>

      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("fertilizeTitle")}</h1>
        <p className="text-muted-foreground text-sm text-balance">{t("fertilizeIntro")}</p>
      </header>

      {trees.length === 0 ? (
        <p className="text-muted-foreground text-sm text-balance">{t("fertilizeNoTrees")}</p>
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
