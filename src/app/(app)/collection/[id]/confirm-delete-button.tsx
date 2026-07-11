"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useRevealFocus } from "@/lib/use-reveal-focus";

/** A delete control with an inline two-step confirm. The bound server action
 * keeps the target ids server-side. Reused for photos and care entries. */
export function ConfirmDeleteButton({
  action,
  srLabel,
}: {
  action: (formData: FormData) => void;
  srLabel: string;
}) {
  const t = useTranslations("common");
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
        aria-label={srLabel}
        onClick={() => setConfirming(true)}
      >
        <Trash2 aria-hidden />
      </Button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1">
      <Button type="submit" variant="destructive" size="sm">
        {t("delete")}
      </Button>
      <Button
        ref={revealRef}
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        {t("cancel")}
      </Button>
    </form>
  );
}
