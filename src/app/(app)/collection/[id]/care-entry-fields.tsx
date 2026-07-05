"use client";

import { useState } from "react";

import type { CareEventType } from "@/domain/care";
import { CARE_FIELDS } from "@/lib/care-fields";
import { CARE_EVENT_LABELS } from "@/lib/care-labels";
import { Constants } from "@/types/database.types";

const fieldBase =
  "border-input bg-background focus-visible:ring-ring rounded-md border px-3 text-base outline-none focus-visible:ring-2";
const inputClass = `${fieldBase} h-10`;

export type CareDefaults = {
  type: CareEventType;
  occurredAtDate: string; // "YYYY-MM-DD" or "" (⇒ today, server-side)
  title: string;
  notes: string;
  details: Record<string, string>;
};

/**
 * The shared field set for logging/editing a care entry. Controlled `type` drives
 * which per-type detail fields render; everything else is uncontrolled with
 * defaults, so a parent `<form>` can read it via FormData and `reset()` it. Date
 * is day-granular (care logging is), which keeps it timezone-simple.
 */
export function CareEntryFields({ defaults }: { defaults: CareDefaults }) {
  const [type, setType] = useState<CareEventType>(defaults.type);
  const fields = CARE_FIELDS[type];

  return (
    <>
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
                  defaultValue={defaults.details[field.name] ?? ""}
                  className={inputClass}
                />
              ) : (
                <select
                  id={`care-${field.name}`}
                  name={field.name}
                  defaultValue={defaults.details[field.name] ?? ""}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="care-when" className="text-sm font-medium">
            When <span className="text-muted-foreground font-normal">(defaults to today)</span>
          </label>
          <input
            id="care-when"
            name="occurred_at"
            type="date"
            defaultValue={defaults.occurredAtDate}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="care-title" className="text-sm font-medium">
            Title <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="care-title"
            name="title"
            type="text"
            maxLength={120}
            defaultValue={defaults.title}
            className={inputClass}
          />
        </div>
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
          defaultValue={defaults.notes}
          placeholder="Anything worth remembering."
          className={`${fieldBase} resize-y py-2`}
        />
      </div>
    </>
  );
}
