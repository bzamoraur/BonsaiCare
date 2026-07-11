"use client";

import { useTranslations } from "next-intl";

import type { CareRecency } from "@/domain/care";
import { type RelativeDay, relativeDay, useLocalToday } from "@/lib/local-day";
import { cn } from "@/lib/utils";

// The two recurring care types worth surfacing at a glance, keyed to their short
// translated verb ("watered" / "fed", "regado" / "abonado").
const CHIP_TYPES = [
  { type: "watering", verbKey: "watered" },
  { type: "fertilizing", verbKey: "fed" },
] as const;

/**
 * "watered 2d ago · fed 12d ago" — when each recurring care type last happened,
 * relative to the viewer's LOCAL today (client component, hydration-safe via
 * `useLocalToday`). Renders nothing when there's no watering/fertilizing history.
 * Chips stay terse in every language so cards keep a uniform height.
 */
export function CareRecencyChips({
  recency,
  serverToday,
  className,
}: {
  recency: CareRecency | undefined;
  serverToday: string;
  className?: string;
}) {
  const t = useTranslations("careRecency");
  const today = useLocalToday(serverToday);
  if (!recency) return null;

  function relLabel(rel: RelativeDay): string {
    switch (rel.kind) {
      case "today":
        return t("today");
      case "yesterday":
        return t("yesterday");
      case "days":
        return t("daysAgo", { days: rel.value });
      case "weeks":
        return t("weeksAgo", { weeks: rel.value });
    }
  }

  const chips = CHIP_TYPES.flatMap(({ type, verbKey }) => {
    const on = recency[type];
    return on ? [`${t(verbKey)} ${relLabel(relativeDay(on, today))}`] : [];
  });
  if (chips.length === 0) return null;

  return <p className={cn("text-muted-foreground text-xs", className)}>{chips.join(" · ")}</p>;
}
