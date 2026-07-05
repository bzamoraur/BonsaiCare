import path from "node:path";

/** Where global-setup writes the authenticated Playwright storage state. */
export const STORAGE_STATE = path.join(process.cwd(), "e2e", ".auth", "user.json");

/** Where global-setup writes seeded record ids (tree ids) for the flow specs. */
export const FIXTURES_PATH = path.join(process.cwd(), "e2e", ".auth", "fixtures.json");

/** The confirmed user global-setup provisions for authenticated specs. */
export const E2E_USER = {
  email: "e2e-user@bonsai.test",
  password: "e2e-password-123",
} as const;
