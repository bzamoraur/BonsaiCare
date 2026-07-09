import { expect, test } from "@playwright/test";

/**
 * Repeat-last-event (S09.2) + recency chip (S09.3): log a care event, see the
 * "watered today" chip on the tree, then one-tap "Repeat" to re-log it with a
 * fresh date. Uses a freshly created tree so parallel specs (e.g. batch-log)
 * can't interleave care entries and change which entry "Repeat" clones.
 */
test("repeat the last care event with one tap", async ({ page }, testInfo) => {
  const treeName = `E2E Repeat Tree ${testInfo.retry}`;
  const marker = `E2E repeat-care ${testInfo.retry}`;

  await page.goto("/collection/new");
  await page.locator("#name").fill(treeName);
  await page.getByRole("button", { name: "Save tree" }).click();
  await expect(page).toHaveURL(/\/collection\/[0-9a-f-]{36}$/); // create → detail (S09.5)

  // Log an initial watering (the care-type default).
  await page.getByRole("button", { name: "Log care" }).click();
  await page.locator("#care-title").fill(marker);
  await page.getByRole("button", { name: "Log it" }).click();
  await expect(page.getByText(marker)).toHaveCount(1);

  // The recency chip reflects it.
  await expect(page.getByText(/watered today/i)).toBeVisible();

  // One-tap repeat re-logs the latest entry → a second entry with the same title.
  await page.getByRole("button", { name: /^Repeat/ }).click();
  await expect(page.getByText(marker)).toHaveCount(2);
});
