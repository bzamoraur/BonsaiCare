"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DEVELOPMENT_STAGE_LABELS, HEALTH_STATUS_LABELS, ORIGIN_LABELS } from "@/lib/tree-labels";
import { Constants, type Tables } from "@/types/database.types";

import type { TreeFormState } from "../types";

const initialState: TreeFormState = { status: "idle" };

const fieldBase =
  "border-input bg-background focus-visible:ring-ring rounded-md border px-3 text-base outline-none focus-visible:ring-2";
const inputClass = `${fieldBase} h-10`;

type Props = {
  tree: Tables<"trees">;
  action: (prev: TreeFormState, formData: FormData) => Promise<TreeFormState>;
  cancelHref: string;
};

export function EditTreeForm({ tree, action, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field id="name" label="Name">
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={80}
          defaultValue={tree.name}
          className={inputClass}
        />
      </Field>

      <Field id="species_label" label="Species" optional>
        <input
          id="species_label"
          name="species_label"
          type="text"
          maxLength={120}
          defaultValue={tree.species_label ?? ""}
          placeholder="e.g. Juniperus procumbens"
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="development_stage" label="Development stage" optional>
          <select
            id="development_stage"
            name="development_stage"
            defaultValue={tree.development_stage ?? ""}
            className={inputClass}
          >
            <option value="">Not set</option>
            {Constants.public.Enums.development_stage.map((value) => (
              <option key={value} value={value}>
                {DEVELOPMENT_STAGE_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="health_status" label="Health" optional>
          <select
            id="health_status"
            name="health_status"
            defaultValue={tree.health_status ?? ""}
            className={inputClass}
          >
            <option value="">Not set</option>
            {Constants.public.Enums.health_status.map((value) => (
              <option key={value} value={value}>
                {HEALTH_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="origin" label="Origin" optional>
          <select id="origin" name="origin" defaultValue={tree.origin ?? ""} className={inputClass}>
            <option value="">Not set</option>
            {Constants.public.Enums.tree_origin.map((value) => (
              <option key={value} value={value}>
                {ORIGIN_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="style" label="Style" optional>
          <input
            id="style"
            name="style"
            type="text"
            maxLength={60}
            defaultValue={tree.style ?? ""}
            placeholder="e.g. Informal upright"
            className={inputClass}
          />
        </Field>

        <Field id="current_pot" label="Pot" optional>
          <input
            id="current_pot"
            name="current_pot"
            type="text"
            maxLength={80}
            defaultValue={tree.current_pot ?? ""}
            className={inputClass}
          />
        </Field>

        <Field id="current_substrate" label="Substrate" optional>
          <input
            id="current_substrate"
            name="current_substrate"
            type="text"
            maxLength={80}
            defaultValue={tree.current_substrate ?? ""}
            className={inputClass}
          />
        </Field>

        <Field id="acquired_on" label="Acquired on" optional>
          <input
            id="acquired_on"
            name="acquired_on"
            type="date"
            defaultValue={tree.acquired_on ?? ""}
            className={inputClass}
          />
        </Field>

        <Field id="acquired_from" label="Acquired from" optional>
          <input
            id="acquired_from"
            name="acquired_from"
            type="text"
            maxLength={120}
            defaultValue={tree.acquired_from ?? ""}
            placeholder="e.g. Local nursery"
            className={inputClass}
          />
        </Field>
      </div>

      <Field id="notes" label="Notes" optional>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={2000}
          defaultValue={tree.notes ?? ""}
          placeholder="Anything worth remembering about this tree."
          className={`${fieldBase} resize-y py-2`}
        />
      </Field>

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

function Field({
  id,
  label,
  optional,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}{" "}
        {optional ? <span className="text-muted-foreground font-normal">(optional)</span> : null}
      </label>
      {children}
    </div>
  );
}
