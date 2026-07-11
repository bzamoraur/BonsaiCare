"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
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
  locationValue: string;
  locationOptions: string[];
  tagsValue: string;
};

export function EditTreeForm({
  tree,
  action,
  cancelHref,
  locationValue,
  locationOptions,
  tagsValue,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const t = useTranslations("treeForm");
  const tCommon = useTranslations("common");
  const tStage = useTranslations("stages");
  const tHealth = useTranslations("health");
  const tOrigin = useTranslations("origins");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field id="name" label={t("name")}>
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

      <Field id="species_label" label={t("species")} optional>
        <input
          id="species_label"
          name="species_label"
          type="text"
          maxLength={120}
          defaultValue={tree.species_label ?? ""}
          placeholder={t("speciesPlaceholder")}
          className={inputClass}
        />
      </Field>

      <Field id="location" label={t("location")} optional>
        <input
          id="location"
          name="location"
          type="text"
          list="location-options"
          maxLength={60}
          defaultValue={locationValue}
          placeholder={t("locationPlaceholder")}
          className={inputClass}
        />
        <datalist id="location-options">
          {locationOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="development_stage" label={t("developmentStage")} optional>
          <select
            id="development_stage"
            name="development_stage"
            defaultValue={tree.development_stage ?? ""}
            className={inputClass}
          >
            <option value="">{t("notSet")}</option>
            {Constants.public.Enums.development_stage.map((value) => (
              <option key={value} value={value}>
                {tStage(value)}
              </option>
            ))}
          </select>
        </Field>

        <Field id="health_status" label={t("health")} optional>
          <select
            id="health_status"
            name="health_status"
            defaultValue={tree.health_status ?? ""}
            className={inputClass}
          >
            <option value="">{t("notSet")}</option>
            {Constants.public.Enums.health_status.map((value) => (
              <option key={value} value={value}>
                {tHealth(value)}
              </option>
            ))}
          </select>
        </Field>

        <Field id="origin" label={t("origin")} optional>
          <select id="origin" name="origin" defaultValue={tree.origin ?? ""} className={inputClass}>
            <option value="">{t("notSet")}</option>
            {Constants.public.Enums.tree_origin.map((value) => (
              <option key={value} value={value}>
                {tOrigin(value)}
              </option>
            ))}
          </select>
        </Field>

        <Field id="style" label={t("style")} optional>
          <input
            id="style"
            name="style"
            type="text"
            maxLength={60}
            defaultValue={tree.style ?? ""}
            placeholder={t("stylePlaceholder")}
            className={inputClass}
          />
        </Field>

        <Field id="current_pot" label={t("pot")} optional>
          <input
            id="current_pot"
            name="current_pot"
            type="text"
            maxLength={80}
            defaultValue={tree.current_pot ?? ""}
            className={inputClass}
          />
        </Field>

        <Field id="current_substrate" label={t("substrate")} optional>
          <input
            id="current_substrate"
            name="current_substrate"
            type="text"
            maxLength={80}
            defaultValue={tree.current_substrate ?? ""}
            className={inputClass}
          />
        </Field>

        <Field id="acquired_on" label={t("acquiredOn")} optional>
          <input
            id="acquired_on"
            name="acquired_on"
            type="date"
            defaultValue={tree.acquired_on ?? ""}
            className={inputClass}
          />
        </Field>

        <Field id="acquired_from" label={t("acquiredFrom")} optional>
          <input
            id="acquired_from"
            name="acquired_from"
            type="text"
            maxLength={120}
            defaultValue={tree.acquired_from ?? ""}
            placeholder={t("acquiredFromPlaceholder")}
            className={inputClass}
          />
        </Field>
      </div>

      <Field id="tags" label={t("tags")} optional>
        <input
          id="tags"
          name="tags"
          type="text"
          defaultValue={tagsValue}
          placeholder={t("tagsPlaceholder")}
          className={inputClass}
        />
      </Field>

      <Field id="notes" label={tCommon("notes")} optional>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={2000}
          defaultValue={tree.notes ?? ""}
          placeholder={t("notesPlaceholder")}
          className={`${fieldBase} resize-y py-2`}
        />
      </Field>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("saveChanges")}
        </Button>
        <Link href={cancelHref} className="text-muted-foreground hover:text-foreground text-sm">
          {tCommon("cancel")}
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
  const tCommon = useTranslations("common");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}{" "}
        {optional ? (
          <span className="text-muted-foreground font-normal">{tCommon("optional")}</span>
        ) : null}
      </label>
      {children}
    </div>
  );
}
