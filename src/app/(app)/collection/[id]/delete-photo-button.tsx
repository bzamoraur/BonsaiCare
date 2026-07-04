"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Delete control with an inline two-step confirm. The bound server action keeps
 * the photo/tree ids server-side. */
export function DeletePhotoButton({ action }: { action: (formData: FormData) => void }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Delete photo"
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
