import { expect, test } from "@playwright/test";

import { readFixtures } from "./fixtures";

/** The app formats task due dates with this (en-GB, "12 Jul 2026"). */
const dueLabel = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    date,
  );

/**
 * Ports the M4 marquee deferred DoD: the daily loop end to end — create a
 * recurring task due today, complete it from Today, and confirm the next
 * occurrence lands as a fresh pending task dated a full interval later. Because
 * the original was due today, a successor dated today+7 proves completion spawned
 * it (rather than just closing the task). The out-of-season skip variant stays
 * covered by the 42 scheduling unit tests + the complete_task pgTAP suite.
 *
 * Markers carry the retry index and every lookup is row-scoped, so a retried run
 * (global-setup seeds once) never trips over its own earlier attempt's tasks —
 * several of which legitimately sit on Today (the successor is within 7 days).
 */
test("recurring task: create → complete from Today → next occurrence lands", async ({
  page,
}, testInfo) => {
  const { loopTreeId } = readFixtures();
  const marker = `E2E recurring ${testInfo.retry}`;

  const now = new Date();
  const plus7 = dueLabel(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));

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
  const todayRow = page.getByRole("listitem").filter({ hasText: marker });
  await expect(todayRow).toBeVisible();
  await todayRow.getByRole("button", { name: "Done" }).click();
  await todayRow.getByRole("button", { name: "Confirm" }).click();

  // 3. The next occurrence lands: back on the tree, the pending task with this
  //    marker is now dated a full interval out (today+7) — proving the successor.
  await page.goto(`/collection/${loopTreeId}`);
  const successor = page.getByRole("listitem").filter({ hasText: marker });
  await expect(successor).toBeVisible();
  await expect(successor).toContainText(plus7);
});
