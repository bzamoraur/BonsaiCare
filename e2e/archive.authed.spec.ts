import { expect, test } from "@playwright/test";

/**
 * S09.6: archiving a tree removes it from the collection but keeps it in the
 * Archived view, from which opening it offers Unarchive (restore). Uses a freshly
 * created tree so parallel specs can't interfere. Markers are row-scoped by the
 * unique tree name.
 */
test("archive a tree, find it under Archived, then unarchive it", async ({ page }, testInfo) => {
  const treeName = `E2E Archive Tree ${testInfo.retry}`;

  // Create → its detail page (S09.5).
  await page.goto("/collection/new");
  await page.locator("#name").fill(treeName);
  await page.getByRole("button", { name: "Save tree" }).click();
  await expect(page).toHaveURL(/\/collection\/[0-9a-f-]{36}$/);

  // Archive it (two-step confirm) → back on the collection.
  await page.getByRole("button", { name: "Archive tree" }).click();
  await page.getByRole("button", { name: "Yes, archive" }).click();
  await expect(page).toHaveURL(/\/collection$/);

  // Gone from the active grid...
  await expect(page.getByRole("link").filter({ hasText: treeName })).toHaveCount(0);

  // ...but present under Archived.
  await page.getByRole("link", { name: /View archived/ }).click();
  await expect(page).toHaveURL(/\/collection\?archived=1$/);
  const archivedLink = page.getByRole("link").filter({ hasText: treeName });
  await expect(archivedLink.first()).toBeVisible();

  // Open it and unarchive → back on its detail page, now active again.
  await archivedLink.first().click();
  await expect(page).toHaveURL(/\/collection\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Unarchive" }).click();
  // Unarchive redirects back to the SAME detail URL, so the footer flipping to the
  // active state (Archive available again) — not a URL assert — is what confirms the
  // action committed before we navigate away.
  await expect(page.getByRole("button", { name: "Archive tree" })).toBeVisible();

  // Restored to the active collection.
  await page.goto("/collection");
  await expect(page.getByRole("link").filter({ hasText: treeName }).first()).toBeVisible();
});
