import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { gotoAsAdmin, hasAdminSession } from "./helpers/admin-session";
import { PRINT_SECTION_MODULES } from "../../src/lib/print-library/section-modules";

/**
 * Studios + editors smoke coverage.
 *
 * One spec that walks the shared editing contract every studio now implements:
 *   1. Open Canvas Studio  — palette add → undo → redo drives the layer count.
 *   2. Module Studio       — same history pair, plus the Save-draft gate.
 *   3. Print module master — dirty → Save enabled, Discard restores, ⌘S saves.
 *   4. Print item master   — dirty → Save enabled, beforeunload guard armed.
 *
 * The dirty-exit guard is asserted structurally: `useDirtyExitGuard` registers a
 * `beforeunload` listener only while the draft is dirty, so an init script that
 * counts those registrations proves the guard arms and disarms without needing
 * to trigger a browser-native unload prompt (which Playwright cannot inspect).
 *
 * Requires authenticated session material; skips loudly when absent.
 */

const LAYER_COUNT = /(\d+)\s+layers?/;

/** Instrument beforeunload registrations before any app code runs. */
async function armUnloadProbe(context: BrowserContext) {
  await context.addInitScript(() => {
    const w = window as unknown as { __beforeUnloadCount?: number };
    w.__beforeUnloadCount = 0;
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.addEventListener = ((type: string, ...rest: unknown[]) => {
      if (type === "beforeunload") w.__beforeUnloadCount = (w.__beforeUnloadCount ?? 0) + 1;
      return (add as (...a: unknown[]) => void)(type, ...rest);
    }) as typeof window.addEventListener;
    window.removeEventListener = ((type: string, ...rest: unknown[]) => {
      if (type === "beforeunload")
        w.__beforeUnloadCount = Math.max(0, (w.__beforeUnloadCount ?? 0) - 1);
      return (remove as (...a: unknown[]) => void)(type, ...rest);
    }) as typeof window.removeEventListener;
  });
}

function unloadGuards(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __beforeUnloadCount?: number }).__beforeUnloadCount ?? 0,
  );
}

async function layers(page: Page) {
  const text = await page.locator("body").innerText();
  const m = LAYER_COUNT.exec(text);
  expect(m, `no "N layers" readout on ${page.url()}`).not.toBeNull();
  return Number(m![1]);
}

/** Add the first palette block and return the resulting layer count. */
async function addFirstBlock(page: Page) {
  const before = await layers(page);
  await page
    .getByRole("button", { name: /Text field/i })
    .first()
    .click();
  await expect.poll(() => layers(page), { timeout: 10_000 }).toBeGreaterThan(before);
  return before;
}

async function historyRoundTrip(page: Page) {
  const before = await addFirstBlock(page);
  const undo = page.getByRole("group", { name: "History" }).getByRole("button", {
    name: /^Undo/i,
  });
  const redo = page.getByRole("group", { name: "History" }).getByRole("button", {
    name: /^Redo/i,
  });

  await expect(undo).toBeEnabled();
  await undo.click();
  await expect.poll(() => layers(page), { timeout: 10_000 }).toBe(before);

  await expect(redo).toBeEnabled();
  await redo.click();
  await expect.poll(() => layers(page), { timeout: 10_000 }).toBeGreaterThan(before);

  // Keyboard parity: Ctrl/Cmd+Z must drive the same stack as the buttons.
  await page.keyboard.press("Control+z");
  await expect.poll(() => layers(page), { timeout: 10_000 }).toBe(before);
}

