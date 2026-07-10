"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import type { CareEventType } from "@/domain/care";
import { CARE_FIELDS } from "@/lib/care-fields";
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

/** Per-type last-used detail values (field name → value), used to pre-fill the
 * detail fields when logging — so re-logging a routine (e.g. the same watering
 * amount) starts filled in. */
export type CareLastByType = Partial<Record<CareEventType, Record<string, string>>>;

/**
 * The shared field set for logging/editing a care entry (single or batch).
 * Controlled `type` drives which per-type detail fields render; everything else
 * is uncontrolled with defaults, so a parent `<form>` can read it via FormData and
 * `reset()` it. Date is day-granular (care logging is), which keeps it
 * timezone-simple.
 *
 * `idPrefix` namespaces the field ids/label associations. It matters when two
 * instances can be in the DOM at once — e.g. the global quick-add sheet open over
 * a tree page that also renders this form — where shared ids would otherwise make
 * a label point at the wrong (hidden) input. Defaults to `care` so existing single
 * mounts keep their stable ids.
 */
export function CareEntryFields({
  defaults,
  idPrefix = "care",
  lastByType,
}: {
  defaults: CareDefaults;
  idPrefix?: string;
  lastByType?: CareLastByType;
}) {
  const [type, setType] = useState<CareEventType>(defaults.type);
  const tCare = useTranslations("careTypes");
  const fields = CARE_FIELDS[type];

  // Prefer the explicit default (e.g. when editing an entry), then the last-used
  // value for the current type, then empty. Keyed by type below so switching type
  // re-applies the right pre-fill.
  const detailDefault = (name: string) =>
    defaults.details[name] ?? lastByType?.[type]?.[name] ?? "";

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-type`} className="text-sm font-medium">
          What did you do?
        </label>
        <select
          id={`${idPrefix}-type`}
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as CareEventType)}
          className={inputClass}
        >
          {Constants.public.Enums.care_event_type.map((t) => (
            <option key={t} value={t}>
              {tCare(t)}
            </option>
          ))}
        </select>
      </div>

      {fields.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            // Key by type so switching care type remounts the detail fields and
            // re-applies that type's pre-fill (some names, e.g. "amount", recur).
            <div key={`${type}-${field.name}`} className="flex flex-col gap-1.5">
              <label htmlFor={`${idPrefix}-${field.name}`} className="text-sm font-medium">
                {field.label}
              </label>
              {field.kind === "text" ? (
                <input
                  id={`${idPrefix}-${field.name}`}
                  name={field.name}
                  type="text"
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  defaultValue={detailDefault(field.name)}
                  className={inputClass}
                />
              ) : (
                <select
                  id={`${idPrefix}-${field.name}`}
                  name={field.name}
                  defaultValue={detailDefault(field.name)}
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
          <label htmlFor={`${idPrefix}-when`} className="text-sm font-medium">
            When <span className="text-muted-foreground font-normal">(defaults to today)</span>
          </label>
          <input
            id={`${idPrefix}-when`}
            name="occurred_at"
            type="date"
            defaultValue={defaults.occurredAtDate}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-title`} className="text-sm font-medium">
            Title <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id={`${idPrefix}-title`}
            name="title"
            type="text"
            maxLength={120}
            defaultValue={defaults.title}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-notes`} className="text-sm font-medium">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id={`${idPrefix}-notes`}
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
