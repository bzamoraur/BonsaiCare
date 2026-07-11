import { after } from "next/server";

import { serverErrorArgs } from "@/lib/app-error-report";
import { createClient } from "@/lib/supabase/server";

/**
 * The one place server-side failures get recorded (golden rule: no silent
 * catches). It does two things, both best-effort:
 *
 *  1. `console.error` → Vercel's function logs (the immediate, ~1h-retention
 *     floor; the free-tier observability baseline while Sentry stays
 *     uninstallable on Next 16).
 *  2. Persists the error to the `app_errors` table (source='server') via
 *     `record_client_error`, giving the owner a durable log on /admin. Scheduled
 *     with `after()` so the write runs AFTER the response (reliable on
 *     serverless, zero added latency) and self-stamps the acting user's id.
 *
 * Bulletproof by design — an error logger must never itself throw: `after()`
 * throws if called outside a request scope (e.g. a build-time or script call),
 * and the DB write can fail; both are swallowed, leaving the console log as the
 * floor. `context` is a stable machine-ish tag ("createTree"), never user
 * content, so the log stays PII-poor.
 */
export function logActionError(context: string, error: unknown) {
  console.error(`[action:${context}]`, error);

  try {
    after(async () => {
      try {
        const supabase = await createClient();
        await supabase.rpc(
          "record_client_error",
          serverErrorArgs(context, error, process.env.VERCEL_GIT_COMMIT_SHA),
        );
      } catch {
        // Durable persistence is best-effort; the console log above is the floor.
      }
    });
  } catch {
    // after() called outside a request scope — nothing more to do.
  }
}
