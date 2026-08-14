import { test, expect } from "@playwright/test";
import { createDeckViaSkipAI } from "./helpers/create-deck";


test.describe("Deck editor gallery drag reordering", () => {
  test("dragging a thumbnail onto another slot swaps their order", async ({ page }) => {
    await createDeckViaSkipAI(page);

    const thumbs = page.locator("[data-slide-thumb]");
    await expect(thumbs.first()).toBeVisible({ timeout: 30000 });
    const count = await thumbs.count();
    test.skip(count < 2, "Deck needs at least two slides to reorder");

    const labelOf = async (i: number) =>
      (await thumbs.nth(i).innerText()).replace(/^\d+\s*/, "").trim();

    const firstLabel = await labelOf(0);
    const secondLabel = await labelOf(1);

    // HTML5 drag events are simulated so the reorder is deterministic across
    // browsers — mouse-based dragging is flaky for native DnD in Chromium.
    await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>("[data-slide-thumb]"),
      );
      const dt = new DataTransfer();
      const fire = (el: HTMLElement, type: string) =>
        el.dispatchEvent(
          new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }),
        );
      fire(nodes[0], "dragstart");
      fire(nodes[1], "dragover");
      fire(nodes[1], "drop");
      fire(nodes[0], "dragend");
    });

    await page.waitForTimeout(500);

    const newFirst = await labelOf(0);
    const newSecond = await labelOf(1);
    expect(newFirst).not.toBe(firstLabel);
    expect(newFirst.includes(secondLabel.split("·").pop()?.trim() ?? "")).toBeTruthy();
    expect(newSecond).not.toBe(secondLabel);
  });
});
