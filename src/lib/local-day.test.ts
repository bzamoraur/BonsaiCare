import { describe, expect, it } from "vitest";

import { addLocalDaysIso, relativeDay, type RelativeDay } from "./local-day";

describe("relativeDay", () => {
  const today = "2026-07-08";

  it.each([
    ["2026-07-08", { kind: "today" }], // same day
    ["2026-07-07", { kind: "yesterday" }], // 1 day
    ["2026-07-06", { kind: "days", value: 2 }], // 2 days
    ["2026-06-25", { kind: "days", value: 13 }], // 13 days — still counted in days
    ["2026-06-24", { kind: "weeks", value: 2 }], // 14 days — rolls to weeks
    ["2026-06-17", { kind: "weeks", value: 3 }], // 21 days
  ] as [string, RelativeDay][])("reads %s (relative to 2026-07-08) as %o", (from, expected) => {
    expect(relativeDay(from, today)).toEqual(expected);
  });

  it("reads a future / clock-skewed date as 'today', never negative", () => {
    expect(relativeDay("2026-07-10", today)).toEqual({ kind: "today" });
  });

  it("crosses month and year boundaries correctly", () => {
    expect(relativeDay("2026-06-30", "2026-07-01")).toEqual({ kind: "yesterday" });
    expect(relativeDay("2025-12-31", "2026-01-01")).toEqual({ kind: "yesterday" });
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
