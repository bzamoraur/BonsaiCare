import { expect, test } from "@playwright/test";

// Public project: no session. The sign-in screen must render for a visitor.
test("the sign-in screen is reachable without a session", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Bonsai Companion" })).toBeVisible();
  await expect(page.getByRole("button", { name: /magic link/i })).toBeVisible();
});
