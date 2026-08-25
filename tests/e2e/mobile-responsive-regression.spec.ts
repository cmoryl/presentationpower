import { test, expect } from "@playwright/test";
import {
  MOBILE_BREAKPOINTS,
  PHONE_MAX_WIDTH,
  TAP_TARGET_MIN,
  assertNoHorizontalOverflow,
  measureTapTargets,
  settle,
} from "./helpers/responsive";
import { gotoAsAdmin, hasAdminSession } from "./helpers/admin-session";

/**
 * Mobile responsiveness regression suite.
 *
 * For every key route × phone/tablet breakpoint it asserts:
 *  - no page-level horizontal overflow (intentional overflow-x scrollers are
 *    allowed to scroll internally; the page itself must not),
 *  - every standalone interactive control meets the 44px tap-target floor on
 *    phone-class widths.
 *
 * Auth-gated routes run twice: unauthenticated (the /auth bounce must itself
 * be responsive) and, when session material is available, authenticated.
 */

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/faq",
  "/library",
  "/library/print",
  "/library/print/modules",
  "/auth",
] as const;

const GATED_ROUTES = ["/decks", "/brief/new", "/admin", "/admin/module-studio"] as const;

test.describe("Mobile responsiveness — public routes", () => {
  for (const bp of MOBILE_BREAKPOINTS) {
    for (const path of PUBLIC_ROUTES) {
      test(`${path} @ ${bp.name} (${bp.width}×${bp.height})`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await settle(page, path);

        await assertNoHorizontalOverflow(page, `${path} @ ${bp.name}`);

        if (bp.width <= PHONE_MAX_WIDTH) {
          const offenders = await measureTapTargets(page);
          expect(
            offenders,
            `${path} @ ${bp.name}: controls under ${TAP_TARGET_MIN}px — ${JSON.stringify(offenders)}`,
          ).toEqual([]);
        }
      });
    }
  }
});

test.describe("Mobile responsiveness — gated routes (unauthenticated bounce)", () => {
  const bp = MOBILE_BREAKPOINTS[1]!; // 390×844
  for (const path of GATED_ROUTES) {
    test(`${path} @ ${bp.name} unauthenticated`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await settle(page, path);
      await assertNoHorizontalOverflow(page, `${path} (unauth) @ ${bp.name}`);
    });
  }
});

test.describe("Mobile responsiveness — gated routes (authenticated)", () => {
  const bp = MOBILE_BREAKPOINTS[1]!;
  for (const path of GATED_ROUTES) {
    test(`${path} @ ${bp.name} authenticated`, async ({ page, context }) => {
      test.skip(!hasAdminSession(), "no session material available in this environment");
      await page.setViewportSize({ width: bp.width, height: bp.height });
      const ok = await gotoAsAdmin(page, context, path);
      test.skip(!ok, "session did not authenticate for gated route");
      await page.waitForTimeout(600);

      await assertNoHorizontalOverflow(page, `${path} (auth) @ ${bp.name}`);
      const offenders = await measureTapTargets(page);
      expect(
        offenders,
        `${path} (auth) @ ${bp.name}: controls under ${TAP_TARGET_MIN}px — ${JSON.stringify(offenders)}`,
      ).toEqual([]);
    });
  }
});

test.describe("Mobile navigation drawer", () => {
  test("hamburger opens a scrollable drawer with 44px targets @ 390×844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await settle(page, "/");

    const trigger = page.getByRole("button", { name: /menu|navigation|open menu/i }).first();
    if (!(await trigger.isVisible().catch(() => false))) {
      test.skip(true, "no mobile menu trigger on this build");
    }
    const box = await trigger.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(TAP_TARGET_MIN);
    expect(box!.width).toBeGreaterThanOrEqual(TAP_TARGET_MIN);

    await trigger.click();
    await page.waitForTimeout(400);

    await assertNoHorizontalOverflow(page, "/ with drawer open @ 390×844");
    const offenders = await measureTapTargets(page);
    expect(
      offenders,
      `drawer open: controls under ${TAP_TARGET_MIN}px — ${JSON.stringify(offenders)}`,
    ).toEqual([]);
  });
});
