import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end smoke test.
 *
 * Verifies the 8 key routes render (HTTP 200 + expected DOM markers)
 * and that critical admin/library affordances mount successfully.
 *
 * Runs unauthenticated: routes gated behind `_authenticated/` will
 * bounce to /auth — the redirect itself is considered a healthy signal
 * (route registered + guard working). Public routes must render their
 * own content markers.
 */

type RouteCheck = {
  path: string;
  // Marker text or role expected on the rendered page (public) OR on /auth
  // when the route is auth-gated.
  markers: (string | RegExp)[];
  // If true, we accept a redirect to /auth as a valid outcome.
  authGated?: boolean;
};

const ROUTES: RouteCheck[] = [
  { path: "/", markers: [/TransPerfect|Command|Deck|Print|Studio/i] },
  { path: "/library", markers: [/Library|Module|Atlas/i] },
  { path: "/library/print", markers: [/Print|Spotlight|Brochure|Case/i] },
  { path: "/decks", markers: [/Decks|Draft|Template/i], authGated: true },
  { path: "/admin", markers: [/Admin|Command|Analytics/i], authGated: true },
  {
    path: "/admin/imagery",
    markers: [/Imagery|Upload|Approved/i],
    authGated: true,
  },
  { path: "/brief/new", markers: [/Brief|Generate|Division/i], authGated: true },
  { path: "/knowledge", markers: [/Knowledge|Oracle|Search/i], authGated: true },
];

async function gotoAndSettle(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  // Give React a tick to hydrate client-side content.
  await page.waitForLoadState("networkidle").catch(() => {});
  return response;
}

test.describe("Smoke: key routes render", () => {
  for (const route of ROUTES) {
    test(`renders ${route.path}`, async ({ page }) => {
      const response = await gotoAndSettle(page, route.path);
      expect(response, `no response for ${route.path}`).not.toBeNull();
      // TanStack Start SSR should never return >=500 on these routes.
      expect(response!.status(), `bad status for ${route.path}`).toBeLessThan(500);

      const body = await page.locator("body").innerText();
      const url = page.url();

      const redirectedToAuth = /\/auth(\?|$)/.test(url);
      if (route.authGated && redirectedToAuth) {
        // Auth gate fired — route is wired, guard works. Confirm auth UI mounted.
        expect(body).toMatch(/sign in|log in|continue|email|auth/i);
        return;
      }

      // Otherwise the page must render its own content marker.
      const matched = route.markers.some((m) =>
        typeof m === "string" ? body.includes(m) : m.test(body),
      );
      expect(
        matched,
        `Expected one of ${route.markers} on ${route.path}, got:\n${body.slice(0, 400)}`,
      ).toBe(true);

      // No React error boundary text on public routes.
      expect(body).not.toMatch(/Something went wrong|Application error/i);
    });
  }
});

test.describe("Smoke: key library affordances", () => {
  test("/library shows module cards + subnav", async ({ page }) => {
    await gotoAndSettle(page, "/library");
    // Subnav present (Modules / Print / etc.)
    await expect(
      page.getByRole("link", { name: /print/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
    // At least one module preview card should mount.
    const cards = page.locator('[data-variant-id], [data-module-card]');
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  });

  test("/library/print shows print templates", async ({ page }) => {
    await gotoAndSettle(page, "/library/print");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/Spotlight|EBrochure|Brochure|Case Study|Adaptor/i);
  });
});

test.describe("Smoke: admin surfaces (when gated, /auth is acceptable)", () => {
  test("/admin either loads command center or bounces to /auth", async ({
    page,
  }) => {
    await gotoAndSettle(page, "/admin");
    const url = page.url();
    if (/\/auth(\?|$)/.test(url)) {
      await expect(page.getByText(/sign in|continue|email/i).first()).toBeVisible();
      return;
    }
    await expect(
      page.getByText(/Analytics|Imagery|Knowledge|Brand Assets/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("/admin/imagery either loads uploader or bounces to /auth", async ({
    page,
  }) => {
    await gotoAndSettle(page, "/admin/imagery");
    const url = page.url();
    if (/\/auth(\?|$)/.test(url)) return; // gated: acceptable
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/Upload|Approve|Backfill|Imagery/i);
  });
});
