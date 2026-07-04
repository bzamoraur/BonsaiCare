"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { DEVELOPMENT_STAGE_LABELS, HEALTH_STATUS_LABELS } from "@/lib/tree-labels";
import { Constants } from "@/types/database.types";

import { createTreeAction } from "./actions";
import type { NewTreeFormState } from "./types";

const initialState: NewTreeFormState = { status: "idle" };

const fieldClass =
  "border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-base outline-none focus-visible:ring-2";

export function NewTreeForm() {
  const [state, formAction, pending] = useActionState(createTreeAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={80}
          autoFocus
          placeholder="e.g. Front-door juniper"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="species_label" className="text-sm font-medium">
          Species <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          id="species_label"
          name="species_label"
          type="text"
          maxLength={120}
          placeholder="e.g. Juniperus procumbens"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="development_stage" className="text-sm font-medium">
          Development stage <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <select
          id="development_stage"
          name="development_stage"
          defaultValue=""
          className={fieldClass}
        >
          <option value="">Not sure yet</option>
          {Constants.public.Enums.development_stage.map((stage) => (
            <option key={stage} value={stage}>
              {DEVELOPMENT_STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="health_status" className="text-sm font-medium">
          Health <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <select id="health_status" name="health_status" defaultValue="" className={fieldClass}>
          <option value="">Not sure yet</option>
          {Constants.public.Enums.health_status.map((status) => (
            <option key={status} value={status}>
              {HEALTH_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save tree"}
        </Button>
        <Link href="/collection" className="text-muted-foreground hover:text-foreground text-sm">
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
