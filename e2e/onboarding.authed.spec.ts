import { expect, test } from "@playwright/test";

/**
 * First-run onboarding tour, exercised via the Settings "replay" control — a
 * stable entry point independent of the per-user seen flag (the shared test user
 * is marked already-onboarded in global-setup, so the tour never auto-opens over
 * the other flow specs). Proves the carousel renders its three steps, navigates
 * both ways, and dismisses. The UI runs in English (the harness has no locale
 * cookie, so it defaults to the browser's en-US).
 */

test("replaying the onboarding tour walks the three steps and dismisses", async ({ page }) => {
  await page.goto("/settings");

  // Not open on load — the test user is already onboarded.
  await expect(page.getByRole("heading", { name: "Add your first tree" })).toBeHidden();

  await page.getByRole("button", { name: "Replay tour" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Step 1 → 2 → 3.
  await expect(dialog.getByRole("heading", { name: "Add your first tree" })).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByRole("heading", { name: "Log care in seconds" })).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByRole("heading", { name: "Follow each tree's story" })).toBeVisible();

  // The last step offers the add-a-tree call to action instead of "Next".
  await expect(dialog.getByRole("link", { name: "Add my first tree" })).toBeVisible();

  // Back returns to the previous step.
  await dialog.getByRole("button", { name: "Back" }).click();
  await expect(dialog.getByRole("heading", { name: "Log care in seconds" })).toBeVisible();

  // Skip/close dismisses the tour.
  await dialog.getByRole("button", { name: "Skip the tour" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});
