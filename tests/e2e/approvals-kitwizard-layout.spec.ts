import { test, expect } from "@playwright/test";
import { assertNoHorizontalOverflow, settle } from "./helpers/responsive";
import {
  LAYOUT_BREAKPOINTS,
  assertNoSpillOrCollision,
  injectLongContent,
  measureCollisions,
  measureTextSpill,
} from "./helpers/layout-collisions";
import { gotoAsAdmin, hasAdminSession } from "./helpers/admin-session";

/**
 * Visual + overflow regression suite for the approvals queue and the KitWizard.
 *
 * Both surfaces regressed historically by way of long asset titles and long
 * reviewer notes: the text spilled its card or collided with adjacent status
 * pills / step controls at tablet width. Each route is checked at four
 * breakpoints, twice:
 *   1. as rendered (real content),
 *   2. after injecting pathological long titles / notes.
 *
 * Assertions: no page-level horizontal overflow, no text spilling an unclamped
 * container, no overlapping text blocks.
 */

const APPROVAL_ROUTES = ["/approvals", "/admin/approvals"] as const;
const KIT_WIZARD_ROUTES = ["/social/new", "/events/new"] as const;

async function resolveRoot(page: import("@playwright/test").Page) {
  const hasMain = await page.locator("main").first().count();
  return hasMain ? "main" : "body";
}

async function open(
  page: import("@playwright/test").Page,
  context: import("@playwright/test").BrowserContext,
  path: string,
) {
  if (hasAdminSession()) {
    const ok = await gotoAsAdmin(page, context, path);
    if (ok) {
      await page.waitForTimeout(700);
      return true;
    }
  }
  await settle(page, path);
  // Unauthenticated bounce still has to be layout-clean, so keep going.
  return true;
}

test.describe("Approvals queue — layout regression", () => {
  for (const bp of LAYOUT_BREAKPOINTS) {
    for (const path of APPROVAL_ROUTES) {
      test(`${path} @ ${bp.name} (${bp.width}px)`, async ({ page, context }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await open(page, context, path);
        const root = await resolveRoot(page);
        const label = `${path} @ ${bp.name}`;

        await assertNoHorizontalOverflow(page, label);
        await assertNoSpillOrCollision(page, root, label);

        // Pathological content pass: long titles + long reviewer notes.
        await injectLongContent(page, root);
        await assertNoHorizontalOverflow(page, `${label} (long content)`);
        await assertNoSpillOrCollision(page, root, `${label} (long content)`);
      });
    }
  }
});

test.describe("KitWizard — layout regression", () => {
  for (const bp of LAYOUT_BREAKPOINTS) {
    for (const path of KIT_WIZARD_ROUTES) {
      test(`${path} @ ${bp.name} (${bp.width}px)`, async ({ page, context }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await open(page, context, path);
        const root = await resolveRoot(page);
        const label = `${path} @ ${bp.name}`;

        await assertNoHorizontalOverflow(page, label);
        await assertNoSpillOrCollision(page, root, label);

        // Typing a long campaign name must not push the header out of the card.
        const nameField = page
          .locator('input[type="text"], input:not([type])')
          .filter({ hasNot: page.locator("[hidden]") })
          .first();
        if (await nameField.count()) {
          await nameField
            .fill(
              "Global Enterprise Localization Program Kickoff — EMEA/APAC Consolidated Rollout Wave 3",
            )
            .catch(() => {});
          await page.waitForTimeout(250);
        }
        await injectLongContent(page, root);

        await assertNoHorizontalOverflow(page, `${label} (long content)`);
        const spills = await measureTextSpill(page, root);
        expect(spills, `${label} (long content): spills — ${JSON.stringify(spills)}`).toEqual([]);
        const collisions = await measureCollisions(page, root);
        expect(
          collisions,
          `${label} (long content): collisions — ${JSON.stringify(collisions)}`,
        ).toEqual([]);
      });
    }
  }
});
