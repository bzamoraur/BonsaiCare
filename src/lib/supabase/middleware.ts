import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

/**
 * Paths reachable without a session: the sign-in screen, auth callbacks, the
 * privacy note, and the client-crash sink (`/api/log-error` must accept beacons
 * from an unauthenticated /login crash — otherwise those crashes redirect to
 * /login and are never recorded; the RPC self-stamps a NULL owner for them).
 */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/privacy" ||
    pathname === "/api/log-error" ||
    pathname.startsWith("/auth/")
  );
}

/**
 * Refreshes the Supabase session on every request and gates the app: an
 * unauthenticated visitor to any non-public path is redirected to /login.
 *
 * Follows the @supabase/ssr contract precisely — create the client, call
 * `getUser()` immediately, and return `supabaseResponse` with its cookies
 * intact. Do not insert logic between client creation and `getUser()`, and do
 * not construct a different response, or sessions will desync.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
