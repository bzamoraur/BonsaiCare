import { expect, test } from "@playwright/test";

/**
 * PWA installability smoke: the manifest, its icons, and the service-worker
 * script are served correctly, and the document links the manifest. These are
 * public static assets (no session needed), so this runs in the `public`
 * project. Guards the install/offline surface shipped in S08.5/S08.6.
 */

test("the web app manifest is served and well-formed", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);

  const manifest = JSON.parse(await res.text());
  expect(manifest.name).toBe("Bonsai Companion");
  expect(Array.isArray(manifest.icons)).toBe(true);
  expect(manifest.icons.length).toBeGreaterThan(0);
});

test("every manifest icon is served", async ({ request }) => {
  const manifest = JSON.parse(await (await request.get("/manifest.webmanifest")).text());
  for (const icon of manifest.icons as { src: string }[]) {
    const res = await request.get(icon.src);
    expect(res.status(), `icon ${icon.src}`).toBe(200);
  }
});

test("the service worker script is served as JavaScript", async ({ request }) => {
  const res = await request.get("/sw.js");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"] ?? "").toMatch(/javascript/);
});

test("the sign-in document links the manifest", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
});
