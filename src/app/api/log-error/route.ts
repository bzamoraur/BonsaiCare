import { NextResponse } from "next/server";

import { parseClientErrorReport } from "@/lib/app-error-report";
import { createClient } from "@/lib/supabase/server";

/**
 * Client-crash sink for the error boundaries' `sendBeacon` (see
 * report-client-error.ts). A Route Handler — not a Server Action — because the
 * beacon fires from global-error.tsx, which replaces the whole document.
 *
 * It persists to `app_errors` via the `record_client_error` RPC, which
 * self-stamps `owner_id` from the session (NULL for an unauthenticated /login
 * crash — the RPC is granted to anon for exactly this). Everything is best-effort
 * and always answers 204: a beacon has no reader, and we never reveal internals.
 *
 * Abuse surface (documented, accepted for a personal app): anon can POST here.
 * Mitigations — a hard body-size cap, string validation + length bounds (here and
 * again in the RPC), pathname-only paths, and an owner-only read. No cross-request
 * rate limit (no KV on the free tier); the size cap + bounds keep any single call
 * cheap and the table PII-poor.
 */

const MAX_BODY_BYTES = 8_000;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const args = parseClientErrorReport(body, {
    userAgent: request.headers.get("user-agent"),
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
  if (!args) return new NextResponse(null, { status: 400 });

  try {
    const supabase = await createClient();
    await supabase.rpc("record_client_error", args);
  } catch {
    // Best-effort: the error reporter must never itself error out.
  }

  return new NextResponse(null, { status: 204 });
}
