import { Leaf, Snowflake, Sprout, Sun } from "lucide-react";

import type { Season } from "@/domain/season";
import { cn } from "@/lib/utils";

const ICONS: Record<Season, typeof Sprout> = {
  spring: Sprout,
  summer: Sun,
  autumn: Leaf,
  winter: Snowflake,
};

// A quiet seasonal accent behind the icon — theme-aware so it reads on both grounds.
const ACCENTS: Record<Season, string> = {
  spring: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  summer: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  autumn: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  winter: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

/**
 * A gentle top-of-day orientation: the current season (in the owner's
 * hemisphere) and a one-line care focus. Presentational — the page resolves the
 * hemisphere, season, and translated copy and passes them in.
 */
export function SeasonalCard({
  season,
  heading,
  title,
  focus,
}: {
  season: Season;
  heading: string;
  title: string;
  focus: string;
}) {
  const Icon = ICONS[season];
  return (
    <section className="border-border bg-card flex items-start gap-3 rounded-2xl border p-4">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          ACCENTS[season],
        )}
      >
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {heading}
        </p>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm text-balance">{focus}</p>
      </div>
    </section>
  );
}
