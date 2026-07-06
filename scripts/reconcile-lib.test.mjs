import { describe, expect, it } from "vitest";
import {
  collectOrphans,
  DB_PAGE,
  fetchKnownPaths,
  planUploads,
  sweepGuard,
  walkBucket,
} from "./reconcile-lib.mjs";

// A stand-in for the supabase-js client that serves keyset pages from a sorted
// row set, records every request, and can simulate a server-side row cap
// smaller than what the client asked for (PostgREST max-rows).
function mockAdmin(allRows, { serverCap = Infinity, failAfterId = null } = {}) {
  const sorted = [...allRows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const requests = [];
  const makeQuery = () => {
    const state = { gt: null, limit: Infinity };
    const promise = () => {
      requests.push({ ...state });
      if (failAfterId !== null && state.gt === failAfterId) {
        return Promise.resolve({ data: null, error: { message: "boom" } });
      }
      const rows = sorted
        .filter((r) => state.gt === null || r.id > state.gt)
        .slice(0, Math.min(state.limit, serverCap));
      return Promise.resolve({ data: rows, error: null });
    };
    const q = {
      order: () => q,
      limit: (n) => ((state.limit = n), q),
      gt: (_col, v) => ((state.gt = v), q),
      then: (res, rej) => promise().then(res, rej),
    };
    return q;
  };
  return { requests, from: () => ({ select: () => makeQuery() }) };
}

const id = (n) => `id-${String(n).padStart(6, "0")}`;
const rows = (start, count) =>
  Array.from({ length: count }, (_, i) => ({
    id: id(start + i),
    storage_path: `u/t/p-${start + i}.webp`,
  }));

describe("fetchKnownPaths (the audit's critical finding: any skipped row ⇒ a deleted photo)", () => {
  it("keyset-pages past the 1,000-row cap and aggregates every path", async () => {
    const admin = mockAdmin(rows(0, 2 * DB_PAGE + 37));
    const known = await fetchKnownPaths(admin);
    expect(known.size).toBe(2 * DB_PAGE + 37);
    // 3 full/partial pages + no extra: last page was short but non-empty, then
    // the loop continues until an EMPTY page — so 4 requests total.
    expect(admin.requests.length).toBe(4);
    expect(admin.requests[1].gt).toBe(id(DB_PAGE - 1));
    expect(known.has(`u/t/p-${2 * DB_PAGE + 36}.webp`)).toBe(true);
  });

  it("survives a server row-cap SMALLER than the requested page size (max-rows lowered)", async () => {
    const admin = mockAdmin(rows(0, 2500), { serverCap: 500 });
    const known = await fetchKnownPaths(admin);
    expect(known.size).toBe(2500); // old offset code (or a `< DB_PAGE` break) truncated at the cap
  });

  it("handles a row count that is an exact multiple of the page size", async () => {
    const admin = mockAdmin(rows(0, DB_PAGE));
    const known = await fetchKnownPaths(admin);
    expect(known.size).toBe(DB_PAGE);
    expect(admin.requests.length).toBe(2); // full page, then the empty terminator
  });

  it("handles an empty table", async () => {
    const known = await fetchKnownPaths(mockAdmin([]));
    expect(known.size).toBe(0);
  });

  it("throws (rather than returning a partial set) on a page error", async () => {
    const admin = mockAdmin(rows(0, DB_PAGE + 5), { failAfterId: id(DB_PAGE - 1) });
    await expect(fetchKnownPaths(admin)).rejects.toThrow(/read photos after id id-000999: boom/);
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

  it("caps the ceiling at 200 absolute even for huge buckets", () => {
    const verdict = sweepGuard({
      orphanCount: 1900,
      objectCount: 10000,
      knownCount: 8100,
      dryRun: false,
      force: false,
    });
    expect(verdict.ok).toBe(false); // 20% would have allowed 2000
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

describe("walkBucket", () => {
  // tree: prefix -> full entry list; the mock serves limit/offset slices.
  function mockStorageAdmin(tree) {
    const calls = [];
    return {
      calls,
      storage: {
        from: () => ({
          list: (prefix, { limit, offset }) => {
            calls.push([prefix, offset]);
            const all = tree[prefix] ?? [];
            return Promise.resolve({ data: all.slice(offset, offset + limit), error: null });
          },
        }),
      },
    };
  }
  const folder = (name) => ({ name, id: null });
  const file = (name, size) => ({
    name,
    id: `id-${name}`,
    created_at: "2026-07-01T00:00:00Z",
    metadata: { size },
  });

  it("walks the two-level layout, paginates, and carries path/createdAt/size", async () => {
    const manyFiles = Array.from({ length: 250 }, (_, i) => file(`p${i}.webp`, 100 + i));
    const admin = mockStorageAdmin({
      "": [folder("userA"), folder("userB")],
      userA: [folder("tree1"), file("stray-at-wrong-level.webp", 1)],
      userB: [folder("tree2")],
      "userA/tree1": [file("a.webp", 300)],
      "userB/tree2": manyFiles,
    });
    const objects = await walkBucket(admin, "tree-photos", 100);
    expect(objects.length).toBe(1 + 250); // top-level stray file is ignored (folders only at level 1... it has an id, so skipped as non-folder)
    expect(objects[0]).toEqual({
      path: "userA/tree1/a.webp",
      createdAt: "2026-07-01T00:00:00Z",
      size: 300,
    });
    // 250 files at page size 100 -> offsets 0, 100, 200 for that prefix
    const treeCalls = admin.calls.filter(([p]) => p === "userB/tree2").map(([, o]) => o);
    expect(treeCalls).toEqual([0, 100, 200]);
  });

  it("throws on a list error instead of returning a partial walk", async () => {
    const admin = {
      storage: {
        from: () => ({
          list: () => Promise.resolve({ data: null, error: { message: "boom" } }),
        }),
      },
    };
    await expect(walkBucket(admin, "tree-photos")).rejects.toThrow(/list "": boom/);
  });
});

describe("planUploads", () => {
  const src = (path, size) => ({ path, createdAt: "x", size });

  it("uploads what the mirror lacks, skips what it has, re-copies size drift", () => {
    const source = [
      src("u/t/missing.webp", 100),
      src("u/t/same.webp", 200),
      src("u/t/drift.webp", 300),
      src("u/t/unknown-size.webp", null),
    ];
    const existing = new Map([
      ["u/t/same.webp", 200],
      ["u/t/drift.webp", 999],
      ["u/t/unknown-size.webp", 50],
    ]);
    expect(planUploads(source, existing)).toEqual(["u/t/missing.webp", "u/t/drift.webp"]);
  });

  it("uploads everything into an empty mirror", () => {
    expect(planUploads([src("a", 1), src("b", 2)], new Map())).toEqual(["a", "b"]);
  });
});
