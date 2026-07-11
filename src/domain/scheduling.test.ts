import { describe, expect, it } from "vitest";

import {
  computeNextDueOn,
  isInSeasonWindow,
  isOverdue,
  parseRecurrence,
  projectFutureOccurrences,
  type Recurrence,
  type SchedulableTask,
} from "./scheduling";

const pending = (dueOn: string): SchedulableTask => ({ status: "pending", dueOn });

describe("isOverdue", () => {
  it("is overdue when pending and due before today", () => {
    expect(isOverdue(pending("2026-06-01"), "2026-06-27")).toBe(true);
  });

  it("is not overdue when due exactly today", () => {
    expect(isOverdue(pending("2026-06-27"), "2026-06-27")).toBe(false);
  });

  it("is not overdue when due in the future", () => {
    expect(isOverdue(pending("2026-07-01"), "2026-06-27")).toBe(false);
  });

  it("is never overdue when done or skipped, even if long past due", () => {
    expect(isOverdue({ status: "done", dueOn: "2026-01-01" }, "2026-06-27")).toBe(false);
    expect(isOverdue({ status: "skipped", dueOn: "2026-01-01" }, "2026-06-27")).toBe(false);
  });

  it("handles year boundaries correctly", () => {
    expect(isOverdue(pending("2025-12-31"), "2026-01-01")).toBe(true);
  });
});

// A canonical "growing season" fertilizing rule: every 14 days, Mar–Oct, anchored
// to when you actually did it. Season months are stored northern-canonical.
const growingSeason = (overrides: Partial<Recurrence> = {}): Recurrence => ({
  interval_days: 14,
  anchor: "completion",
  season_start_month: 3,
  season_end_month: 10,
  ...overrides,
});

describe("isInSeasonWindow", () => {
  const yearRound: Recurrence = { interval_days: 7, anchor: "completion" };

  it("is always in season when there is no season window", () => {
    for (let month = 1; month <= 12; month++) {
      expect(isInSeasonWindow(month, yearRound, "northern")).toBe(true);
      expect(isInSeasonWindow(month, yearRound, "southern")).toBe(true);
    }
  });

  describe("northern hemisphere, non-wrapping window (Mar–Oct)", () => {
    const rule = growingSeason();
    it("includes the start and end months (inclusive boundaries)", () => {
      expect(isInSeasonWindow(3, rule, "northern")).toBe(true);
      expect(isInSeasonWindow(10, rule, "northern")).toBe(true);
    });
    it("includes months inside the window", () => {
      expect(isInSeasonWindow(6, rule, "northern")).toBe(true);
    });
    it("excludes the dormant months", () => {
      for (const month of [1, 2, 11, 12]) {
        expect(isInSeasonWindow(month, rule, "northern")).toBe(false);
      }
    });
  });

  describe("southern hemisphere inverts the same stored window by 6 months", () => {
    // Stored Mar–Oct becomes locally active Sep–Apr in the south. This is the
    // Bonsai Empire bug class — proving the flip is the point of the sprint.
    const rule = growingSeason();
    it("is in season during the southern growing months (Sep–Apr)", () => {
      for (const month of [9, 10, 11, 12, 1, 2, 3, 4]) {
        expect(isInSeasonWindow(month, rule, "southern")).toBe(true);
      }
    });
    it("is out of season during the southern winter (May–Aug)", () => {
      for (const month of [5, 6, 7, 8]) {
        expect(isInSeasonWindow(month, rule, "southern")).toBe(false);
      }
    });
  });

  describe("year-end wrapping window (Nov–Feb)", () => {
    const rule = growingSeason({ season_start_month: 11, season_end_month: 2 });
    it("northern: includes Nov, Dec, Jan, Feb and excludes the rest", () => {
      for (const month of [11, 12, 1, 2]) {
        expect(isInSeasonWindow(month, rule, "northern")).toBe(true);
      }
      for (const month of [3, 6, 10]) {
        expect(isInSeasonWindow(month, rule, "northern")).toBe(false);
      }
    });
    it("southern: the wrapping window inverts to May–Aug", () => {
      for (const month of [5, 6, 7, 8]) {
        expect(isInSeasonWindow(month, rule, "southern")).toBe(true);
      }
      for (const month of [11, 12, 1, 4, 9]) {
        expect(isInSeasonWindow(month, rule, "southern")).toBe(false);
      }
    });
  });

  describe("single-month window (start === end)", () => {
    const rule = growingSeason({ season_start_month: 6, season_end_month: 6 });
    it("northern: only June is in season", () => {
      expect(isInSeasonWindow(6, rule, "northern")).toBe(true);
      expect(isInSeasonWindow(5, rule, "northern")).toBe(false);
      expect(isInSeasonWindow(7, rule, "northern")).toBe(false);
    });
    it("southern: only December is in season", () => {
      expect(isInSeasonWindow(12, rule, "southern")).toBe(true);
      expect(isInSeasonWindow(6, rule, "southern")).toBe(false);
    });
  });
});

