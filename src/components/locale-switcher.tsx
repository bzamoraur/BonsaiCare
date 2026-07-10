"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setLocale } from "@/i18n/actions";
import { localeLabels, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Segmented English/Español control. Persists the choice via a Server Action (a
 * cookie) then refreshes so the server re-renders in the new locale. Uses the same
 * segmented pattern as the quick-add mode switch.
 */
export function LocaleSwitcher() {
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === current || pending) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <div role="group" aria-label="Language" className="bg-muted flex max-w-xs gap-1 rounded-lg p-1">
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => choose(locale)}
            aria-pressed={active}
            disabled={pending}
            className={cn(
              "focus-visible:ring-ring flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 disabled:opacity-70",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {localeLabels[locale]}
          </button>
        );
      })}
    </div>
  );
}
