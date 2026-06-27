import { describe, expect, it } from "vitest";
import { isOverdue, type SchedulableTask } from "./scheduling";

const pending = (dueOn: string): SchedulableTask => ({ status: "pending", dueOn });

describe("isOverdue", () => {
  it("is overdue when pending and due before today", () => {
    expect(isOverdue(pending("2026-06-01"), "2026-06-27")).toBe(true);
  });

  it("is not overdue when due exactly today", () => {
    expect(isOverdue(pending("2026-06-27"), "2026-06-27")).toBe(false);
  });

  it("is not overdue when due in the future", () => {
    expect(isOverdue(pending("2026-07-01"), "2026-06-27")).toBe(false);
  });

  it("is never overdue when done or skipped, even if long past due", () => {
    expect(isOverdue({ status: "done", dueOn: "2026-01-01" }, "2026-06-27")).toBe(false);
    expect(isOverdue({ status: "skipped", dueOn: "2026-01-01" }, "2026-06-27")).toBe(false);
  });

  it("handles year boundaries correctly", () => {
    expect(isOverdue(pending("2025-12-31"), "2026-01-01")).toBe(true);
  });
});
