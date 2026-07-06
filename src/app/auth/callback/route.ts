import { NextResponse } from "next/server";

import { logActionError } from "@/lib/log-action-error";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. Supabase redirects here with a one-time `code`, which we
 * exchange for a session (PKCE). On success we forward into the app; otherwise
 * we return to /login with an error flag.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/today";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Failed exchanges (expired link, PKCE verifier missing — e.g. the link was
    // opened in a different browser than the one that requested it) are the
    // hardest auth failures to debug from a user report; leave a trace.
    logActionError("authCallback.exchange", error);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