test.describe("Studios & editors smoke", () => {
  test.skip(!hasAdminSession(), "No authenticated session available in this environment");

  test("Open Canvas Studio: palette add, undo, redo, save control", async ({ page, context }) => {
    const ok = await gotoAsAdmin(page, context, "/admin/canvas");
    expect(ok, "expected an authenticated admin session, got /auth").toBe(true);

    await expect(page.getByLabel("Composition name")).toBeVisible({ timeout: 30_000 });
    await historyRoundTrip(page);

    // Shared save control is present and actionable (never hidden in a menu).
    await expect(
      page.getByRole("button", { name: /Save to My Files|Saved to My Files/i }).first(),
    ).toBeEnabled();
  });

  test("Module Studio: history pair plus the Save-draft name gate", async ({ page, context }) => {
    const ok = await gotoAsAdmin(page, context, "/admin/module-studio");
    expect(ok, "expected an authenticated admin session, got /auth").toBe(true);

    await expect(page.getByText(/Module Studio/i).first()).toBeVisible({ timeout: 30_000 });
    await historyRoundTrip(page);

    const save = page.getByRole("button", { name: /Save draft/i }).first();
    await expect(save).toBeVisible();
    const name = page.getByLabel(/Module name|Composition name/i).first();
    if (await name.count()) {
      await name.fill("ab");
      await expect(save).toBeDisabled();
      await name.fill("E2E smoke module");
      await expect(save).toBeEnabled();
    }
  });

  test("Print module master editor: dirty guard, discard, and save path", async ({
    page,
    context,
  }) => {
    await armUnloadProbe(context);
    const moduleId = PRINT_SECTION_MODULES[0]!.id;
    const ok = await gotoAsAdmin(page, context, `/admin/modules/print/${moduleId}`);
    expect(ok, "expected an authenticated admin session, got /auth").toBe(true);

    const save = page
      .getByRole("button", { name: /Update master module|Master saved|Saving/i })
      .first();
    const discard = page.getByRole("button", { name: /Discard changes/i }).first();
    await expect(save).toBeVisible({ timeout: 30_000 });

    // Clean draft: nothing to save, nothing to discard, no extra unload guard.
    // Other always-on listeners exist (HMR, session keepalive), so the guard is
    // measured as a delta from the clean-state baseline.
    await expect(save).toBeDisabled();
    await expect(discard).toBeDisabled();
    const baseline = await unloadGuards(page);

    // Editing any copy field must flip the whole dirty contract at once.
    const copy = page.locator("aside input, aside textarea").first();
    await copy.waitFor({ state: "visible", timeout: 30_000 });
    await copy.fill("E2E smoke copy");
    await expect(save).toBeEnabled();
    await expect(discard).toBeEnabled();
    await expect.poll(() => unloadGuards(page), { timeout: 10_000 }).toBeGreaterThan(baseline);

    // Discard returns to the saved master and disarms the guard.
    await discard.click();
    await expect(save).toBeDisabled();
    await expect.poll(() => unloadGuards(page), { timeout: 10_000 }).toBe(baseline);

    // Save path: ⌘S / Ctrl+S persists without hunting for the button.
    await copy.fill("E2E smoke copy 2");
    await expect(save).toBeEnabled();
    await page.keyboard.press("Control+s");
    await expect(page.getByRole("button", { name: /Master saved/i }).first()).toBeVisible({
      timeout: 30_000,
    });
    expect(await unloadGuards(page)).toBe(baseline);

    // Leave the master exactly as we found it.
    await page
      .getByRole("button", { name: /Reset to shipped/i })
      .first()
      .click();
    await page.waitForTimeout(1500);
  });

  test("Print library master item editor: dirty guard and save path", async ({ page, context }) => {
    await armUnloadProbe(context);
    const listed = await gotoAsAdmin(page, context, "/library/print");
    expect(listed).toBe(true);

    const href = await page
      .locator('a[href*="/admin/print-library/"]')
      .first()
      .getAttribute("href")
      .catch(() => null);
    test.skip(!href, "No editable library master item published in this environment");

    await page.goto(href!, { waitUntil: "domcontentloaded" });
    const save = page
      .getByRole("button", { name: /Update master item|Master saved|Saving/i })
      .first();
    await expect(save).toBeVisible({ timeout: 30_000 });
    await expect(save).toBeDisabled();
    const baseline = await unloadGuards(page);

    const title = page.locator("aside input").first();
    const original = await title.inputValue();
    await title.fill(`${original} `.trimEnd() + " E2E");
    await expect(save).toBeEnabled();
    await expect.poll(() => unloadGuards(page), { timeout: 10_000 }).toBeGreaterThan(baseline);

    // Restore the original value: dirty state must clear back to saved.
    await title.fill(original);
    await expect(save).toBeDisabled();
    await expect.poll(() => unloadGuards(page), { timeout: 10_000 }).toBe(baseline);
  });
});
