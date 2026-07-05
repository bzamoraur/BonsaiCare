import { expect, test } from "@playwright/test";

import { readFixtures } from "./fixtures";

/**
 * Ports the M4 marquee deferred DoD: the daily loop end to end — create a
 * recurring task due today, complete it from Today, and confirm the next
 * occurrence lands a full interval later (today+7). Because the original was due
 * today, a successor dated today+7 proves completion spawned it. The out-of-season
 * skip variant stays covered by the 42 scheduling unit tests + the complete_task
 * pgTAP suite.
 *
 * We assert the successor on Today itself (it lands in the "Next 7 days" bucket):
 * that polling assertion also waits out the completion's server round-trip, so we
 * never navigate away mid-action. Markers carry the retry index and lookups are
 * row-scoped, so a retried run (global-setup seeds once) never trips over its own
 * earlier attempt's tasks. Today formats due dates without the year ("12 Jul").
 */
test("recurring task: create → complete from Today → next occurrence lands", async ({
  page,
}, testInfo) => {
  const { loopTreeId } = readFixtures();
  const marker = `E2E recurring ${testInfo.retry}`;

  const now = new Date();
  const plus7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const plus7Short = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
    plus7,
  );

  // 1. Create a recurring task (every 7 days) due today, on the loop tree.
  await page.goto(`/collection/${loopTreeId}`);
  await page.getByRole("button", { name: "Add task" }).click();
  await page.locator("#task-title").fill(marker);
  await page.getByLabel("Repeats").check();
  await page.locator("#task-interval").fill("7");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByText(marker)).toBeVisible();

  // 2. It's due today, so it appears on Today — complete it from its row.
  await page.goto("/today");
  const row = page.getByRole("listitem").filter({ hasText: marker });
  await expect(row.first()).toBeVisible();
  await row.first().getByRole("button", { name: "Done" }).click();
  await row.first().getByRole("button", { name: "Confirm" }).click();

  // 3. The loop closes: the next occurrence lands a full interval out (today+7)
  //    and now sits in Today's "Next 7 days" bucket. Polling here also waits for
  //    the completion to commit before the test ends (no mid-action navigation).
  await expect(page.getByRole("listitem").filter({ hasText: marker }).first()).toContainText(
    plus7Short,
    { timeout: 15_000 },
  );
});
