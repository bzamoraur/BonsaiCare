import { describe, expect, it } from "vitest";
import { collectOrphans, DB_PAGE, fetchKnownPaths, sweepGuard } from "./reconcile-lib.mjs";

// A minimal stand-in for the supabase-js client that serves pre-built pages
// and records the exact ranges requested.
function mockAdmin(pages) {
  const calls = [];
  return {
    calls,
    from() {
      return {
        select() {
          return {
            range(from, to) {
              calls.push([from, to]);
              const page = pages[Math.floor(from / DB_PAGE)] ?? [];
              return Promise.resolve({ data: page, error: null });
            },
          };
        },
      };
    },
  };
}

const rows = (start, count) =>
  Array.from({ length: count }, (_, i) => ({ storage_path: `u/t/p-${start + i}.webp` }));

describe("fetchKnownPaths (the audit's critical finding: truncation ⇒ deleted photos)", () => {
  it("pages past the 1,000-row PostgREST cap and aggregates every path", async () => {
    const admin = mockAdmin([rows(0, DB_PAGE), rows(DB_PAGE, DB_PAGE), rows(2 * DB_PAGE, 37)]);
    const known = await fetchKnownPaths(admin);
    expect(known.size).toBe(2 * DB_PAGE + 37);
    expect(admin.calls).toEqual([
      [0, DB_PAGE - 1],
      [DB_PAGE, 2 * DB_PAGE - 1],
      [2 * DB_PAGE, 3 * DB_PAGE - 1],
    ]);
    expect(known.has(`u/t/p-${2 * DB_PAGE + 36}.webp`)).toBe(true);
  });

  it("handles a row count that is an exact multiple of the page size", async () => {
    const admin = mockAdmin([rows(0, DB_PAGE), []]);
    const known = await fetchKnownPaths(admin);
    expect(known.size).toBe(DB_PAGE);
    expect(admin.calls.length).toBe(2);
  });

  it("throws (rather than returning a partial set) on a read error", async () => {
    const admin = {
      from: () => ({
        select: () => ({
          range: () => Promise.resolve({ data: null, error: { message: "boom" } }),
        }),
      }),
    };
    await expect(fetchKnownPaths(admin)).rejects.toThrow(/read photos rows 0-999: boom/);
  });
});

describe("collectOrphans", () => {
  const cutoff = Date.parse("2026-07-06T00:00:00Z");
  const old = "2026-07-01T00:00:00Z";
  const fresh = "2026-07-06T12:00:00Z";

  it("flags only old objects the DB does not know", () => {
    const objects = [
      { path: "a/1/known.webp", createdAt: old },
      { path: "a/1/orphan.webp", createdAt: old },
      { path: "a/1/fresh-orphan.webp", createdAt: fresh },
      { path: "a/1/no-date.webp", createdAt: null },
    ];
    const known = new Set(["a/1/known.webp"]);
    expect(collectOrphans(objects, known, cutoff)).toEqual(["a/1/orphan.webp"]);
  });
});

describe("sweepGuard", () => {
  it("never blocks a dry run and never blocks zero orphans", () => {
    expect(
      sweepGuard({
        orphanCount: 9999,
        objectCount: 10000,
        knownCount: 1,
        dryRun: true,
        force: false,
      }).ok,
    ).toBe(true);
    expect(
      sweepGuard({ orphanCount: 0, objectCount: 100, knownCount: 100, dryRun: false, force: false })
        .ok,
    ).toBe(true);
  });

  it("allows routine cleanup (a handful of stranded uploads)", () => {
    expect(
      sweepGuard({ orphanCount: 3, objectCount: 500, knownCount: 497, dryRun: false, force: false })
        .ok,
    ).toBe(true);
  });

  it("refuses a mass deletion (> max(20, 20%))", () => {
    const verdict = sweepGuard({
      orphanCount: 50,
      objectCount: 200,
      knownCount: 150,
      dryRun: false,
      force: false,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/Refusing to delete 50 of 200/);
  });

  it("uses the absolute floor of 20 so small buckets can still be cleaned", () => {
    expect(
      sweepGuard({ orphanCount: 5, objectCount: 10, knownCount: 5, dryRun: false, force: false })
        .ok,
    ).toBe(true);
  });

  it("refuses to delete anything when the DB claims zero photos but storage has objects", () => {
    const verdict = sweepGuard({
      orphanCount: 5,
      objectCount: 300,
      knownCount: 0,
      dryRun: false,
      force: false,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/ZERO photos/);
  });

  it("FORCE_SWEEP overrides after human inspection", () => {
    expect(
      sweepGuard({ orphanCount: 50, objectCount: 200, knownCount: 0, dryRun: false, force: true })
        .ok,
    ).toBe(true);
  });
});
