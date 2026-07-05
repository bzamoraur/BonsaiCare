import { describe, expect, it } from "vitest";

import { parseCareEntry, type RawCareEntry } from "./care";

// A valid RFC-4122 v4 UUID (Zod v4's z.uuid() checks version + variant bits).
const TREE = "a0000000-0000-4000-8000-000000000001";

function base(overrides: Partial<RawCareEntry> = {}): RawCareEntry {
  return {
    treeId: TREE,
    type: "watering",
    occurredAt: "",
    title: "",
    notes: "",
    details: {},
    ...overrides,
  };
}

describe("parseCareEntry", () => {
  it("accepts a minimal watering (nulls the blank optionals, empty details)", () => {
    expect(parseCareEntry(base())).toEqual({
      ok: true,
      value: {
        treeId: TREE,
        type: "watering",
        occurredAt: null,
        title: null,
        notes: null,
        details: {},
      },
    });
  });

  it("keeps per-type details for fertilizing", () => {
    const result = parseCareEntry(
      base({
        type: "fertilizing",
        details: { product: "Biogold", npk: "5-5-5", amount: "1 scoop" },
      }),
    );
    expect(result).toEqual({
      ok: true,
      value: {
        treeId: TREE,
        type: "fertilizing",
        occurredAt: null,
        title: null,
        notes: null,
        details: { product: "Biogold", npk: "5-5-5", amount: "1 scoop" },
      },
    });
  });

  it("trims title/notes and drops blank detail fields", () => {
    const result = parseCareEntry(
      base({
        type: "fertilizing",
        title: "  Spring feed  ",
        notes: " ",
        details: { product: "  ", npk: "5-5-5" },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Spring feed");
      expect(result.value.notes).toBeNull();
      expect(result.value.details).toEqual({ npk: "5-5-5" });
    }
  });

  it("passes a valid occurred_at through", () => {
    const result = parseCareEntry(base({ occurredAt: "2026-03-12T09:30:00Z" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.occurredAt).toBe("2026-03-12T09:30:00Z");
  });

  it("rejects a non-UUID tree id", () => {
    expect(parseCareEntry(base({ treeId: "not-a-uuid" }))).toEqual({
      ok: false,
      message: "Please choose a tree.",
    });
  });

  it("rejects an unknown care type", () => {
    expect(parseCareEntry(base({ type: "vibing" }))).toEqual({
      ok: false,
      message: "Please choose a valid care type.",
    });
  });

  it("rejects an unknown details key (strict)", () => {
    expect(parseCareEntry(base({ details: { foo: "bar" } })).ok).toBe(false);
  });

  it("rejects details on a type that takes none (note)", () => {
    expect(parseCareEntry(base({ type: "note", details: { intensity: "hard" } })).ok).toBe(false);
  });

  it("rejects an invalid enum detail (pruning intensity)", () => {
    expect(parseCareEntry(base({ type: "pruning", details: { intensity: "extreme" } }))).toEqual({
      ok: false,
      message: "Choose a valid pruning intensity.",
    });
  });

  it("accepts a valid enum detail (pruning intensity)", () => {
    const result = parseCareEntry(base({ type: "pruning", details: { intensity: "moderate" } }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.details).toEqual({ intensity: "moderate" });
  });

  it("rejects an over-long title", () => {
    expect(parseCareEntry(base({ title: "a".repeat(121) })).ok).toBe(false);
  });

  it("rejects a malformed occurred_at", () => {
    expect(parseCareEntry(base({ occurredAt: "not-a-date" }))).toEqual({
      ok: false,
      message: "Please enter a valid date and time.",
    });
  });
});
