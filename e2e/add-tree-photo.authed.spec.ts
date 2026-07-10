import { expect, test } from "@playwright/test";

/**
 * F2 critical journey: add a tree via the form, then attach a photo to it and
 * see the photo appear. Exercises the full create path (`/collection/new` →
 * redirect to `/collection`) plus the client-side Supabase Storage upload (the
 * `tree-photos` bucket, owner-scoped RLS) and the `recordPhoto` server action on
 * the tree-detail page.
 *
 * The tree name carries the retry index so a retried run (global-setup seeds
 * once, not per-retry) never collides with an earlier attempt's tree. The
 * uploader's `compressImage` decodes the file via `createImageBitmap` and
 * re-encodes it with `canvas.toBlob("image/webp")`, so a stub byte would throw
 * before the upload — we feed `setInputFiles` a real, decodable 1×1 PNG.
 */

// A real, decodable 2×2 PNG (generated with valid CRCs) — small, but a genuine
// image `createImageBitmap` can decode; a garbage/empty file would make
// compressImage throw before the upload ever fires.
const PNG_2X2_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEUlEQVR4nGOIqg2Jqg1hgFAAINoErY0CuQQAAAAASUVORK5CYII=";

test("add a tree, then attach a photo to it", async ({ page }, testInfo) => {
  const treeName = `E2E Photo Tree ${testInfo.retry}`;

  // 1. Create the tree — name is the only required field.
  await page.goto("/collection/new");
  await page.locator("#name").fill(treeName);
  await page.getByRole("button", { name: "Save tree" }).click();

  // 2. Create redirects straight to the new tree's detail page (S09.5).
  await expect(page).toHaveURL(/\/collection\/[0-9a-f-]{36}$/);

  // 3. Attach a photo. The file input is hidden, but setInputFiles drives it
  //    directly — firing the client upload → Storage → recordPhoto → refresh.
  await page.locator('input[type="file"]').setInputFiles({
    name: "bonsai.png",
    mimeType: "image/png",
    buffer: Buffer.from(PNG_2X2_BASE64, "base64"),
  });

  // 4. The tree's hero image (its newest photo, alt = the tree name) now renders,
  //    proving the upload + DB record landed. The polling assertion also waits
  //    out the upload's round-trip, so we never end the test mid-action.
  await expect(page.getByRole("img", { name: treeName })).toBeVisible({ timeout: 15_000 });

  // 5. S10.1: the timeline shows the small thumbnail rendition — its signed URL
  //    path ends in `.thumb.webp` — proving the thumb was generated at upload,
  //    stored at the derived path, signed, and used in place of the full image.
  await expect(page.locator('img[src*=".thumb.webp"]').first()).toBeVisible({ timeout: 15_000 });
});
