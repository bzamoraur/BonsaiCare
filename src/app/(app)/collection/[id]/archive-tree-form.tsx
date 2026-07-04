"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * Archive control with an inline two-step confirm (no native dialog). The bound
 * server action is passed in from the detail page so `id` stays server-side.
 */
export function ArchiveTreeForm({ action }: { action: (formData: FormData) => void }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
        Archive tree
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <span className="text-muted-foreground text-sm">Archive this tree?</span>
      <ArchiveSubmit />
      <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </form>
  );
}

function ArchiveSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Archiving…" : "Yes, archive"}
    </Button>
  );
}
