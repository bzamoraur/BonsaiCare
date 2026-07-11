import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { NewTreeForm } from "./new-tree-form";

export async function generateMetadata() {
  const t = await getTranslations("treeForm");
  return { title: t("newTitle") };
}

export default async function NewTreePage() {
  const t = await getTranslations("treeForm");
  const tNav = await getTranslations("nav");
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          href="/collection"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {tNav("collection")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("newTitle")}</h1>
        <p className="text-muted-foreground text-sm text-balance">{t("newIntro")}</p>
      </div>

      <NewTreeForm />
    </main>
  );
}
