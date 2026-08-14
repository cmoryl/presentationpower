/**
 * Shared e2e helper: originate a deck from /brief/new without calling the model.
 *
 * The brief console is a five-step wizard; the "or skip AI" action only exists
 * on step 5 (Generate), so the helper has to walk the wizard forward via the
 * step's own Next button before the skip action is reachable.
 */
export async function createDeckViaSkipAI(page: any) {
  await page.goto("/brief/new", { waitUntil: "domcontentloaded" });

  // Step 1 renders server-side; wait for hydration before clicking anything.
  await page
    .getByRole("button", { name: /Next: Brand mode/i })
    .waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(1500);

  const NEXT_LABELS = [
    /Next: Brand mode/i,
    /Next: Prospect/i,
    /Next: Assets/i,
    /Next: Generate/i,
  ];
  for (const label of NEXT_LABELS) {
    const next = page.getByRole("button", { name: label }).first();
    await next.waitFor({ state: "visible", timeout: 30000 });
    await next.click();
    await page.waitForTimeout(400);
  }

  const skip = page.getByRole("button", { name: /skip AI/i }).first();
  await skip.waitFor({ state: "visible", timeout: 30000 });
  await skip.click();

  if (!/\/decks\//.test(page.url())) {
    await page.waitForTimeout(1500);
    if (!/\/decks\//.test(page.url())) await skip.click({ force: true });
  }

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
