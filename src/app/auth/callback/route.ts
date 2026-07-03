import { NextResponse } from "next/server";

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
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
