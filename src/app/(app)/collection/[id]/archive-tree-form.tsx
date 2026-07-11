"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { useRevealFocus } from "@/lib/use-reveal-focus";

/**
 * Archive control with an inline two-step confirm (no native dialog). The bound
 * server action is passed in from the detail page so `id` stays server-side.
 */
export function ArchiveTreeForm({ action }: { action: (formData: FormData) => void }) {
  const t = useTranslations("treeDetail");
  const tCommon = useTranslations("common");
  const [confirming, setConfirming] = useState(false);
  const { triggerRef, revealRef } = useRevealFocus<HTMLButtonElement, HTMLButtonElement>(
    confirming,
  );

  if (!confirming) {
    return (
      <Button
        ref={triggerRef}
        type="button"
        variant="destructive"
        onClick={() => setConfirming(true)}
      >
        {t("archiveTree")}
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <span className="text-muted-foreground text-sm text-balance">{t("archiveConfirm")}</span>
      <ArchiveSubmit />
      <Button ref={revealRef} type="button" variant="ghost" onClick={() => setConfirming(false)}>
        {tCommon("cancel")}
      </Button>
    </form>
  );
}

function ArchiveSubmit() {
  const t = useTranslations("treeDetail");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? t("archiving") : t("archiveYes")}
    </Button>
  );
}
