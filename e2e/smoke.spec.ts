import { expect, test } from "@playwright/test";

test("home page loads and is titled Bonsai Companion", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Bonsai Companion/i);
});
