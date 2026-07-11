"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Constants } from "@/types/database.types";

import { createTreeAction } from "./actions";
import type { NewTreeFormState } from "./types";

const initialState: NewTreeFormState = { status: "idle" };

const fieldClass =
  "border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-base outline-none focus-visible:ring-2";

export function NewTreeForm() {
  const [state, formAction, pending] = useActionState(createTreeAction, initialState);
  const t = useTranslations("treeForm");
  const tCommon = useTranslations("common");
  const tStage = useTranslations("stages");
  const tHealth = useTranslations("health");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          {t("name")}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={80}
          autoFocus
          placeholder={t("namePlaceholder")}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="species_label" className="text-sm font-medium">
          {t("species")}{" "}
          <span className="text-muted-foreground font-normal">{tCommon("optional")}</span>
        </label>
        <input
          id="species_label"
          name="species_label"
          type="text"
          maxLength={120}
          placeholder={t("speciesPlaceholder")}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="development_stage" className="text-sm font-medium">
          {t("developmentStage")}{" "}
          <span className="text-muted-foreground font-normal">{tCommon("optional")}</span>
        </label>
        <select
          id="development_stage"
          name="development_stage"
          defaultValue=""
          className={fieldClass}
        >
          <option value="">{t("notSureYet")}</option>
          {Constants.public.Enums.development_stage.map((stage) => (
            <option key={stage} value={stage}>
              {tStage(stage)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="health_status" className="text-sm font-medium">
          {t("health")}{" "}
          <span className="text-muted-foreground font-normal">{tCommon("optional")}</span>
        </label>
        <select id="health_status" name="health_status" defaultValue="" className={fieldClass}>
          <option value="">{t("notSureYet")}</option>
          {Constants.public.Enums.health_status.map((status) => (
            <option key={status} value={status}>
              {tHealth(status)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("saveTree")}
        </Button>
        <Link href="/collection" className="text-muted-foreground hover:text-foreground text-sm">
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
