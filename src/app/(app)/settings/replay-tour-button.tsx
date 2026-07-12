"use client";

import { useTranslations } from "next-intl";

import { OPEN_ONBOARDING_EVENT } from "@/components/onboarding-tour";
import { Button } from "@/components/ui/button";

/**
 * Re-opens the first-run onboarding tour from Settings. The tour lives in the
 * persistent (app) shell, so this just dispatches a window event it listens for —
 * no navigation and no DB write, so replaying never clears the "seen" flag.
 */
export function ReplayTourButton() {
  const t = useTranslations("onboarding");
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-fit"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_ONBOARDING_EVENT))}
    >
      {t("replay")}
    </Button>
  );
}
