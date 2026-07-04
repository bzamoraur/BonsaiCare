import { describe, expect, it } from "vitest";

import { MAX_TAG_LENGTH, MAX_TAGS, parseTagInput } from "./tags";

describe("parseTagInput", () => {
  it("splits, trims, and keeps order", () => {
    expect(parseTagInput("shohin, show-candidate ,  native")).toEqual([
      "shohin",
      "show-candidate",
      "native",
    ]);
  });

  it("drops empty segments", () => {
    expect(parseTagInput(" , ,x, ")).toEqual(["x"]);
  });

  it("de-duplicates case-insensitively, keeping the first casing", () => {
    expect(parseTagInput("Shohin, shohin, SHOHIN")).toEqual(["Shohin"]);
  });

  it("returns [] for non-string input", () => {
    expect(parseTagInput(null)).toEqual([]);
    expect(parseTagInput(42)).toEqual([]);
  });

  it("drops over-long tags", () => {
    const long = "a".repeat(MAX_TAG_LENGTH + 1);
    expect(parseTagInput(`ok, ${long}`)).toEqual(["ok"]);
  });

  it("caps the number of tags", () => {
    const many = Array.from({ length: MAX_TAGS + 5 }, (_, i) => `t${i}`).join(",");
    expect(parseTagInput(many)).toHaveLength(MAX_TAGS);
  });
});
