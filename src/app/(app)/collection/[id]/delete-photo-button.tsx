"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useRevealFocus } from "@/lib/use-reveal-focus";

/** Delete control with an inline two-step confirm. The bound server action keeps
 * the photo/tree ids server-side. */
export function DeletePhotoButton({ action }: { action: (formData: FormData) => void }) {
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
        variant="ghost"
        size="sm"
        aria-label={t("deletePhotoSr")}
        onClick={() => setConfirming(true)}
      >
        <Trash2 aria-hidden />
      </Button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1">
      <Button type="submit" variant="destructive" size="sm">
        {tCommon("delete")}
      </Button>
      <Button
        ref={revealRef}
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        {tCommon("cancel")}
      </Button>
    </form>
  );
}
