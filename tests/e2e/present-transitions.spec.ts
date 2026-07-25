import { test, expect } from "@playwright/test";

async function createDeckViaSkipAI(page: any) {
  await page.goto("/brief/new", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const skip = page.getByRole("button", { name: /skip AI/i });
  await skip.click();

  await page.waitForURL(/\/decks\/[A-Za-z0-9_-]+/, { timeout: 15000 });
  await page.waitForTimeout(1500);
  return page.url();
}

async function openPresentMode(page: any, deckUrl: string) {
  const deckId = deckUrl.match(/\/decks\/([A-Za-z0-9_-]+)/)?.[1];
  if (!deckId) throw new Error("Could not extract deck id from " + deckUrl);
  await page.goto(`/decks/${deckId}/present`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  return deckId;
}

test.describe("Present mode transitions", () => {
  test("advancing a slide mounts the transition layer, then unmounts it", async ({
    page,
  }) => {
    const deckUrl = await createDeckViaSkipAI(page);
    await openPresentMode(page, deckUrl);

    const root = page.locator("[data-slide-stage-root]");
    await expect(root).toBeVisible();

    // Initially only the current layer exists.
    await expect(root.locator('[data-slidestage-layer="current"]')).toHaveCount(1);
    await expect(root.locator('[data-slidestage-layer="previous"]')).toHaveCount(0);

    // Advance to the next slide.
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);

    // During the transition both layers should be mounted.
    await expect(root.locator('[data-slidestage-layer="current"]')).toHaveCount(1);
    await expect(root.locator('[data-slidestage-layer="previous"]')).toHaveCount(1);

    // Wait for the default 400ms transition + buffer.
    await page.waitForTimeout(600);

    // After the transition the previous layer should be gone.
    await expect(root.locator('[data-slidestage-layer="current"]')).toHaveCount(1);
    await expect(root.locator('[data-slidestage-layer="previous"]')).toHaveCount(0);
  });

  test("reduced motion skips the transition layer entirely", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    const deckUrl = await createDeckViaSkipAI(page);
    await openPresentMode(page, deckUrl);

    const root = page.locator("[data-slide-stage-root]");
    await expect(root).toBeVisible();

    await expect(root.locator('[data-slidestage-layer="current"]')).toHaveCount(1);
    await expect(root.locator('[data-slidestage-layer="previous"]')).toHaveCount(0);

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);

    // Reduced motion should force an instant swap with no outgoing layer.
    await expect(root.locator('[data-slidestage-layer="current"]')).toHaveCount(1);
    await expect(root.locator('[data-slidestage-layer="previous"]')).toHaveCount(0);
  });
});
