import { expect, test } from "@playwright/test";

/**
 * S09.7: a pending task can be completed straight from the calendar agenda (inline
 * TaskActions), and a grid day cell jumps to its agenda section. Fresh tree + a
 * one-off task due today so it lands in the current month; markers avoid the word
 * "done" so the "· Done" tag assertion is unambiguous.
 */
test("complete a task from the calendar agenda; day cells anchor", async ({ page }, testInfo) => {
  const treeName = `E2E CalAct Tree ${testInfo.retry}`;
  const taskTitle = `E2E calact-task ${testInfo.retry}`;

  // Create tree → detail (S09.5), then add a one-off task due today.
  await page.goto("/collection/new");
  await page.locator("#name").fill(treeName);
  await page.getByRole("button", { name: "Save tree" }).click();
  await expect(page).toHaveURL(/\/collection\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "Add task" }).click(); // open the form
  await page.locator("#task-title").fill(taskTitle);
  await page.getByRole("button", { name: "Add task" }).click(); // submit
  await expect(page.getByText(taskTitle)).toBeVisible();

  // On the calendar it shows in today's agenda as a pending row.
  await page.goto("/calendar");
  const row = page.getByRole("listitem").filter({ hasText: taskTitle });
  await expect(row.first()).toBeVisible();

  // A day cell with tasks jumps to its agenda section (updates the URL hash).
  await page.locator('a[href^="#day-"]').first().click();
  await expect(page).toHaveURL(/#day-\d{4}-\d{2}-\d{2}$/);

  // Complete it inline (Done → Confirm) — it flips to a settled "Done" row with
  // no more actions.
  await row.first().getByRole("button", { name: "Done" }).click();
  await row.first().getByRole("button", { name: "Confirm" }).click();
  await expect(row.first()).toContainText("Done", { timeout: 15_000 });
  await expect(row.first().getByRole("button", { name: "Done" })).toHaveCount(0);
});
