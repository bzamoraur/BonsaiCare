import { describe, expect, it } from "vitest";

import type { TimelineItem } from "@/server/timeline";

import { groupTimelineByMonth, isMonthDefaultOpen } from "./timeline-groups";

// The grouper only reads `date`; build minimal items (cast past the full union).
function item(id: string, date: string): TimelineItem {
  return { kind: "photo", id, date, sortAt: `${date}T00:00:00Z` } as unknown as TimelineItem;
}

describe("groupTimelineByMonth", () => {
  it("returns no groups for an empty timeline", () => {
    expect(groupTimelineByMonth([], "en")).toEqual([]);
  });

  it("groups a date-descending timeline into newest-first month sections", () => {
    const groups = groupTimelineByMonth(
      [
        item("a", "2026-07-09"),
        item("b", "2026-07-01"),
        item("c", "2026-06-30"),
        item("d", "2025-12-15"),
      ],
      "en",
    );

    expect(groups.map((g) => g.key)).toEqual(["2026-07", "2026-06", "2025-12"]);
    expect(groups.map((g) => g.label)).toEqual(["July 2026", "June 2026", "December 2025"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["c"]);
    expect(groups[2].items.map((i) => i.id)).toEqual(["d"]);
  });

  it("keeps a single month as one group and preserves item order", () => {
    const groups = groupTimelineByMonth([item("x", "2026-07-10"), item("y", "2026-07-02")], "en");
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.id)).toEqual(["x", "y"]);
  });

  it("re-merges a month even if it were not contiguous in the input", () => {
    const groups = groupTimelineByMonth(
      [
        item("a", "2026-07-09"),
        item("b", "2026-06-30"),
        item("c", "2026-07-01"), // same month as `a`, but out of order
      ],
      "en",
    );
    expect(groups.map((g) => g.key)).toEqual(["2026-07", "2026-06"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("formats the month label in the given locale", () => {
    const groups = groupTimelineByMonth([item("a", "2026-07-09")], "es");
    expect(groups[0].label).toBe("julio de 2026");
  });
});

describe("isMonthDefaultOpen", () => {
  const current = "2026-07";

  it("opens the newest month (index 0)", () => {
    expect(isMonthDefaultOpen(0, "2026-05", current, false)).toBe(true);
  });

  it("opens the current month even when it is not index 0 (future entry above it)", () => {
    // A future-dated entry made "2026-08" the newest group; today's "2026-07"
    // sits at index 1 but must still open so a fresh log stays visible.
    expect(isMonthDefaultOpen(1, "2026-07", current, false)).toBe(true);
  });

  it("keeps older, non-current months closed by default", () => {
    expect(isMonthDefaultOpen(2, "2026-03", current, false)).toBe(false);
  });

  it("opens every month while a filter is active", () => {
    expect(isMonthDefaultOpen(5, "2025-01", current, true)).toBe(true);
  });
});
