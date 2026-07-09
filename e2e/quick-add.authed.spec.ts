import { expect, test } from "@playwright/test";

/**
 * S09.4b: the global quick-add sheet (nav "+") logs care against any tree without
 * loading its full profile, and offers a photo mode in the same sheet. Uses a
 * freshly created tree so parallel specs can't change which option we pick.
 */
test("quick-add sheet: log care and reach photo mode from the nav", async ({ page }, testInfo) => {
  const treeName = `E2E QuickAdd Tree ${testInfo.retry}`;
  const marker = `E2E quickadd-care ${testInfo.retry}`;

  // Isolated tree (create → its detail page, S09.5).
  await page.goto("/collection/new");
  await page.locator("#name").fill(treeName);
  await page.getByRole("button", { name: "Save tree" }).click();
  await expect(page).toHaveURL(/\/collection\/[0-9a-f-]{36}$/);

  // Open the sheet from the nav "+".
  await page.goto("/today");
  await page.getByRole("link", { name: "Quick log" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Pick our tree and log a watering (the default care type) — no profile loaded.
  await dialog.locator("#quick-tree").selectOption({ label: treeName });
  await dialog.locator("#quick-care-title").fill(marker);
  await dialog.getByRole("button", { name: "Log it" }).click();
  await expect(dialog.getByText("Logged ✓")).toBeVisible({ timeout: 15_000 });

  // Photo mode reveals the uploader in the same sheet.
  await dialog.getByRole("button", { name: "Add photo" }).click();
  await expect(dialog.getByText(/added to this tree/i)).toBeVisible();
});
