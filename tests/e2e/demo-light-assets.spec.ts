// Renders every social and events demo playbook in a real browser and validates
// the LIGHT-MODE assets in the "Live preview" gallery:
//
//   1. at least one light asset renders per playbook
//   2. every light asset paints a non-zero frame with the declared aspect ratio
//   3. every light asset carries visible copy (no blank/empty artwork)
//   4. light artwork stays inside the card (no clipped overflow) and the page
//      itself has no horizontal overflow
//   5. no uncaught page errors while rendering the gallery
//
// One test per playbook keeps failures attributable to a single demo.

import { test, expect, type Page } from "@playwright/test";
import { SOCIAL_PLAYBOOKS } from "../../src/lib/social-playbooks";
import { EVENT_PLAYBOOKS } from "../../src/lib/event-playbooks";

type LightAsset = {
  format: string;
  w: number;
  h: number;
  frameW: number;
  frameH: number;
  text: string;
  overflowX: number;
};

/** Reads every light-mode card in the live gallery straight out of the DOM. */
async function readLightAssets(page: Page): Promise<LightAsset[]> {
  return page.$$eval('[data-testid="asset-preview-card"][data-asset-mode="light"]', (cards) =>
    cards.map((card) => {
      const frame = card.querySelector<HTMLElement>("[data-kit-asset-frame]");
      const fr = frame?.getBoundingClientRect();
      const cr = card.getBoundingClientRect();
      return {
        format: card.getAttribute("data-asset-format") ?? "",
        w: Number(card.getAttribute("data-asset-w") ?? 0),
        h: Number(card.getAttribute("data-asset-h") ?? 0),
        frameW: fr ? Math.round(fr.width) : 0,
        frameH: fr ? Math.round(fr.height) : 0,
        text: (frame?.innerText ?? "").replace(/\s+/g, " ").trim(),
        overflowX: fr ? Math.max(0, Math.round(fr.right - cr.right), Math.round(cr.left - fr.left)) : 0,
      };
    }),
  );
}

async function validateDemo(page: Page, url: string) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // The gallery is client-rendered; wait for the first card to paint.
  const cards = page.locator('[data-testid="asset-preview-card"]');
  await expect(cards.first()).toBeVisible();
  await page.locator('[data-kit-asset-frame]').first().waitFor();
  // Let the aspect-fit pass settle before measuring geometry.
  await page.waitForTimeout(400);

  const assets = await readLightAssets(page);
  expect(assets.length, `${url}: expected at least one light-mode asset`).toBeGreaterThan(0);

  for (const a of assets) {
    const where = `${url} · ${a.format} (light)`;

    // Painted, non-collapsed frame.
    expect(a.frameW, `${where}: frame width collapsed`).toBeGreaterThan(40);
    expect(a.frameH, `${where}: frame height collapsed`).toBeGreaterThan(40);

    // Aspect ratio matches the declared format (allow 3% scaling slack).
    const declared = a.w / a.h;
    const painted = a.frameW / a.frameH;
    expect(
      Math.abs(painted - declared) / declared,
      `${where}: aspect ${painted.toFixed(3)} != declared ${declared.toFixed(3)}`,
    ).toBeLessThan(0.03);

    // Real copy — light assets must never render blank.
    expect(a.text.length, `${where}: artwork rendered without visible copy`).toBeGreaterThan(8);

    // Artwork stays inside its card.
    expect(a.overflowX, `${where}: artwork overflows the card by ${a.overflowX}px`).toBeLessThanOrEqual(2);
  }

  // Page-level horizontal overflow.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${url}: horizontal page overflow of ${overflow}px`).toBeLessThanOrEqual(2);

  expect(errors, `${url}: uncaught page errors`).toEqual([]);
}

test.describe("light-mode social demo assets", () => {
  for (const pb of SOCIAL_PLAYBOOKS) {
    test(`social/${pb.id} renders valid light assets`, async ({ page }) => {
      await validateDemo(page, `/social/demo/${pb.id}`);
    });
  }
});

test.describe("light-mode events demo assets", () => {
  for (const pb of EVENT_PLAYBOOKS) {
    test(`events/${pb.id} renders valid light assets`, async ({ page }) => {
      await validateDemo(page, `/events/demo/${pb.id}`);
    });
  }
});
