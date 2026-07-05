"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** A delete control with an inline two-step confirm. The bound server action
 * keeps the target ids server-side. Reused for photos and care entries. */
export function ConfirmDeleteButton({
  action,
  srLabel,
}: {
  action: (formData: FormData) => void;
  srLabel: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
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
        Delete
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </form>
  );
}
