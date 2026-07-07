import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { readFixtures } from "./fixtures";

/**
 * Accessibility smoke over the core authenticated screens. A smoke, not a full
 * audit: it fails only on **serious/critical** WCAG 2 A/AA violations — the ones
 * that actually block users — tolerating minor/moderate cosmetic findings so the
 * gate stays low-noise and honest. Each screen is gated on a stable "ready"
 * locator before axe runs, so we never scan a half-rendered page.
 */

const WCAG_AA = ["wcag2a", "wcag2aa"];

/** Run axe and keep only the violations that meaningfully block users. */
async function seriousViolations(page: Page): Promise<{ ok: boolean; report: string }> {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  return {
    ok: serious.length === 0,
    report: serious.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`).join("\n"),
  };
}

test("Today has no serious accessibility violations", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();
  const { ok, report } = await seriousViolations(page);
  expect(ok, report).toBe(true);
});

test("Collection has no serious accessibility violations", async ({ page }) => {
  await page.goto("/collection");
  await expect(page.getByRole("heading", { name: "Collection", level: 1 })).toBeVisible();
  const { ok, report } = await seriousViolations(page);
  expect(ok, report).toBe(true);
});

test("A tree's detail has no serious accessibility violations", async ({ page }) => {
  const { timelineTreeId } = readFixtures();
  await page.goto(`/collection/${timelineTreeId}`);
  // The h1 is the (dynamic) tree name, so gate on the always-present primary nav.
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  const { ok, report } = await seriousViolations(page);
  expect(ok, report).toBe(true);
});

test("Calendar has no serious accessibility violations", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: "Calendar", level: 1 })).toBeVisible();
  const { ok, report } = await seriousViolations(page);
  expect(ok, report).toBe(true);
});
