import { describe, expect, it } from "vitest";

import { defaultLocale, isLocale, locales, localeFromAcceptLanguage } from "./config";

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

describe("localeFromAcceptLanguage", () => {
  it("matches on the primary subtag (region-agnostic)", () => {
    expect(localeFromAcceptLanguage("es-ES,es;q=0.9,en;q=0.8")).toBe("es");
    expect(localeFromAcceptLanguage("es-419")).toBe("es");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
  });

  it("honours q-weights, not header order", () => {
    expect(localeFromAcceptLanguage("en;q=0.5,es;q=0.9")).toBe("es");
    expect(localeFromAcceptLanguage("fr,es;q=0.9,en;q=0.8")).toBe("es");
  });

  it("falls back to the default for unsupported or missing headers", () => {
    expect(localeFromAcceptLanguage("fr-FR,fr;q=0.9")).toBe(defaultLocale);
    expect(localeFromAcceptLanguage("")).toBe(defaultLocale);
    expect(localeFromAcceptLanguage(null)).toBe(defaultLocale);
    expect(localeFromAcceptLanguage(undefined)).toBe(defaultLocale);
  });
});
