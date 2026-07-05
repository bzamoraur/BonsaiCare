import { describe, expect, it } from "vitest";

import { buildExportBundle, EXPORTED_TABLES, type ExportRows } from "./export";

/**
 * The compile-time exhaustiveness check lives in `export.ts` (a failing build if
 * a public table is unlisted). These run-time tests guard the rest of the
 * contract: no gaps/dupes in the list, and the built bundle exposes every table.
 */

function emptyRows(): ExportRows {
  return Object.fromEntries(EXPORTED_TABLES.map((t) => [t, [] as unknown[]])) as ExportRows;
}

describe("EXPORTED_TABLES", () => {
  it("has no duplicates", () => {
    expect(new Set(EXPORTED_TABLES).size).toBe(EXPORTED_TABLES.length);
  });

  it("covers the nine known user-owned tables", () => {
    // A change here is intentional: adding/removing a table forces this update,
    // matching the compile-time guard so coverage can never silently drift.
    expect([...EXPORTED_TABLES].sort()).toEqual(
      [
        "care_log_entries",
        "locations",
        "photos",
        "profiles",
        "species",
        "tags",
        "tasks",
        "tree_tags",
        "trees",
      ].sort(),
    );
  });
});

describe("buildExportBundle", () => {
  it("exposes a top-level key for every exported table plus meta", () => {
    const bundle = buildExportBundle(emptyRows(), {
      userId: "u1",
      exportedAt: "2026-07-05T00:00:00.000Z",
    });
    for (const table of EXPORTED_TABLES) {
      expect(bundle).toHaveProperty(table);
    }
    expect(bundle.meta.user_id).toBe("u1");
    expect(bundle.meta.exported_at).toBe("2026-07-05T00:00:00.000Z");
    expect(bundle.meta.app).toBe("Bonsai Companion");
  });

  it("reports accurate per-table counts", () => {
    const rows = emptyRows();
    rows.trees = [{ id: "t1" }, { id: "t2" }];
    rows.tasks = [{ id: "k1" }];

    const bundle = buildExportBundle(rows, {
      userId: "u1",
      exportedAt: "2026-07-05T00:00:00.000Z",
    });

    expect(bundle.meta.counts.trees).toBe(2);
    expect(bundle.meta.counts.tasks).toBe(1);
    expect(bundle.meta.counts.photos).toBe(0);
    expect(bundle.trees).toHaveLength(2);
  });

  it("carries row data through unchanged", () => {
    const rows = emptyRows();
    const tree = { id: "t1", name: "Juniper", owner_id: "u1" };
    rows.trees = [tree];

    const bundle = buildExportBundle(rows, {
      userId: "u1",
      exportedAt: "2026-07-05T00:00:00.000Z",
    });

    expect(bundle.trees[0]).toEqual(tree);
  });
});
