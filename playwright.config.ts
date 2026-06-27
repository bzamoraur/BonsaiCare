import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end config. E2E covers the critical user journeys (see
 * docs/development/testing-strategy.md). It is NOT run in the default CI job
 * (which does typecheck/lint/unit/build); run locally with `pnpm test:e2e`.
 * First run needs browsers: `pnpm exec playwright install chromium`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
