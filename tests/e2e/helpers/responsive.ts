/**
 * Shared responsive-regression helpers.
 *
 * Two invariants are checked by the mobile regression suite:
 *  1. No page-level horizontal overflow at any breakpoint.
 *  2. Interactive controls meet the WCAG 2.5.8 / Apple HIG tap-target floor
 *     on phone-class viewports.
 *
 * Both helpers return structured data so specs can produce readable
 * failure messages naming the offending element.
 */
import { expect, type Page } from "@playwright/test";

export const MOBILE_BREAKPOINTS = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "pixel-7", width: 412, height: 915 },
  { name: "tablet-portrait", width: 768, height: 1024 },
] as const;

/** Widths at or below this are treated as phone-class for tap-target rules. */
export const PHONE_MAX_WIDTH = 480;

/** Minimum tap-target edge in CSS px (44 nominal, 2px rounding slack). */
export const TAP_TARGET_MIN = 42;

export type OverflowReport = {
  scrollWidth: number;
  clientWidth: number;
  offenders: Array<{ selector: string; right: number; width: number }>;
};

export async function measureHorizontalOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const limit = doc.clientWidth;
    const describe = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      const cls = (el.getAttribute("class") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .join(".");
      return `${tag}${id}${cls ? `.${cls}` : ""}`;
    };
    const offenders: Array<{ selector: string; right: number; width: number }> = [];
    if (doc.scrollWidth > limit + 2) {
      for (const el of Array.from(document.body.querySelectorAll("*"))) {
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") continue;
        // Elements inside an intentional horizontal scroller are allowed to be
        // wider than the viewport — the scroller itself is what must fit.
        let scrolled = false;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ps = getComputedStyle(p);
          if (ps.overflowX === "auto" || ps.overflowX === "scroll") {
            scrolled = true;
            break;
          }
        }
        if (scrolled) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > limit + 2) {
          offenders.push({
            selector: describe(el),
            right: Math.round(r.right),
            width: Math.round(r.width),
          });
        }
        if (offenders.length >= 8) break;
      }
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: limit, offenders };
  });
}

export async function assertNoHorizontalOverflow(page: Page, label: string) {
  const report = await measureHorizontalOverflow(page);
  expect(
    report.scrollWidth,
    `${label}: page scrolls horizontally (${report.scrollWidth}px > ${report.clientWidth}px). ` +
      `Widest offenders: ${JSON.stringify(report.offenders)}`,
  ).toBeLessThanOrEqual(report.clientWidth + 2);
}

export type TapTargetOffender = {
  selector: string;
  label: string;
  width: number;
  height: number;
};

/**
 * Audits visible, primary interactive controls. Deliberately scoped to
 * standalone controls (buttons, icon links, tabs, switches, form fields):
 * links flowing inside prose are excluded because WCAG exempts inline text.
 */
export async function measureTapTargets(
  page: Page,
  min = TAP_TARGET_MIN,
): Promise<TapTargetOffender[]> {
  return page.evaluate((minEdge) => {
    const SELECTOR = [
      "button",
      '[role="button"]',
      '[role="tab"]',
      '[role="switch"]',
      '[role="menuitem"]',
      "a[aria-label]",
      "summary",
      "select",
      'input[type="checkbox"]',
      'input[type="radio"]',
    ].join(",");
    const INLINE_PARENTS = new Set(["P", "LI", "SPAN", "LABEL", "TD", "SMALL", "STRONG"]);
    const out: Array<{ selector: string; label: string; width: number; height: number }> = [];
    for (const el of Array.from(document.querySelectorAll(SELECTOR))) {
      if (el.getAttribute("aria-hidden") === "true") continue;
      if (el.closest("[data-allow-small-tap]")) continue;
      if ((el as HTMLButtonElement).disabled) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0")
        continue;
      // A checkbox/radio is tappable through its wrapping label, so measure
      // the label's hit area when there is one.
      const measured =
        (el.tagName === "INPUT" && (el.closest("label") as HTMLElement | null)) || el;
      const r = measured.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Off-screen (collapsed drawer / other viewport) controls aren't tappable yet.
      if (r.bottom < 0 || r.top > window.innerHeight * 3) continue;
      // Inline text links/controls are exempt per WCAG 2.5.8.
      const parent = el.parentElement;
      if (el.tagName === "A" && parent && INLINE_PARENTS.has(parent.tagName)) continue;
      // Native checkbox/radio glyphs are sized by the platform; when not
      // wrapped in a label we hold them to a 24px visual floor instead.
      const edge =
        el.tagName === "INPUT" && measured === el
          ? 24
          : // Overlay affordances pinned into a card corner are icon-sized by
            // design; hold them to a 36px floor rather than 44px.
            el.className.includes("absolute")
            ? 36
            : minEdge;
      if (r.height + 0.5 < edge || r.width + 0.5 < edge) {
        const tag = el.tagName.toLowerCase();
        const cls = (el.getAttribute("class") ?? "")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 3)
          .join(".");
        out.push({
          selector: `${tag}${cls ? `.${cls}` : ""}`,
          label: (
            el.getAttribute("aria-label") ||
            (el as HTMLElement).innerText ||
            el.getAttribute("title") ||
            ""
          )
            .trim()
            .slice(0, 40),
          width: Math.round(r.width),
          height: Math.round(r.height),
        });
      }
      if (out.length >= 12) break;
    }
    return out;
  }, min);
}

export async function settle(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(450);
}
