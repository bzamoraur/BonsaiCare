import { describe, expect, it } from "vitest";

import { defaultLocale, isLocale, locales } from "./config";

describe("isLocale", () => {
  it("accepts every supported locale", () => {
    for (const locale of locales) expect(isLocale(locale)).toBe(true);
  });

  it("accepts the default locale", () => {
    expect(isLocale(defaultLocale)).toBe(true);
  });

  it("rejects unknown, empty, and undefined values", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("EN")).toBe(false); // case-sensitive
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("rejects path-traversal-shaped values (guards the dynamic message import)", () => {
    expect(isLocale("../en")).toBe(false);
    expect(isLocale("en/../../etc/passwd")).toBe(false);
  });
});
