import { expect, test } from "@playwright/test";

/**
 * F7 critical journey: the owner exports a portable copy of their data. The
 * export buttons fetch the `/settings/export…` route, build a Blob, and click a
 * programmatic `<a download>` — so a real browser download fires. It works on any
 * authenticated account with no seeded data (an empty collection still yields a
 * valid bundle/archive), so these assert the download event + the server-dated
 * filename pattern rather than file contents.
 */

test("export data as JSON downloads a dated file", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export as JSON" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^bonsai-export-\d{4}-\d{2}-\d{2}\.json$/);
});

test("export photos downloads a dated archive", async ({ page }) => {
  await page.goto("/settings");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download photos" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^bonsai-photos-\d{4}-\d{2}-\d{2}\.zip$/);
});
