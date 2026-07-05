import { expect, test } from "@playwright/test";

import { readFixtures } from "./fixtures";

/**
 * Ports the M4 marquee deferred DoD: the daily loop end to end — create a
 * recurring task due today, complete it from Today, and confirm the next
 * occurrence lands as a fresh pending task. (The out-of-season skip variant stays
 * covered by the 42 scheduling unit tests + the complete_task pgTAP suite.)
 */
test("recurring task: create → complete from Today → next occurrence lands", async ({ page }) => {
  const { loopTreeId } = readFixtures();
  const marker = "E2E recurring water";

  // 1. Create a recurring task (every 7 days) due today, on the loop tree.
  await page.goto(`/collection/${loopTreeId}`);
  await page.getByRole("button", { name: "Add task" }).click();
  await page.locator("#task-title").fill(marker);
  await page.getByLabel("Repeats").check();
  await page.locator("#task-interval").fill("7");
  await page.getByRole("button", { name: "Add task" }).click();

  // It lands in the tree's care plan.
  await expect(page.getByText(marker)).toBeVisible();

  // 2. It's due today, so it appears on Today — complete it from there.
  await page.goto("/today");
  await expect(page.getByText(marker)).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();

  // 3. Completed → it leaves Today (the successor is due 7 days out).
  await expect(page.getByText(marker)).toHaveCount(0);

  // 4. The next occurrence is a fresh pending task back in the care plan — proving
  //    completion spawned the successor rather than just closing the task.
  await page.goto(`/collection/${loopTreeId}`);
  await expect(page.getByText(marker)).toBeVisible();
});
