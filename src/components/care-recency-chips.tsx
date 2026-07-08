"use client";

import type { CareRecency } from "@/domain/care";
import { relativeDayLabel, useLocalToday } from "@/lib/local-day";
import { cn } from "@/lib/utils";

// The two recurring care types worth surfacing at a glance, with short verbs.
const CHIP_TYPES = [
  { type: "watering", verb: "watered" },
  { type: "fertilizing", verb: "fed" },
] as const;

/**
 * "watered 2d ago · fed 12d ago" — when each recurring care type last happened,
 * relative to the viewer's LOCAL today (client component, hydration-safe via
 * `useLocalToday`). Renders nothing when there's no watering/fertilizing history.
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
  const today = useLocalToday(serverToday);
  if (!recency) return null;

  const chips = CHIP_TYPES.flatMap(({ type, verb }) => {
    const on = recency[type];
    return on ? [`${verb} ${relativeDayLabel(on, today)}`] : [];
  });
  if (chips.length === 0) return null;

  return <p className={cn("text-muted-foreground text-xs", className)}>{chips.join(" · ")}</p>;
}
