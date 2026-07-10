import { describe, expect, it } from "vitest";

import { Constants } from "@/types/database.types";

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

  // The enum-label namespaces replaced the old `satisfies Record<Enum, string>`
  // maps; this restores the "a new enum value fails until it gets a label" safety.
  const enumNamespaces = [
    ["taskTypes", Constants.public.Enums.task_type],
    ["careTypes", Constants.public.Enums.care_event_type],
    ["stages", Constants.public.Enums.development_stage],
    ["health", Constants.public.Enums.health_status],
    ["origins", Constants.public.Enums.tree_origin],
  ] as const;

  it.each(enumNamespaces)("%s has a label for every enum value (en + es)", (ns, values) => {
    for (const value of values) {
      expect(en[ns], `en.${ns}.${value}`).toHaveProperty(value);
      expect(es[ns], `es.${ns}.${value}`).toHaveProperty(value);
    }
  });
});
