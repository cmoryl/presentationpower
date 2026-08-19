import { test, expect } from "@playwright/test";
import { createDeckViaSkipAI } from "./helpers/create-deck";
import type { Page, Locator } from "@playwright/test";

/**
 * Accordion popovers are mutually exclusive: opening one must close any
 * previously open popover, and focus must move into the newly opened panel
 * (never linger inside the panel that just closed).
 */

const TRIGGER_LABELS = ["Distribute", "Slide", "Appearance", "Motion", "History"];


async function visibleTriggers(page: Page) {
  const found: { label: string; btn: Locator }[] = [];
  for (const label of TRIGGER_LABELS) {
    const btn = page.getByRole("button", { name: new RegExp(`^${label}`, "i") }).first();
    if ((await btn.count()) === 0) continue;
    if (!(await btn.isVisible().catch(() => false))) continue;
    found.push({ label, btn });
  }
  return found;
}

/** True when document.activeElement is inside (or is) the element with `id`. */
function focusInside(page: Page, id: string) {
  return page.evaluate((panelId: string) => {
    const p = document.getElementById(panelId);
    return !!p && (p === document.activeElement || p.contains(document.activeElement));
  }, id);
}

test.describe.configure({ mode: "serial" });

test.describe("Deck accordion popovers — exclusivity", () => {
  test("opening a second popover closes the first and moves focus into the new panel", async ({
    page,
  }) => {
    await createDeckViaSkipAI(page);

    const triggers = await visibleTriggers(page);
    expect(triggers.length, "need at least two accordion triggers").toBeGreaterThan(1);

    const [first, second] = triggers;

    await first.btn.click();
    await expect(first.btn).toHaveAttribute("aria-expanded", "true");
    const firstPanelId = await first.btn.getAttribute("aria-controls");
    expect(firstPanelId).toBeTruthy();
    await expect(page.locator(`#${firstPanelId}`)).toBeVisible();
    await expect.poll(() => focusInside(page, firstPanelId!)).toBe(true);

    // Open the second trigger while the first is still open.
    await second.btn.click();

    // First closes (state + DOM), second opens.
    await expect(first.btn).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(`#${firstPanelId}`)).toHaveCount(0);
    await expect(second.btn).toHaveAttribute("aria-expanded", "true");

    const secondPanelId = await second.btn.getAttribute("aria-controls");
    expect(secondPanelId).toBeTruthy();
    expect(secondPanelId).not.toBe(firstPanelId);
    const secondPanel = page.locator(`#${secondPanelId}`);
    await expect(secondPanel).toBeVisible();

    // Focus must land inside the newly opened panel, not the closed one.
    await expect.poll(() => focusInside(page, secondPanelId!)).toBe(true);
    expect(await focusInside(page, firstPanelId!)).toBe(false);
  });

  test("only one popover is ever open when cycling through every trigger", async ({ page }) => {
    await createDeckViaSkipAI(page);

    const triggers = await visibleTriggers(page);
    expect(triggers.length).toBeGreaterThan(1);

    for (const { label, btn } of triggers) {
      await btn.click();
      await expect(btn).toHaveAttribute("aria-expanded", "true");

      const expandedCount = await page
        .locator('[aria-haspopup="true"][aria-expanded="true"]')
        .count();
      expect(expandedCount, `exactly one popover open after clicking "${label}"`).toBe(1);

      const panelId = await btn.getAttribute("aria-controls");
      await expect.poll(() => focusInside(page, panelId!)).toBe(true);
    }

    // Escape closes the last one, leaving nothing expanded.
    await page.keyboard.press("Escape");
    await expect(page.locator('[aria-haspopup="true"][aria-expanded="true"]')).toHaveCount(0);
  });
});
