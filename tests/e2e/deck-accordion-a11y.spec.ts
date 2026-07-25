import { test, expect } from "@playwright/test";

async function createDeckViaSkipAI(page: any) {
  await page.goto("/brief/new", { waitUntil: "domcontentloaded" });
  const skip = page.getByRole("button", { name: /skip AI/i }).first();
  await skip.waitFor({ state: "visible", timeout: 15000 });
  await skip.click();
  await page.waitForURL(/\/decks\/[A-Za-z0-9_-]+/, { timeout: 15000 });
  await page.waitForTimeout(1500);
  return page.url();
}

async function firstAvailableTrigger(page: any) {
  const labels = ["History", "Slide", "Distribute", "Appearance", "Motion"];
  for (const label of labels) {
    const btn = page.getByRole("button", { name: new RegExp(`^${label}`, "i") }).first();
    if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
      return { btn, label };
    }
  }
  throw new Error("No accordion trigger found");
}

test.describe.configure({ mode: "serial" });

test.describe("Deck toolbar accordion popover a11y", () => {
  test("trigger exposes aria-expanded and controls a labeled panel", async ({ page }) => {
    await createDeckViaSkipAI(page);

    const { btn, label } = await firstAvailableTrigger(page);
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    await expect(btn).toHaveAttribute("aria-haspopup", "true");

    await btn.click();
    await expect(btn).toHaveAttribute("aria-expanded", "true");

    const controlsId = await btn.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    const panel = page.locator(`#${controlsId}`);
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("role", "group");
    await expect(panel).toHaveAttribute("aria-label", new RegExp(label, "i"));
  });

  test("Escape closes the popover and returns focus to the trigger", async ({ page }) => {
    await createDeckViaSkipAI(page);
    const { btn } = await firstAvailableTrigger(page);

    await btn.click();
    await expect(btn).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await expect(btn).toHaveAttribute("aria-expanded", "false");

    const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-controls"));
    const controls = await btn.getAttribute("aria-controls");
    expect(focused).toBe(controls);
  });

  test("clicking outside closes the popover", async ({ page }) => {
    await createDeckViaSkipAI(page);
    const { btn } = await firstAvailableTrigger(page);

    await btn.click();
    await expect(btn).toHaveAttribute("aria-expanded", "true");

    // Click a neutral spot far from the popover.
    await page.mouse.click(5, 5);
    await expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  test("Tab traps focus within the open popover", async ({ page }) => {
    await createDeckViaSkipAI(page);
    const { btn } = await firstAvailableTrigger(page);

    await btn.click();
    const controlsId = await btn.getAttribute("aria-controls");
    const panel = page.locator(`#${controlsId}`);
    await expect(panel).toBeVisible();

    // Wait for the focus-on-open effect to run.
    await page.waitForTimeout(50);
    await expect
      .poll(async () =>
        page.evaluate((id: string) => {
          const p = document.getElementById(id);
          return !!p && p.contains(document.activeElement);
        }, controlsId!),
      )
      .toBe(true);

    // Tab several times — focus must stay within the panel.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      const stillInside = await page.evaluate((id) => {
        const p = document.getElementById(id!);
        return !!p && p.contains(document.activeElement);
      }, controlsId);
      expect(stillInside).toBe(true);
    }

    // Shift+Tab also stays inside.
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Shift+Tab");
      const stillInside = await page.evaluate((id) => {
        const p = document.getElementById(id!);
        return !!p && p.contains(document.activeElement);
      }, controlsId);
      expect(stillInside).toBe(true);
    }
  });
});
