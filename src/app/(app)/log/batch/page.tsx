import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { logActionError } from "@/lib/log-action-error";
import { listTrees, type TreeCard } from "@/server/trees";

import { logBatchCareAction } from "./actions";
import { BatchLogForm } from "./batch-log-form";

export async function generateMetadata() {
  const t = await getTranslations("log");
  return { title: t("batchTitle") };
}

export default async function BatchLogPage() {
  const t = await getTranslations("log");
  let trees: TreeCard[] = [];
  let loadError = false;
  try {
    trees = await listTrees();
  } catch (error) {
    logActionError("batchLogPage.load", error);
    loadError = true;
  }

  // Batch logging needs at least two trees; otherwise the single-tree funnel wins.
  if (!loadError && trees.length < 2) {
    redirect("/log");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("batchHeading")}</h1>
        <p className="text-muted-foreground text-sm text-balance">{t("batchIntro")}</p>
      </div>

      {loadError ? (
        <p role="alert" className="text-destructive text-sm">
          {t("loadError")}
        </p>
      ) : (
        <BatchLogForm
          trees={trees.map((tree) => ({ id: tree.id, name: tree.name }))}
          action={logBatchCareAction}
        />
      )}
    </main>
  );
}
