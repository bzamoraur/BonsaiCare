import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 "proxy" (formerly `middleware`). Runs on every non-static request
 * to refresh the Supabase session and protect the app shell.
 *
 * Must stay named `proxy` in a file named `proxy.ts`: in Next 16 a leftover
 * `middleware.ts` is silently ignored, which would leave protected routes
 * publicly reachable.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
