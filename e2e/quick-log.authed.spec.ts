import { expect, test } from "@playwright/test";

import { readFixtures } from "./fixtures";

/**
 * S09.4a: the quick-log entry point (`?log=1`) must open the care form AND bring
 * it into view with focus, instead of leaving it far below the fold on a long
 * profile (finding #5, "quick-log lands off-screen"). The seeded timeline tree
 * carries enough history to push the form down the page, so a focused + in-view
 * first field proves the reveal effect ran.
 */
test("quick-log (?log=1) focuses and reveals the care form", async ({ page }) => {
  const { timelineTreeId } = readFixtures();

  await page.goto(`/collection/${timelineTreeId}?log=1`);

  const typeSelect = page.locator("#care-type");
  await expect(typeSelect).toBeFocused();
  await expect(typeSelect).toBeInViewport();
});
