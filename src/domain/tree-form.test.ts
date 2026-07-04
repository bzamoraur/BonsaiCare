import { describe, expect, it } from "vitest";

import { MAX_NAME_LENGTH, MAX_SPECIES_LENGTH, parseTreeForm } from "./tree-form";

// A fully-empty raw form (every optional field blank).
const rawBase = {
  name: "Ficus",
  speciesLabel: "",
  developmentStage: "",
  origin: "",
  style: "",
  currentPot: "",
  currentSubstrate: "",
  acquiredOn: "",
  acquiredFrom: "",
  healthStatus: "",
  notes: "",
};

// The nulled optional fields, for building expected values.
const nulls = {
  speciesLabel: null,
  developmentStage: null,
  origin: null,
  style: null,
  currentPot: null,
  currentSubstrate: null,
  acquiredOn: null,
  acquiredFrom: null,
  healthStatus: null,
  notes: null,
};

describe("parseTreeForm", () => {
  it("accepts a name-only input, nulling every optional field", () => {
    expect(parseTreeForm(rawBase)).toEqual({ ok: true, value: { name: "Ficus", ...nulls } });
  });

  it("trims the name and free-text fields", () => {
    const result = parseTreeForm({
      ...rawBase,
      name: "  Japanese Maple  ",
      speciesLabel: "  Acer palmatum  ",
      notes: "  loves morning sun  ",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Japanese Maple",
        ...nulls,
        speciesLabel: "Acer palmatum",
        notes: "loves morning sun",
      },
    });
  });

  it("keeps valid enum and date selections", () => {
    const result = parseTreeForm({
      ...rawBase,
      developmentStage: "refinement",
      origin: "yamadori",
      healthStatus: "thriving",
      acquiredOn: "2024-03-12",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Ficus",
        ...nulls,
        developmentStage: "refinement",
        origin: "yamadori",
        healthStatus: "thriving",
        acquiredOn: "2024-03-12",
      },
    });
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(parseTreeForm({ ...rawBase, name: "   " })).toEqual({
      ok: false,
      message: "Please give your tree a name.",
    });
  });

  it("rejects a non-string name", () => {
    expect(parseTreeForm({ ...rawBase, name: 42 }).ok).toBe(false);
  });

  it("rejects an over-long name", () => {
    expect(parseTreeForm({ ...rawBase, name: "a".repeat(MAX_NAME_LENGTH + 1) }).ok).toBe(false);
  });

  it("rejects an over-long species label", () => {
    expect(parseTreeForm({ ...rawBase, speciesLabel: "a".repeat(MAX_SPECIES_LENGTH + 1) }).ok).toBe(
      false,
    );
  });

  it("rejects an unknown development stage", () => {
    expect(parseTreeForm({ ...rawBase, developmentStage: "bonsaiified" })).toEqual({
      ok: false,
      message: "Please choose a valid development stage.",
    });
  });

  it("rejects an unknown origin", () => {
    expect(parseTreeForm({ ...rawBase, origin: "abducted" })).toEqual({
      ok: false,
      message: "Please choose a valid origin.",
    });
  });

  it("rejects an unknown health status", () => {
    expect(parseTreeForm({ ...rawBase, healthStatus: "vibing" })).toEqual({
      ok: false,
      message: "Please choose a valid health status.",
    });
  });

  it("rejects a wrongly-formatted date", () => {
    expect(parseTreeForm({ ...rawBase, acquiredOn: "12-03-2024" }).ok).toBe(false);
  });

  it("rejects an impossible calendar date", () => {
    expect(parseTreeForm({ ...rawBase, acquiredOn: "2024-02-31" }).ok).toBe(false);
  });
});
