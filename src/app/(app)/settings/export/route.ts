import { strToU8, zipSync } from "fflate";

import { logActionError } from "@/lib/log-action-error";
import { createClient } from "@/lib/supabase/server";
import { collectExportBundle, csvFilesFromBundle } from "@/server/export";

/**
 * GET /settings/export?format=json|csv — downloads a full account export.
 *
 * Read-only and RLS-scoped: `collectExportBundle` reads only the caller's rows.
 * The `(app)` proxy already gates auth; we re-check as defense-in-depth. `json`
 * is the lossless format; `csv` is a zip of one spreadsheet-friendly file per
 * table. The photo archive lands as a further `format` value in the next slice.
 */
export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv") {
    return new Response(`Unsupported export format: ${format}`, { status: 400 });
  }

  const date = new Date().toISOString().slice(0, 10);

  try {
    const bundle = await collectExportBundle(supabase, user.id);

    if (format === "json") {
      return new Response(JSON.stringify(bundle, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="bonsai-export-${date}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // format === "csv" — one CSV per table + README, zipped.
    const files = csvFilesFromBundle(bundle);
    const zippable = Object.fromEntries(
      Object.entries(files).map(([name, text]) => [name, strToU8(text)]),
    );
    const zipped = zipSync(zippable, { level: 6 });

    return new Response(zipped, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="bonsai-export-${date}-csv.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logActionError("exportDownload", error);
    const message = error instanceof Error ? error.message : "Export failed.";
    return new Response(message, { status: 500 });
  }
}
