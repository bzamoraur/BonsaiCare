"use client";

import { TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import { deleteAccountAction } from "./actions";
import type { DeleteAccountState } from "./types";

const initialState: DeleteAccountState = { status: "idle" };

const fieldClass =
  "border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-base outline-none focus-visible:ring-2";

export function DeleteAccountSection() {
  const [state, formAction, pending] = useActionState(deleteAccountAction, initialState);
  const [confirmation, setConfirmation] = useState("");
  const canDelete = confirmation.trim() === "DELETE";

  return (
    <section className="border-destructive/30 flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <TriangleAlert className="text-destructive size-4" aria-hidden="true" />
        <h2 className="text-destructive text-sm font-medium">Delete account</h2>
      </div>
      <p className="text-muted-foreground text-sm">
        This permanently deletes your account and <strong>all</strong> your data — every tree,
        photo, care log, and task. It cannot be undone. Consider exporting your data first.
      </p>
      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor="confirmation" className="text-sm">
          Type <span className="font-mono font-medium">DELETE</span> to confirm.
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className={fieldClass}
          aria-describedby={state.status === "error" ? "delete-error" : undefined}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="destructive" disabled={!canDelete || pending}>
            {pending ? "Deleting…" : "Delete my account"}
          </Button>
          {state.status === "error" ? (
            <span id="delete-error" role="alert" className="text-destructive text-sm">
              {state.message}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
