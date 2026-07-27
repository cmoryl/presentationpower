import { test, expect, type Page } from "@playwright/test";

/**
 * Regression: client-logo loading on print / document routes.
 *
 * Signed out, `listClientLogos` (a `requireSupabaseAuth` server fn) 401s.
 * Every surface that renders client logos must degrade to an empty list
 * instead of throwing — no blank screen, no unhandled "Unauthorized".
 * LogoHub additionally shows an explicit sign-in prompt.
 */

const PRINT_ROUTES = ["/library/print", "/logohub"];

async function settle(page: Page, path: string) {
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
  return res;
}

test.describe("Client logos on print/document routes", () => {
  for (const path of PRINT_ROUTES) {
    test(`${path} renders without an auth crash`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));

      const res = await settle(page, path);
      expect(res, `no response for ${path}`).not.toBeNull();
      expect(res!.status(), `bad status for ${path}`).toBeLessThan(500);

      const body = await page.locator("body").innerText();
      // Never a blank screen and never a raw auth error surfaced to the user.
      expect(body.trim().length, `blank screen at ${path}`).toBeGreaterThan(20);
      expect(body).not.toMatch(/Unauthorized: No authorization header/i);

      const fatal = errors.filter((e) => /Unauthorized/i.test(e));
      expect(fatal, `unhandled auth error on ${path}`).toEqual([]);
    });
  }

  test("/logohub shows the sign-in prompt when unauthenticated and empty", async ({ page }) => {
    await settle(page, "/logohub");

    const url = page.url();
    if (/\/auth(\?|$|\/)/.test(url)) {
      // Route bounced to the auth page — the gate itself is the prompt.
      await expect(page.locator("body")).toContainText(/sign in|log in|auth/i);
      return;
    }

    const body = await page.locator("body").innerText();
    // Either the prompt (no logos readable signed out) or a populated list —
    // both are healthy; a silent empty state is not.
    const hasPrompt = /Sign in to browse LogoHub/i.test(body);
    const hasClients = /\d+ of \d+ clients/.test(body);
    expect(hasPrompt || hasClients, "logohub showed neither prompt nor logo count").toBe(true);

    if (hasPrompt) {
      await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();
    }
  });
});
