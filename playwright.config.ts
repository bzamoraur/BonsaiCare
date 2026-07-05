import { defineConfig, devices } from "@playwright/test";

import { STORAGE_STATE } from "./e2e/auth-constants";

/**
 * End-to-end config. Covers the critical journeys (see
 * docs/development/testing-strategy.md). Two projects:
 *  - `public`        — unauthenticated pages (the sign-in screen).
 *  - `authenticated` — everything behind auth, using the storage state minted by
 *                      `global-setup.ts` (a real @supabase/ssr session cookie).
 *
 * In CI the `e2e` job boots the local Supabase stack, exports its keys, builds,
 * and runs against `next start`. Locally: `pnpm test:e2e` (needs a running
 * Supabase + the same env; first run: `pnpm exec playwright install chromium`).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "public",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testMatch: /\.authed\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
    },
  ],
});
