import type { SupabaseClient } from "@supabase/supabase-js";

import { rowsToCsv } from "@/lib/csv";
import type { Database } from "@/types/database.types";

/**
 * Full-account data export (ADR-0008: data ownership is a first-class feature).
 *
 * The bundle round-trips every user-owned row. Coverage is guarded two ways:
 *  1. compile time — `EXPORTED_TABLES` is `satisfies readonly PublicTable[]` and
 *     `_assertAllTablesExported` fails to compile if a public table is missing;
 *  2. run time — `export.test.ts` asserts the built bundle has a key per table.
 * Adding a table to the schema (and regenerating types) therefore breaks the
 * build until it is added here — export never silently drops data.
 *
 * Photo *bytes* are not here (that is the photo-archive export); photo rows carry
 * `storage_path` so the archive and the metadata line up.
 */

type PublicTable = keyof Database["public"]["Tables"];

/**
 * Every user-owned table, in a human-legible dependency order. `species` is
 * exported owner-scoped only (global/seeded species are shared reference data;
 * `trees.species_label` preserves the human-readable name regardless).
 */
export const EXPORTED_TABLES = [
  "profiles",
  "locations",
  "species",
  "tags",
  "trees",
  "tree_tags",
  "care_log_entries",
  "photos",
  "tasks",
] as const satisfies readonly PublicTable[];

export type ExportedTable = (typeof EXPORTED_TABLES)[number];

// Compile-time exhaustiveness: if a new public table is not listed above, the
// `missing` branch is selected and this assignment fails to typecheck, naming it.
type MissingTables = Exclude<PublicTable, ExportedTable>;
const _assertAllTablesExported: [MissingTables] extends [never]
  ? true
  : { error: "Add this table to EXPORTED_TABLES"; missing: MissingTables } = true;
void _assertAllTablesExported;

export const EXPORT_FORMAT_VERSION = 1;

export type ExportRows = Record<ExportedTable, unknown[]>;

export type ExportBundle = {
  meta: {
    app: "Bonsai Companion";
    format_version: number;
    exported_at: string;
    user_id: string;
    counts: Record<ExportedTable, number>;
  };
} & ExportRows;

/**
 * Pure assembly of the export object from already-fetched rows. Separated from
 * the I/O below so it is unit-testable and its coverage is asserted without a DB.
 */
export function buildExportBundle(
  rows: ExportRows,
  meta: { userId: string; exportedAt: string },
): ExportBundle {
  const counts = Object.fromEntries(
    EXPORTED_TABLES.map((table) => [table, rows[table].length]),
  ) as Record<ExportedTable, number>;

  const tables = Object.fromEntries(
    EXPORTED_TABLES.map((table) => [table, rows[table]]),
  ) as ExportRows;

  return {
    meta: {
      app: "Bonsai Companion",
      format_version: EXPORT_FORMAT_VERSION,
      exported_at: meta.exportedAt,
      user_id: meta.userId,
      counts,
    },
    ...tables,
  };
}

/** Excel reads UTF-8 CSV correctly only with a BOM — matters for accented notes. */
const UTF8_BOM = String.fromCharCode(0xfeff);

function buildCsvReadme(meta: ExportBundle["meta"]): string {
  const counts = EXPORTED_TABLES.map((t) => `  ${t}: ${meta.counts[t]}`).join("\n");
  return [
    "Bonsai Companion — data export",
    "",
    `Exported:        ${meta.exported_at}`,
    `Account:         ${meta.user_id}`,
    `Format version:  ${meta.format_version}`,
    "",
    "This archive contains one CSV per table. The JSON export (Settings →",
    "Export as JSON) is the complete, lossless format for backup and future",
    "import; CSV is a spreadsheet-friendly view. JSON columns (e.g. care",
    "details, task recurrence) appear as compact JSON text within a single cell.",
    "",
    "Row counts:",
    counts,
    "",
  ].join("\n");
}

/**
 * Maps an export bundle to a set of `filename → text` entries for a CSV archive:
 * one CSV per table (BOM-prefixed for Excel) plus a README. Pure — the route
 * turns these into a zip.
 */
export function csvFilesFromBundle(bundle: ExportBundle): Record<string, string> {
  const files: Record<string, string> = {};
  for (const table of EXPORTED_TABLES) {
    const rows = bundle[table] as Array<Record<string, unknown>>;
    files[`${table}.csv`] = UTF8_BOM + rowsToCsv(rows);
  }
  files["README.txt"] = buildCsvReadme(bundle.meta);
  return files;
}

function unwrap<T>(
  result: { data: T[] | null; error: { message: string } | null },
  table: ExportedTable,
): T[] {
  if (result.error) throw new Error(`Export failed reading ${table}: ${result.error.message}`);
  return result.data ?? [];
}

/**
 * Reads every owned table via the RLS-scoped client. Each query is *also*
 * explicitly owner-filtered (defense-in-depth: even if a policy regressed, the
 * export would not widen). `profiles` filters by `id`; `species` by `owner_id`
 * (own rows only); the rest are owner-scoped by RLS and re-asserted here.
 */
export async function collectExportBundle(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ExportBundle> {
  const [profiles, locations, species, tags, trees, treeTags, careLog, photos, tasks] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId),
      supabase.from("locations").select("*").eq("owner_id", userId),
      supabase.from("species").select("*").eq("owner_id", userId),
      supabase.from("tags").select("*").eq("owner_id", userId),
      supabase.from("trees").select("*").eq("owner_id", userId),
      supabase.from("tree_tags").select("*").eq("owner_id", userId),
      supabase.from("care_log_entries").select("*").eq("owner_id", userId),
      supabase.from("photos").select("*").eq("owner_id", userId),
      supabase.from("tasks").select("*").eq("owner_id", userId),
    ]);

  const rows: ExportRows = {
    profiles: unwrap(profiles, "profiles"),
    locations: unwrap(locations, "locations"),
    species: unwrap(species, "species"),
    tags: unwrap(tags, "tags"),
    trees: unwrap(trees, "trees"),
    tree_tags: unwrap(treeTags, "tree_tags"),
    care_log_entries: unwrap(careLog, "care_log_entries"),
    photos: unwrap(photos, "photos"),
    tasks: unwrap(tasks, "tasks"),
  };

  return buildExportBundle(rows, { userId, exportedAt: new Date().toISOString() });
}
