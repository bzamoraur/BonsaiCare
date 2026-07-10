import { expect, test } from "@playwright/test";

/**
 * S09.5b: the care form pre-fills a type's detail fields from the last entry of
 * that type on the same tree (derived from the already-loaded timeline). Log a
 * watering with an amount, reload, reopen the form → the amount is pre-filled.
 */
test("care detail fields pre-fill from the last entry of that type", async ({ page }, testInfo) => {
  const treeName = `E2E Prefill Tree ${testInfo.retry}`;
  const amount = `thorough-${testInfo.retry}`;

  // Create tree → its detail page (S09.5).
  await page.goto("/collection/new");
  await page.locator("#name").fill(treeName);
  await page.getByRole("button", { name: "Save tree" }).click();
  await expect(page).toHaveURL(/\/collection\/[0-9a-f-]{36}$/);

  // Log a watering with an amount (watering is the default care type).
  await page.getByRole("button", { name: "Log care" }).click();
  await page.locator("#care-amount").fill(amount);
  await page.getByRole("button", { name: "Log it" }).click();
  await expect(page.getByText("Logged ✓")).toBeVisible({ timeout: 15_000 });

  // A fresh render derives the pre-fill from the timeline: reopen the form and the
  // amount is already filled in.
  await page.reload();
  await page.getByRole("button", { name: "Log care" }).click();
  await expect(page.locator("#care-amount")).toHaveValue(amount);
});
