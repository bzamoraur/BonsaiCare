import { expect, test } from "@playwright/test";

import { readFixtures } from "./fixtures";

/**
 * Ports the M3 deferred DoD: log a care event and see it appear on the tree's
 * timeline. The marker includes the retry index so a retried run (global-setup
 * seeds once, not per-retry) never collides with its own earlier attempt's data.
 */
test("logging a care event shows it on the tree's timeline", async ({ page }, testInfo) => {
  const { timelineTreeId } = readFixtures();
  const marker = `E2E watering ${testInfo.retry}`;

  await page.goto(`/collection/${timelineTreeId}`);

  // Open the "Log care" form (type defaults to Watering) and give it a unique title.
  await page.getByRole("button", { name: "Log care" }).click();
  await page.locator("#care-title").fill(marker);
  await page.getByRole("button", { name: "Log it" }).click();

  // The entry appears in the timeline (same page, after the action revalidates).
  await expect(page.getByText(marker)).toBeVisible();
});
