import { test, expect } from "@playwright/test";

/**
 * Pass 1 — Presentation transition system.
 *
 * Verifies SlideStage mounts an outgoing "previous" layer during a
 * transition and cleans it up afterward, and that prefers-reduced-motion
 * bypasses the animation (no previous layer ever mounts).
 */

const URL = "/dev/slidestage-demo";

test.use({ viewport: { width: 1280, height: 1800 } });

test.describe("SlideStage transitions", () => {
  test("mounts previous layer during fade + unmounts after", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.getByTestId("demo-slide-d-1").waitFor();

    // Sanity: single "current" layer, no "previous".
    await expect(page.locator("[data-slidestage-layer='current']")).toHaveCount(1);
    await expect(page.locator("[data-slidestage-layer='previous']")).toHaveCount(0);

    // Force a slower duration so we can observe the intermediate state.
    const dur = page.getByTestId("demo-duration");
    await dur.fill("800");

    await page.getByTestId("demo-next").click();

    // Mid-transition: previous layer should be mounted alongside current.
    await expect(page.locator("[data-slidestage-layer='previous']")).toHaveCount(1, { timeout: 500 });
    await expect(page.locator("[data-slidestage-layer='current']")).toHaveCount(1);

    // After the transition + cleanup buffer completes, previous is gone.
    await expect(page.locator("[data-slidestage-layer='previous']")).toHaveCount(0, { timeout: 2000 });
    await expect(page.getByTestId("demo-slide-d-2")).toBeVisible();
  });

  test("reduced motion skips the previous layer entirely", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 1800 } });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.getByTestId("demo-slide-d-1").waitFor();

    await page.getByTestId("demo-duration").fill("800");
    await page.getByTestId("demo-next").click();

    // Under reduced-motion, SlideStage swaps instantly — the previous layer
    // must never mount. Poll briefly to prove it stays at 0.
    for (let i = 0; i < 6; i++) {
      await expect(page.locator("[data-slidestage-layer='previous']")).toHaveCount(0);
      await page.waitForTimeout(80);
    }
    await expect(page.getByTestId("demo-slide-d-2")).toBeVisible();
    await context.close();
  });

  test("cut and none never mount a previous layer", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.getByTestId("demo-slide-d-1").waitFor();
    await page.getByTestId("demo-duration").fill("600");

    for (const type of ["cut", "none"] as const) {
      await page.getByTestId("demo-type").selectOption(type);
      await page.getByTestId("demo-next").click();
      for (let i = 0; i < 4; i++) {
        await expect(page.locator("[data-slidestage-layer='previous']")).toHaveCount(0);
        await page.waitForTimeout(50);
      }
      await page.getByTestId("demo-prev").click();
    }
  });
});
