import { describe, expect, it } from "vitest";

import { seasonForMonth } from "./season";

describe("seasonForMonth", () => {
  it("maps northern-hemisphere months to meteorological seasons", () => {
    const expected: Record<number, string> = {
      1: "winter",
      2: "winter",
      3: "spring",
      4: "spring",
      5: "spring",
      6: "summer",
      7: "summer",
      8: "summer",
      9: "autumn",
      10: "autumn",
      11: "autumn",
      12: "winter",
    };
    for (let m = 1; m <= 12; m++) {
      expect(seasonForMonth(m, "northern")).toBe(expected[m]);
    }
  });

  it("inverts the calendar six months for the southern hemisphere", () => {
    // Southern January is summer; southern July is winter.
    expect(seasonForMonth(1, "southern")).toBe("summer");
    expect(seasonForMonth(7, "southern")).toBe("winter");
    expect(seasonForMonth(4, "southern")).toBe("autumn");
    expect(seasonForMonth(10, "southern")).toBe("spring");
    // Every southern month is exactly the opposite season to the same northern month.
    const opposite: Record<string, string> = {
      spring: "autumn",
      autumn: "spring",
      summer: "winter",
      winter: "summer",
    };
    for (let m = 1; m <= 12; m++) {
      expect(seasonForMonth(m, "southern")).toBe(opposite[seasonForMonth(m, "northern")]);
    }
  });
});
