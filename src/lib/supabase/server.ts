import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 *
 * Cookie writes attempted from a Server Component are ignored (cookies are
 * read-only there); the proxy (src/proxy.ts) refreshes the session on every
 * request, so a dropped write here is harmless.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session, so this can be safely ignored.
        }
      },
    },
  });
}
