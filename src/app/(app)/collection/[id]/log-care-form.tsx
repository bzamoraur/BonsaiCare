"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { type CareDefaults, CareEntryFields } from "@/components/care-entry-fields";
import type { LogCareState } from "./care-types";

const initialState: LogCareState = { status: "idle" };

const CREATE_DEFAULTS: CareDefaults = {
  type: "watering",
  occurredAtDate: "",
  title: "",
  notes: "",
  details: {},
};

type Props = {
  action: (prev: LogCareState, formData: FormData) => Promise<LogCareState>;
  /** Start expanded — used when arriving from the global "+" (`?log=1`). */
  defaultOpen?: boolean;
};

export function LogCareForm({ action, defaultOpen = false }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(defaultOpen);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the uncontrolled fields after a successful log so the next entry starts
  // fresh. (The selected type is kept — it's common to log several in a row.)
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  // Arriving via ?log=1 (the quick-log entry point) opens the form, but it lives
  // far down a long profile — you'd land at the top and have to hunt for it
  // (finding #5). Bring it into view and focus the first field so logging is
  // immediate. Runs once on mount; honors reduced-motion.
  useEffect(() => {
    if (!defaultOpen) return;
    const form = formRef.current;
    if (!form) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    form.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    // preventScroll so the focus doesn't fight the smooth scroll above.
    form.querySelector<HTMLSelectElement>("#care-type")?.focus({ preventScroll: true });
  }, [defaultOpen]);

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus aria-hidden />
          Log care
        </Button>
        {state.status === "success" ? (
          <span role="status" className="text-primary text-sm">
            Logged ✓
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-4"
    >
      <CareEntryFields defaults={CREATE_DEFAULTS} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Logging…" : "Log it"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
        <span role="status" aria-live="polite" className="text-primary text-sm">
          {state.status === "success" ? "Logged ✓" : ""}
        </span>
        {state.status === "error" ? (
          <span role="alert" className="text-destructive text-sm">
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
