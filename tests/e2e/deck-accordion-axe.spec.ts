import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated axe-core scan of the deck toolbar accordion popovers.
 * Each popover is opened in turn and scanned for ARIA / focus-order
 * violations, scoped to the toolbar + the open panel so unrelated
 * pre-existing page issues don't mask regressions here.
 */

const TRIGGER_LABELS = ["Distribute", "Slide", "Appearance", "Motion", "History"];

// Rule set relevant to popover ARIA + focus semantics.
const RULES = [
  "aria-allowed-attr",
  "aria-required-attr",
  "aria-required-children",
  "aria-required-parent",
  "aria-valid-attr",
  "aria-valid-attr-value",
  "aria-hidden-focus",
  "aria-command-name",
  "aria-toggle-field-name",
  "button-name",
  "duplicate-id-aria",
  "label",
  "nested-interactive",
  "tabindex",
];

async function createDeckViaSkipAI(page: any) {
  await page.goto("/brief/new", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const skip = page.getByRole("button", { name: /or skip AI/i });
  await skip.waitFor({ state: "visible", timeout: 20000 });
  await skip.click();
  await page.waitForFunction(() => /\/decks\/[A-Za-z0-9_-]+/.test(location.pathname), null, {
    timeout: 30000,
  });
  await page.waitForTimeout(1500);
}

test.describe.configure({ mode: "serial" });

test.describe("Deck accordion popovers — axe-core", () => {
  test("every open popover passes ARIA/focus rules", async ({ page }) => {
    await createDeckViaSkipAI(page);

    let scanned = 0;

    for (const label of TRIGGER_LABELS) {
      const btn = page.getByRole("button", { name: new RegExp(`^${label}`, "i") }).first();
      if ((await btn.count()) === 0) continue;
      if (!(await btn.isVisible().catch(() => false))) continue;

      await btn.click();
      await expect(btn).toHaveAttribute("aria-expanded", "true");

      const controlsId = await btn.getAttribute("aria-controls");
      expect(controlsId, `${label} trigger must have aria-controls`).toBeTruthy();
      const panel = page.locator(`#${controlsId}`);
      await expect(panel).toBeVisible();

      const results = await new AxeBuilder({ page })
        .include(`#${controlsId}`)
        .withRules(RULES)
        .analyze();

      const summary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.html.slice(0, 160)),
      }));
      expect(
        summary,
        `axe violations in "${label}" popover:\n${JSON.stringify(summary, null, 2)}`,
      ).toEqual([]);

      scanned++;
      await page.keyboard.press("Escape");
      await expect(btn).toHaveAttribute("aria-expanded", "false");
    }

    expect(scanned, "at least one accordion popover should have been scanned").toBeGreaterThan(0);
  });

  test("toolbar itself is free of ARIA violations with all popovers closed", async ({ page }) => {
    await createDeckViaSkipAI(page);

    const results = await new AxeBuilder({ page }).withRules(RULES).analyze();
    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.html.slice(0, 160)),
    }));
    expect(summary, `axe violations on deck editor:\n${JSON.stringify(summary, null, 2)}`).toEqual(
      [],
    );
  });
});