describe("computeNextDueOn", () => {
  describe("no season window — plain interval add", () => {
    const yearRound: Recurrence = { interval_days: 14, anchor: "due" };

    it("anchor=due adds the interval to the due date, ignoring completion", () => {
      const next = computeNextDueOn(
        { dueOn: "2026-06-10", completedOn: "2026-06-08" },
        yearRound,
        "northern",
      );
      expect(next).toBe("2026-06-24");
    });

    it("anchor=completion adds the interval to the completion date, ignoring due", () => {
      const next = computeNextDueOn(
        { dueOn: "2026-06-10", completedOn: "2026-06-12" },
        { interval_days: 14, anchor: "completion" },
        "northern",
      );
      expect(next).toBe("2026-06-26");
    });

    it("crosses a year boundary via date arithmetic", () => {
      const next = computeNextDueOn(
        { dueOn: "2026-12-28", completedOn: "2026-12-28" },
        yearRound,
        "northern",
      );
      expect(next).toBe("2027-01-11");
    });

    it("handles leap-day arithmetic (Feb 2024 has 29 days)", () => {
      const next = computeNextDueOn(
        { dueOn: "2024-02-20", completedOn: "2024-02-20" },
        yearRound,
        "northern",
      );
      expect(next).toBe("2024-03-05");
    });
  });

  describe("the anchor changes the result for the same inputs", () => {
    it("due vs completion diverge when completed off-schedule", () => {
      const anchors = { dueOn: "2026-06-10", completedOn: "2026-06-20" };
      const dueNext = computeNextDueOn(anchors, { interval_days: 14, anchor: "due" }, "northern");
      const compNext = computeNextDueOn(
        anchors,
        { interval_days: 14, anchor: "completion" },
        "northern",
      );
      expect(dueNext).toBe("2026-06-24"); // due + 14
      expect(compNext).toBe("2026-07-04"); // completion + 14
      expect(dueNext).not.toBe(compNext);
    });
  });

  describe("season skip — northern (Mar–Oct growing season)", () => {
    it("stays put when the next date is still in season", () => {
      const next = computeNextDueOn(
        { dueOn: "2026-06-01", completedOn: "2026-06-01" },
        growingSeason(),
        "northern",
      );
      expect(next).toBe("2026-06-15");
    });

    it("stays put on the last in-season month", () => {
      const next = computeNextDueOn(
        { dueOn: "2026-10-01", completedOn: "2026-10-01" },
        growingSeason(),
        "northern",
      );
      expect(next).toBe("2026-10-15");
    });

    it("skips a next date that falls dormant to the 1st of next season", () => {
      // completed late Oct → +14 lands Nov 8 (dormant) → resume Mar 1 next year.
      const next = computeNextDueOn(
        { dueOn: "2026-10-25", completedOn: "2026-10-25" },
        growingSeason(),
        "northern",
      );
      expect(next).toBe("2027-03-01");
    });
  });

  describe("season skip — southern hemisphere (same stored Mar–Oct rule)", () => {
    it("stays put during the southern growing season", () => {
      // Jan is southern summer → in season; +14 stays in Jan.
      const next = computeNextDueOn(
        { dueOn: "2026-01-10", completedOn: "2026-01-10" },
        growingSeason(),
        "southern",
      );
      expect(next).toBe("2026-01-24");
    });

    it("skips the southern winter to the local season start (September)", () => {
      // completed mid-May (southern autumn) → +14 lands Jun 3 (winter, dormant)
      // → resume Sep 1, the southern growing-season start.
      const next = computeNextDueOn(
        { dueOn: "2026-05-20", completedOn: "2026-05-20" },
        growingSeason(),
        "southern",
      );
      expect(next).toBe("2026-09-01");
    });
  });

  describe("season skip — year-end wrapping window (Nov–Feb, northern)", () => {
    it("skips a summer next-date forward to November", () => {
      const rule = growingSeason({ season_start_month: 11, season_end_month: 2 });
      const next = computeNextDueOn(
        { dueOn: "2026-08-01", completedOn: "2026-08-01" },
        rule,
        "northern",
      );
      expect(next).toBe("2026-11-01");
    });

    it("stays within the window across the year boundary", () => {
      const rule = growingSeason({ season_start_month: 11, season_end_month: 2 });
      // completed Dec 28 → +14 = Jan 11, still inside the Nov–Feb window.
      const next = computeNextDueOn(
        { dueOn: "2026-12-28", completedOn: "2026-12-28" },
        rule,
        "northern",
      );
      expect(next).toBe("2027-01-11");
    });
  });
});

