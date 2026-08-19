/**
 * Shared e2e helper: originate a deck from /brief/new without calling the model.
 *
 * The brief console is a five-step wizard; "or skip AI" lives on step 5 and
 * lands on the brief output hub (/brief/:id), from where "Edit the deck" opens
 * the deck editor at /decks/:id.
 */
import type { Page } from "@playwright/test";

export async function createDeckViaSkipAI(page: Page) {
  await page.goto("/brief/new", { waitUntil: "domcontentloaded" });

  const NEXT_LABELS = [
    /Next: Brand mode/i,
    /Next: Prospect/i,
    /Next: Assets/i,
    /Next: Generate/i,
  ];

  // Step 1 is server-rendered; clicks fired before React attaches handlers
  // silently no-op, so wait for hydration and retry until the step advances.
  await page.getByRole("button", { name: NEXT_LABELS[0] }).first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(2000);

  for (let i = 0; i < NEXT_LABELS.length; i++) {
    // Each step renders its Next button inline and again in a sticky footer bar
    // that overlays the inline one at 720px-tall viewports — click the last
    // (topmost) match so the sticky bar never swallows the click.
    const next = page.getByRole("button", { name: NEXT_LABELS[i]! }).last();
    await next.waitFor({ state: "visible", timeout: 30000 });
    const advanced = NEXT_LABELS[i + 1];
    for (let attempt = 0; attempt < 10; attempt++) {
      // The sticky command dock overlays the inline Next button at short
      // viewports, so a real mouse click lands on the dock — dispatch the
      // click on the element itself instead.
      await next.evaluate((el: HTMLElement) => el.click());
      await page.waitForTimeout(500);
      const reached = advanced
        ? await page.getByRole("button", { name: advanced }).last().isVisible().catch(() => false)
        : (await page.getByRole("button", { name: /skip AI/i }).count()) > 0;
      if (reached) break;
    }
  }



  const skip = page.getByRole("button", { name: /skip AI/i }).first();
  await skip.waitFor({ state: "visible", timeout: 30000 });
  await skip.evaluate((el: HTMLElement) => el.click());

  // Deck origination is deterministic but still asynchronous — it redirects to
  // the brief output hub once the artifacts exist.
  await page.waitForFunction(
    () => /\/brief\/[A-Za-z0-9_-]+/.test(location.pathname) && !/\/brief\/new/.test(location.pathname),
    null,
    { timeout: 60000 },
  );

  const editBtn = page.locator('a,button').filter({ hasText: /Edit the deck/i }).first();
  await editBtn.waitFor({ state: "visible", timeout: 30000 });
  await editBtn.click();

  await page.waitForFunction(() => /\/decks\/[A-Za-z0-9_-]+/.test(location.pathname), null, {
    timeout: 60000,
  });

  // The toolbar renders only after the deck store hydrates — wait on a real
  // trigger instead of a fixed sleep, which flakes under parallel workers.
  await page
    .getByRole("button", { name: /^Motion/i })
    .first()
    .waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(500);
  return page.url();
}
