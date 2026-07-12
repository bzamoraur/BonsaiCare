import type { Hemisphere } from "./scheduling";

/**
 * The four temperate seasons, used for the Today "this season" focus card.
 * Meteorological boundaries (whole months) — precise enough for care guidance
 * and, unlike astronomical dates, they never drift a day at the year's edges.
 */
export type Season = "spring" | "summer" | "autumn" | "winter";

/**
 * The season for a calendar month (1–12) in the given hemisphere. Northern is
 * canonical (Mar–May spring, Jun–Aug summer, Sep–Nov autumn, Dec–Feb winter);
 * the southern hemisphere is the same calendar shifted six months — so southern
 * January reads as summer — matching how `isInSeasonWindow` inverts its window.
 * Pure: the caller passes the month (never reads the clock here).
 */
export function seasonForMonth(month: number, hemisphere: Hemisphere): Season {
  const northern = hemisphere === "southern" ? ((month + 5) % 12) + 1 : month;
  if (northern >= 3 && northern <= 5) return "spring";
  if (northern >= 6 && northern <= 8) return "summer";
  if (northern >= 9 && northern <= 11) return "autumn";
  return "winter"; // 12, 1, 2
}
