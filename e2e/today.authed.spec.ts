import { expect, test } from "@playwright/test";

/**
 * Proves the auth harness end to end: with an injected @supabase/ssr session,
 * the proxy lets the request through to protected routes instead of bouncing to
 * /login. This is the reusable unblock the deferred daily-loop / timeline e2es
 * build on.
 */

test("an authenticated user reaches the Today dashboard", async ({ page }) => {
  await page.goto("/today");
  await expect(page).toHaveURL(/\/today$/); // not redirected to /login
  await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
});

test("the root redirects an authenticated user to Today", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/today$/);
});

test("an authenticated user can open their collection", async ({ page }) => {
  await page.goto("/collection");
  await expect(page).toHaveURL(/\/collection$/);
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
});
