import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Supabase client for Client Components (browser). Keeps the session in cookies
 * so it stays in sync with the server. RLS constrains everything this client can
 * do, so the publishable key is safe to ship to the browser.
 */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
}
