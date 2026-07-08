"use client";

import Link from "next/link";
import { useActionState } from "react";

import { type CareDefaults, CareEntryFields } from "@/components/care-entry-fields";
import { Button } from "@/components/ui/button";

import type { LogCareState } from "./care-types";

const initialState: LogCareState = { status: "idle" };

type Props = {
  action: (prev: LogCareState, formData: FormData) => Promise<LogCareState>;
  defaults: CareDefaults;
  cancelHref: string;
};

/** Edit an existing care entry. Success redirects (server-side), so only the
 * error state renders. */
export function EditCareForm({ action, defaults, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <CareEntryFields defaults={defaults} />

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Link href={cancelHref} className="text-muted-foreground hover:text-foreground text-sm">
          Cancel
        </Link>
        {state.status === "error" ? (
          <span role="alert" className="text-destructive text-sm">
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
