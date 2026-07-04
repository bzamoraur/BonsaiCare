import { describe, expect, it } from "vitest";

import { MAX_NAME_LENGTH, MAX_SPECIES_LENGTH, parseNewTree } from "./tree-form";

const base = { name: "Ficus", speciesLabel: "", developmentStage: "", healthStatus: "" };

describe("parseNewTree", () => {
  it("accepts a name-only input, nulling the optional fields", () => {
    expect(parseNewTree(base)).toEqual({
      ok: true,
      value: { name: "Ficus", speciesLabel: null, developmentStage: null, healthStatus: null },
    });
  });

  it("trims the name and species label", () => {
    const result = parseNewTree({
      ...base,
      name: "  Japanese Maple  ",
      speciesLabel: "  Acer palmatum  ",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Japanese Maple",
        speciesLabel: "Acer palmatum",
        developmentStage: null,
        healthStatus: null,
      },
    });
  });

  it("keeps valid enum selections", () => {
    const result = parseNewTree({
      ...base,
      developmentStage: "refinement",
      healthStatus: "thriving",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Ficus",
        speciesLabel: null,
        developmentStage: "refinement",
        healthStatus: "thriving",
      },
    });
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(parseNewTree({ ...base, name: "   " })).toEqual({
      ok: false,
      message: "Please give your tree a name.",
    });
  });

  it("rejects a non-string name", () => {
    expect(parseNewTree({ ...base, name: 42 }).ok).toBe(false);
  });

  it("rejects an over-long name", () => {
    const result = parseNewTree({ ...base, name: "a".repeat(MAX_NAME_LENGTH + 1) });
    expect(result.ok).toBe(false);
  });

  it("rejects an over-long species label", () => {
    const result = parseNewTree({ ...base, speciesLabel: "a".repeat(MAX_SPECIES_LENGTH + 1) });
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown development stage", () => {
    expect(parseNewTree({ ...base, developmentStage: "bonsaiified" })).toEqual({
      ok: false,
      message: "Please choose a valid development stage.",
    });
  });

  it("rejects an unknown health status", () => {
    expect(parseNewTree({ ...base, healthStatus: "vibing" })).toEqual({
      ok: false,
      message: "Please choose a valid health status.",
    });
  });
});
