import { describe, expect, it } from "vitest";

import { parseTaskForm } from "./task-form";

const TREE = "a0000000-0000-4000-8000-000000000001";

const base = {
  title: "Water the juniper",
  type: "watering",
  treeId: TREE,
  dueOn: "2026-07-10",
};

describe("parseTaskForm", () => {
  it("accepts a minimal one-off task (no recurrence)", () => {
    const result = parseTaskForm(base);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        title: "Water the juniper",
        type: "watering",
        treeId: TREE,
        dueOn: "2026-07-10",
        notes: null,
        recurrence: null,
      });
    }
  });

  it("treats a blank tree as a collection-wide task", () => {
    const result = parseTaskForm({ ...base, treeId: "", type: "custom", title: "Order akadama" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.treeId).toBeNull();
  });

  it("trims and keeps notes", () => {
    const result = parseTaskForm({ ...base, notes: "  east bench  " });
    expect(result.ok && result.value.notes).toBe("east bench");
  });

  it("builds a year-round recurrence", () => {
    const result = parseTaskForm({
      ...base,
      recurring: "on",
      intervalDays: "3",
      anchor: "completion",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.recurrence).toEqual({ interval_days: 3, anchor: "completion" });
    }
  });

  it("builds a seasonal recurrence when seasonal is toggled", () => {
    const result = parseTaskForm({
      ...base,
      type: "fertilizing",
      recurring: "on",
      intervalDays: "14",
      anchor: "completion",
      seasonal: "on",
      seasonStartMonth: "3",
      seasonEndMonth: "10",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.recurrence).toEqual({
        interval_days: 14,
        anchor: "completion",
        season_start_month: 3,
        season_end_month: 10,
      });
    }
  });

  it("ignores season months when seasonal is not toggled", () => {
    const result = parseTaskForm({
      ...base,
      recurring: "on",
      intervalDays: "7",
      anchor: "due",
      seasonStartMonth: "3",
      seasonEndMonth: "10",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.recurrence).toEqual({ interval_days: 7, anchor: "due" });
    }
  });

  it.each([
    ["missing title", { ...base, title: "   " }],
    ["title too long", { ...base, title: "x".repeat(121) }],
    ["invalid type", { ...base, type: "watering-can" }],
    ["missing type", { ...base, type: undefined }],
    ["non-uuid tree", { ...base, treeId: "not-a-uuid" }],
    ["bad date format", { ...base, dueOn: "10/07/2026" }],
    ["impossible date", { ...base, dueOn: "2026-02-31" }],
    ["missing date", { ...base, dueOn: undefined }],
    ["notes too long", { ...base, notes: "x".repeat(2001) }],
    [
      "recurring with zero interval",
      { ...base, recurring: "on", intervalDays: "0", anchor: "completion" },
    ],
    [
      "recurring with non-numeric interval",
      { ...base, recurring: "on", intervalDays: "soon", anchor: "completion" },
    ],
    [
      "recurring with bad anchor",
      { ...base, recurring: "on", intervalDays: "7", anchor: "whenever" },
    ],
    [
      "seasonal with out-of-range month",
      {
        ...base,
        recurring: "on",
        intervalDays: "14",
        anchor: "completion",
        seasonal: "on",
        seasonStartMonth: "3",
        seasonEndMonth: "13",
      },
    ],
    [
      "seasonal with a missing month",
      {
        ...base,
        recurring: "on",
        intervalDays: "14",
        anchor: "completion",
        seasonal: "on",
        seasonStartMonth: "3",
      },
    ],
  ])("rejects %s", (_label, input) => {
    expect(parseTaskForm(input).ok).toBe(false);
  });
});
