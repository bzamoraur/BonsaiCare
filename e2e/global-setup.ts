import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import { E2E_USER, STORAGE_STATE } from "./auth-constants";

/**
 * Playwright global setup: mint a confirmed test user and produce an
 * authenticated storage state for the `authenticated` project.
 *
 * The session cookie is produced BY `@supabase/ssr` itself (sign in through a
 * server client and capture whatever cookies it writes), never hand-crafted —
 * so the format can't drift from what the app reads. There is deliberately NO
 * app-side auth-bypass route: this runs only against the local CI Supabase
 * stack, using the admin key that never reaches the browser or the app runtime.
 */
export default async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error(
      "E2E global-setup needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, " +
        "and SUPABASE_SERVICE_ROLE_KEY (set from `supabase status` in CI).",
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Start from a clean slate so re-runs against a reused stack are deterministic.
  const { data: existing } = await admin.auth.admin.listUsers();
  const prior = existing?.users.find((u) => u.email === E2E_USER.email);
  if (prior) await admin.auth.admin.deleteUser(prior.id);

  const { error: createError } = await admin.auth.admin.createUser({
    email: E2E_USER.email,
    password: E2E_USER.password,
    email_confirm: true,
  });
  if (createError) throw new Error(`Failed to create e2e user: ${createError.message}`);

  // Sign in through an @supabase/ssr client and capture the cookies IT writes.
  const captured = new Map<string, { name: string; value: string }>();
  const ssr = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => Array.from(captured.values()),
      setAll: (list) => {
        for (const { name, value } of list) captured.set(name, { name, value });
      },
    },
  });
  const { error: signInError } = await ssr.auth.signInWithPassword({
    email: E2E_USER.email,
    password: E2E_USER.password,
  });
  if (signInError) throw new Error(`Failed to sign in e2e user: ${signInError.message}`);

  const cookies = Array.from(captured.values());
  if (cookies.length === 0) {
    throw new Error(
      "No auth cookies were captured after sign-in — the harness cannot authenticate.",
    );
  }

  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
  const storageState = {
    cookies: cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: "/",
      expires,
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
    origins: [],
  };

  await mkdir(path.dirname(STORAGE_STATE), { recursive: true });
  await writeFile(STORAGE_STATE, JSON.stringify(storageState, null, 2));
}
