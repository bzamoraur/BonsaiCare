"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database.types";

import { updateProfile } from "./actions";
import type { ProfileFormState } from "./types";

const initialState: ProfileFormState = { status: "idle" };

const fieldClass =
  "border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-base outline-none focus-visible:ring-2";

type Props = {
  displayName: string;
  hemisphere: Database["public"]["Enums"]["hemisphere"];
  units: Database["public"]["Enums"]["units"];
};

export function SettingsForm({ displayName, hemisphere, units }: Props) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="display_name" className="text-sm font-medium">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={displayName}
          placeholder="Your name"
          autoComplete="name"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="hemisphere" className="text-sm font-medium">
          Hemisphere
        </label>
        <p className="text-muted-foreground text-xs">
          Drives seasonal care timing, so getting this right matters.
        </p>
        <select id="hemisphere" name="hemisphere" defaultValue={hemisphere} className={fieldClass}>
          <option value="northern">Northern</option>
          <option value="southern">Southern</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="units" className="text-sm font-medium">
          Units
        </label>
        <select id="units" name="units" defaultValue={units} className={fieldClass}>
          <option value="metric">Metric (°C, cm)</option>
          <option value="imperial">Imperial (°F, in)</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state.status === "success" ? (
          <span className="text-primary text-sm" role="status">
            Saved ✓
          </span>
        ) : null}
        {state.status === "error" ? (
          <span className="text-destructive text-sm" role="alert">
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
