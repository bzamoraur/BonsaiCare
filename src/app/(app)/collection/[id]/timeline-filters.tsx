"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

/** URL-driven type filter for the timeline (shareable, refresh-safe). "All" is
 * the default (no `type` param). */
export function TimelineFilters({ options }: { options: FilterOption[] }) {
  const t = useTranslations("treeDetail");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("type") ?? "";

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("type", value);
    else params.delete("type");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const chips: FilterOption[] = [{ value: "", label: t("filterAll") }, ...options];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("filterAria")}>
      {chips.map((chip) => {
        const active = chip.value === current;
        return (
          <button
            key={chip.value || "all"}
            type="button"
            aria-pressed={active}
            onClick={() => select(chip.value)}
            className={cn(
              "focus-visible:ring-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
