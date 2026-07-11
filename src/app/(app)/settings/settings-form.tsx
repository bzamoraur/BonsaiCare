"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("settings");
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="display_name" className="text-sm font-medium">
          {t("displayName")}
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={displayName}
          placeholder={t("displayNamePlaceholder")}
          autoComplete="name"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="hemisphere" className="text-sm font-medium">
          {t("hemisphere")}
        </label>
        <p id="hemisphere-hint" className="text-muted-foreground text-xs">
          {t("hemisphereHint")}
        </p>
        <select
          id="hemisphere"
          name="hemisphere"
          defaultValue={hemisphere}
          aria-describedby="hemisphere-hint"
          className={fieldClass}
        >
          <option value="northern">{t("hemisphereNorthern")}</option>
          <option value="southern">{t("hemisphereSouthern")}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="units" className="text-sm font-medium">
          {t("units")}
        </label>
        <select id="units" name="units" defaultValue={units} className={fieldClass}>
          <option value="metric">{t("unitsMetric")}</option>
          <option value="imperial">{t("unitsImperial")}</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("saveChanges")}
        </Button>
        {/* Persistent live region so "Saved" is reliably announced by AT. */}
        <span role="status" aria-live="polite" className="text-primary text-sm">
          {state.status === "success" ? t("saved") : ""}
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
