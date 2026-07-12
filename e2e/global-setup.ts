import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import { E2E_USER, FIXTURES_PATH, STORAGE_STATE } from "./auth-constants";

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

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: E2E_USER.email,
    password: E2E_USER.password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new Error(`Failed to create e2e user: ${createError?.message ?? "no user returned"}`);
  }

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

  // Treat the shared test user as already-onboarded (mirrors the production
  // backfill for pre-existing users) so the first-run tour modal never overlays
  // and focus-traps the flow specs. The dedicated onboarding spec opens the tour
  // explicitly via the Settings "replay" control instead. RLS permits the own-row
  // update through the authenticated client.
  const { error: onboardingError } = await ssr
    .from("profiles")
    .update({ onboarding_seen_at: new Date().toISOString() })
    .eq("id", created.user.id);
  if (onboardingError) {
    throw new Error(`Failed to mark e2e user onboarded: ${onboardingError.message}`);
  }

  const cookies = Array.from(captured.values());
  if (cookies.length === 0) {
    throw new Error(
      "No auth cookies were captured after sign-in — the harness cannot authenticate.",
    );
  }

  // Seed one tree per flow spec (isolated so parallel specs never collide). Seeded
  // via the *authenticated* client, not the admin key: the migrations grant table
  // access to `authenticated` (not service_role), and RLS permits own-row inserts.
  const { data: trees, error: seedError } = await ssr
    .from("trees")
    .insert([
      { owner_id: created.user.id, name: "E2E Timeline Tree", health_status: "healthy" },
      { owner_id: created.user.id, name: "E2E Loop Tree", health_status: "healthy" },
    ])
    .select("id, name");
  if (seedError || !trees) {
    throw new Error(`Failed to seed trees: ${seedError?.message ?? "no trees returned"}`);
  }
  const treeId = (name: string) => {
    const match = trees.find((t) => t.name === name);
    if (!match) throw new Error(`Seed tree not found: ${name}`);
    return match.id as string;
  };

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

  const fixtures = {
    userId: created.user.id,
    timelineTreeId: treeId("E2E Timeline Tree"),
    loopTreeId: treeId("E2E Loop Tree"),
  };
  await writeFile(FIXTURES_PATH, JSON.stringify(fixtures, null, 2));
}
