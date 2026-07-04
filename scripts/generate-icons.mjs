// Rasterises the SVG icon sources in public/icons into the PNG sizes the PWA
// manifest and iOS reference. Uses the Chromium that ships with Playwright (a
// dev dependency) so there is no extra image-processing package to install.
//
// Run after editing icon.svg / icon-maskable.svg:  pnpm icons
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const iconsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

// [source svg, output png, pixel size]
const TARGETS = [
  ["icon.svg", "icon-192.png", 192],
  ["icon.svg", "icon-512.png", 512],
  ["icon-maskable.svg", "icon-maskable-512.png", 512],
  ["icon-maskable.svg", "apple-touch-icon.png", 180],
];

const browser = await chromium.launch();
try {
  for (const [src, out, size] of TARGETS) {
    const svg = readFileSync(join(iconsDir, src), "utf8").replace(
      "<svg ",
      '<svg style="width:100%;height:100%;display:block" ',
    );
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<!doctype html><meta charset="utf-8"><body style="margin:0">` +
        `<div id="icon" style="width:${size}px;height:${size}px;line-height:0">${svg}</div>`,
      { waitUntil: "networkidle" },
    );
    await page.locator("#icon").screenshot({ path: join(iconsDir, out), omitBackground: true });
    await page.close();
    console.log(`✓ ${out} (${size}px) ← ${src}`);
  }
} finally {
  await browser.close();
}
