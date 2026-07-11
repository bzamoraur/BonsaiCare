import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function TreeNotFound() {
  const t = await getTranslations("treeDetail");
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground text-balance">{t("notFoundBody")}</p>
      <Link href="/collection" className={cn(buttonVariants())}>
        {t("backToCollection")}
      </Link>
    </main>
  );
}
