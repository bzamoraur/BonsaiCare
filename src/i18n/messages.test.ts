import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import es from "../../messages/es.json";

function flatKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? flatKeys(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

/**
 * Guards against locale drift: a key present in en.json but missing from es.json
 * (or vice versa) only throws when that string is rendered in the missing locale —
 * which no e2e does for Spanish. This test makes the gap a failing unit test instead
 * of a runtime error a Spanish-speaking user hits.
 */
describe("message catalogs", () => {
  it("en and es expose the identical set of keys", () => {
    expect(flatKeys(es).sort()).toEqual(flatKeys(en).sort());
  });
});
