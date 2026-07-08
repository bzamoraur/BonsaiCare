import { expect, test } from "@playwright/test";

import { readFixtures } from "./fixtures";

/**
 * Batch care logging (M6/S09 slice 1): one care event logged across several trees
 * in a single action. Picks the two seeded trees, logs a watering with a unique
 * title, confirms the success count, and verifies the entry landed on a selected
 * tree's timeline. The marker carries the retry index so a retried run (global
 * setup seeds once) never collides with an earlier attempt.
 */
test("log the same care event across several trees at once", async ({ page }, testInfo) => {
  const { timelineTreeId } = readFixtures();
  const marker = `E2E batch ${testInfo.retry}`;

  await page.goto("/log/batch");
  await expect(
    page.getByRole("heading", { name: "Log care for several trees", level: 1 }),
  ).toBeVisible();

  // Pick the two seeded trees explicitly (count is deterministic), title it, log.
  await page.getByRole("checkbox", { name: "E2E Timeline Tree" }).check();
  await page.getByRole("checkbox", { name: "E2E Loop Tree" }).check();
  await page.locator("#care-title").fill(marker);
  await page.getByRole("button", { name: "Log for 2 trees" }).click();

  // The success confirmation names the count.
  await expect(page.getByRole("status")).toContainText("Logged for 2 trees");

  // The entry landed on a selected tree's timeline.
  await page.goto(`/collection/${timelineTreeId}`);
  await expect(page.getByText(marker).first()).toBeVisible();
});