describe("parseRecurrence", () => {
  it("accepts a full rule with a season window", () => {
    const result = parseRecurrence({
      interval_days: 14,
      anchor: "completion",
      season_start_month: 3,
      season_end_month: 10,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        interval_days: 14,
        anchor: "completion",
        season_start_month: 3,
        season_end_month: 10,
      });
    }
  });

  it("accepts a minimal year-round rule (no season)", () => {
    const result = parseRecurrence({ interval_days: 7, anchor: "due" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.season_start_month).toBeUndefined();
      expect(result.value.season_end_month).toBeUndefined();
    }
  });

  it.each([
    ["interval below 1", { interval_days: 0, anchor: "completion" }],
    ["negative interval", { interval_days: -5, anchor: "completion" }],
    ["non-integer interval", { interval_days: 1.5, anchor: "completion" }],
    ["invalid anchor", { interval_days: 7, anchor: "whenever" }],
    ["missing interval", { anchor: "completion" }],
    ["missing anchor", { interval_days: 7 }],
    [
      "season month 0",
      { interval_days: 7, anchor: "due", season_start_month: 0, season_end_month: 5 },
    ],
    [
      "season month 13",
      { interval_days: 7, anchor: "due", season_start_month: 1, season_end_month: 13 },
    ],
    ["season start without end", { interval_days: 7, anchor: "due", season_start_month: 3 }],
    ["season end without start", { interval_days: 7, anchor: "due", season_end_month: 10 }],
    ["unknown key", { interval_days: 7, anchor: "due", frequency: "weekly" }],
    ["not an object", "every 14 days"],
    ["null", null],
  ])("rejects %s", (_label, input) => {
    expect(parseRecurrence(input).ok).toBe(false);
  });
});

describe("projectFutureOccurrences", () => {
  const every = (interval_days: number, anchor: "completion" | "due" = "due"): Recurrence => ({
    interval_days,
    anchor,
  });

  it("excludes the due date itself — only later occurrences are returned", () => {
    // Due 2026-08-19; the next occurrence (09-02) is out of August, so nothing.
    expect(
      projectFutureOccurrences("2026-08-19", every(14), "northern", "2026-08-01", "2026-08-31"),
    ).toEqual([]);
  });

  it("lists every later occurrence inside the window", () => {
    expect(
      projectFutureOccurrences("2026-08-01", every(7), "northern", "2026-08-01", "2026-08-31"),
    ).toEqual(["2026-08-08", "2026-08-15", "2026-08-22", "2026-08-29"]);
  });

  it("fast-forwards from a due date in an earlier month (the 45-day case)", () => {
    // A fertilizing task due Aug 15, repeating every 45 days: next month with an
    // occurrence is late September — the bug the owner hit.
    expect(
      projectFutureOccurrences("2026-08-15", every(45), "northern", "2026-09-01", "2026-09-30"),
    ).toEqual(["2026-09-29"]);
  });

  it("honours the season skip — no projections during the dormant window", () => {
    const rule = growingSeason(); // every 14 days, Mar–Oct, northern-canonical
    expect(
      projectFutureOccurrences("2026-10-25", rule, "northern", "2026-11-01", "2026-12-31"),
    ).toEqual([]);
  });

  it("resumes projecting at the next in-season month", () => {
    const rule = growingSeason();
    expect(
      projectFutureOccurrences("2026-10-25", rule, "northern", "2027-03-01", "2027-03-31"),
    ).toEqual(["2027-03-01", "2027-03-15", "2027-03-29"]);
  });

  it("is bounded by maxSteps for a far-future window with a tiny interval", () => {
    // Ten one-day steps from Jan 1 never reach 2030 → empty, no runaway loop.
    expect(
      projectFutureOccurrences("2026-01-01", every(1), "northern", "2030-01-01", "2030-01-31", 10),
    ).toEqual([]);
  });
});
