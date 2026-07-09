import { expect, test } from "@playwright/test";

/**
 * Friction fix F-A/F-B: a completed task stays visible in Today's "Recently done"
 * (it used to vanish), and batch care is discoverable from Today. Uses a freshly
 * created tree + one-off task so parallel specs can't interfere.
 */

test("completing a task keeps it in Today's 'Recently done'", async ({ page }, testInfo) => {
  const treeName = `E2E Done Tree ${testInfo.retry}`;
  const taskTitle = `E2E done-task ${testInfo.retry}`;

  // Isolated tree with a one-off task due today (the add-task default due date).
  await page.goto("/collection/new");
  await page.locator("#name").fill(treeName);
  await page.getByRole("button", { name: "Save tree" }).click();
  await expect(page).toHaveURL(/\/collection\/[0-9a-f-]{36}$/); // create → detail (S09.5)

  await page.getByRole("button", { name: "Add task" }).click(); // open the form
  await page.locator("#task-title").fill(taskTitle);
  await page.getByRole("button", { name: "Add task" }).click(); // submit
  await expect(page.getByText(taskTitle)).toBeVisible();

  // It's due today → complete it from Today.
  await page.goto("/today");
  const row = page.getByRole("listitem").filter({ hasText: taskTitle });
  await expect(row.first()).toBeVisible();
  await row.first().getByRole("button", { name: "Done" }).click();
  await row.first().getByRole("button", { name: "Confirm" }).click();

  // It now lives in "Recently done" instead of disappearing.
  const doneSection = page.locator("section").filter({ hasText: "Recently done" });
  await expect(doneSection.getByText(taskTitle)).toBeVisible({ timeout: 15_000 });
});

test("a completed task stays visible (as done) on the Calendar", async ({ page }, testInfo) => {
  // Markers deliberately avoid the word "done" so the "Done" tag assertion below
  // can't be satisfied by the tree/task name.
  const treeName = `E2E Cal Tree ${testInfo.retry}`;
  const taskTitle = `E2E cal-task ${testInfo.retry}`;

  // Isolated tree with a one-off task due today.
  await page.goto("/collection/new");
  await page.locator("#name").fill(treeName);
  await page.getByRole("button", { name: "Save tree" }).click();
  await expect(page).toHaveURL(/\/collection\/[0-9a-f-]{36}$/); // create → detail (S09.5)

  await page.getByRole("button", { name: "Add task" }).click(); // open the form
  await page.locator("#task-title").fill(taskTitle);
  await page.getByRole("button", { name: "Add task" }).click(); // submit
  await expect(page.getByText(taskTitle)).toBeVisible();

  // Complete it from Today (it's due today), then wait out the server round-trip
  // via the "Recently done" section before navigating away.
  await page.goto("/today");
  const row = page.getByRole("listitem").filter({ hasText: taskTitle });
  await expect(row.first()).toBeVisible();
  await row.first().getByRole("button", { name: "Done" }).click();
  await row.first().getByRole("button", { name: "Confirm" }).click();
  const doneSection = page.locator("section").filter({ hasText: "Recently done" });
  await expect(doneSection.getByText(taskTitle)).toBeVisible({ timeout: 15_000 });

  // F-A part 2: the completed task now also shows on the Calendar (current month,
  // due today) — rendered as done, not as another open to-do.
  await page.goto("/calendar");
  const calRow = page.getByRole("listitem").filter({ hasText: taskTitle });
  await expect(calRow.first()).toBeVisible({ timeout: 15_000 });
  await expect(calRow.first()).toContainText("Done");
});

test("batch care is reachable from Today", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByRole("link", { name: "Log several" })).toHaveAttribute(
    "href",
    "/log/batch",
  );
});
