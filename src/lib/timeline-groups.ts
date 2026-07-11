import type { TimelineItem } from "@/server/timeline";

export type TimelineMonthGroup = { key: string; label: string; items: TimelineItem[] };

/**
 * Group a date-descending timeline into month sections ("folders"), newest month
 * first, preserving item order within each. `item.date` is a bare calendar day
 * (YYYY-MM-DD) for both care and photo items, so the month key is timezone-free
 * and always agrees with the per-item date label the page renders. The `label`
 * ("July 2026" / "julio de 2026") is formatted in the caller's `locale`.
 *
 * A Map (not run-length grouping) keeps this robust even if the input weren't
 * perfectly month-contiguous — first-seen order still yields newest-first months.
 */
export function groupTimelineByMonth(items: TimelineItem[], locale: string): TimelineMonthGroup[] {
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const byKey = new Map<string, TimelineMonthGroup>();
  for (const item of items) {
    const key = item.date.slice(0, 7); // "YYYY-MM"
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: monthLabel.format(new Date(`${key}-01T00:00:00`)), items: [] };
      byKey.set(key, group);
    }
    group.items.push(item);
  }
  return [...byKey.values()];
}

/**
 * Whether a month "folder" renders expanded by default. Openness is data-driven,
 * not tied to array position alone: the newest month (index 0), the current month
 * — so a just-logged entry stays visible even if a future-dated entry sorts above
 * it — and every month while a filter is narrowing the timeline.
 */
export function isMonthDefaultOpen(
  index: number,
  key: string,
  currentMonthKey: string,
  hasActiveFilter: boolean,
): boolean {
  return index === 0 || key === currentMonthKey || hasActiveFilter;
}
