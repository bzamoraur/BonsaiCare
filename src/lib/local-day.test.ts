import { describe, expect, it } from "vitest";

import { addLocalDaysIso, relativeDayLabel } from "./local-day";

describe("relativeDayLabel", () => {
  const today = "2026-07-08";

  it.each([
    ["2026-07-08", "today"], // same day
    ["2026-07-07", "yesterday"], // 1 day
    ["2026-07-06", "2d ago"], // 2 days
    ["2026-06-25", "13d ago"], // 13 days — still counted in days
    ["2026-06-24", "2w ago"], // 14 days — rolls to weeks
    ["2026-06-17", "3w ago"], // 21 days
  ])("labels %s (relative to 2026-07-08) as %s", (from, expected) => {
    expect(relativeDayLabel(from, today)).toBe(expected);
  });

  it("reads a future / clock-skewed date as 'today', never negative", () => {
    expect(relativeDayLabel("2026-07-10", today)).toBe("today");
  });

  it("crosses month and year boundaries correctly", () => {
    expect(relativeDayLabel("2026-06-30", "2026-07-01")).toBe("yesterday");
    expect(relativeDayLabel("2025-12-31", "2026-01-01")).toBe("yesterday");
  });
});

describe("addLocalDaysIso", () => {
  it("adds days across a month boundary", () => {
    expect(addLocalDaysIso("2026-07-08", 7)).toBe("2026-07-15");
    expect(addLocalDaysIso("2026-07-30", 3)).toBe("2026-08-02");
  });

  it("subtracts days across a year boundary", () => {
    expect(addLocalDaysIso("2026-01-01", -1)).toBe("2025-12-31");
  });
});
