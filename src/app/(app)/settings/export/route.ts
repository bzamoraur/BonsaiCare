import { createClient } from "@/lib/supabase/server";
import { collectExportBundle } from "@/server/export";

/**
 * GET /settings/export?format=json — downloads a full account export.
 *
 * Read-only and RLS-scoped: `collectExportBundle` reads only the caller's rows.
 * The `(app)` proxy already gates auth; we re-check as defense-in-depth. CSV and
 * the photo archive land as further `format` values in later slices.
 */
export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (format !== "json") {
    return new Response(`Unsupported export format: ${format}`, { status: 400 });
  }

  let body: string;
  try {
    const bundle = await collectExportBundle(supabase, user.id);
    body = JSON.stringify(bundle, null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";
    return new Response(message, { status: 500 });
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bonsai-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
