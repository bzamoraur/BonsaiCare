"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CareEventType } from "@/domain/care";
import { CARE_FIELDS } from "@/lib/care-fields";
import { CARE_EVENT_LABELS } from "@/lib/care-labels";
import { Constants } from "@/types/database.types";

import type { LogCareState } from "./care-types";

const initialState: LogCareState = { status: "idle" };

const fieldBase =
  "border-input bg-background focus-visible:ring-ring rounded-md border px-3 text-base outline-none focus-visible:ring-2";
const inputClass = `${fieldBase} h-10`;

type Props = {
  action: (prev: LogCareState, formData: FormData) => Promise<LogCareState>;
};

export function LogCareForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CareEventType>("watering");
  const [when, setWhen] = useState(""); // datetime-local; empty ⇒ "now" on the server
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the uncontrolled fields (notes, per-type details) after a successful
  // log so the next entry starts fresh. The selected type is intentionally kept —
  // it's common to log several of the same kind in a row.
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

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

  const fields = CARE_FIELDS[type];

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="care-type" className="text-sm font-medium">
          What did you do?
        </label>
        <select
          id="care-type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as CareEventType)}
          className={inputClass}
        >
          {Constants.public.Enums.care_event_type.map((t) => (
            <option key={t} value={t}>
              {CARE_EVENT_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {fields.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label htmlFor={`care-${field.name}`} className="text-sm font-medium">
                {field.label}
              </label>
              {field.kind === "text" ? (
                <input
                  id={`care-${field.name}`}
                  name={field.name}
                  type="text"
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  className={inputClass}
                />
              ) : (
                <select
                  id={`care-${field.name}`}
                  name={field.name}
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">—</option>
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="care-when" className="text-sm font-medium">
          When <span className="text-muted-foreground font-normal">(defaults to now)</span>
        </label>
        <input
          id="care-when"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className={inputClass}
        />
        {/* Send a proper ISO instant so backdating is timezone-correct. */}
        <input type="hidden" name="occurred_at" value={when ? new Date(when).toISOString() : ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="care-notes" className="text-sm font-medium">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="care-notes"
          name="notes"
          rows={2}
          maxLength={2000}
          placeholder="Anything worth remembering."
          className={`${fieldBase} resize-y py-2`}
        />
      </div>

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
