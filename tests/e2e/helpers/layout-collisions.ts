/**
 * Shared layout-regression helpers: text spill + element collision detection.
 *
 * These complement `helpers/responsive.ts` (page-level horizontal overflow and
 * tap targets) with the two failure modes that bit the approvals queue and the
 * KitWizard headers: long titles/notes that spill out of their container, and
 * text blocks that visually collide with neighbouring controls.
 *
 * Both helpers are scoped to a root selector so a spec can assert on one
 * component subtree instead of the whole page.
 */
import { expect, type Page } from "@playwright/test";

/** Breakpoints every layout regression is checked at. */
export const LAYOUT_BREAKPOINTS = [
  { name: "phone", width: 390, height: 900 },
  { name: "tablet", width: 768, height: 1100 },
  { name: "laptop", width: 1280, height: 900 },
  { name: "desktop", width: 1680, height: 1000 },
] as const;

export type SpillOffender = {
  selector: string;
  text: string;
  axis: "x" | "y";
  content: number;
  box: number;
};

export type CollisionOffender = {
  a: string;
  b: string;
  aText: string;
  bText: string;
  overlapW: number;
  overlapH: number;
};

/**
 * Elements whose text content is larger than the box painting it, without an
 * intentional clamp (`truncate`, `line-clamp-*`, `overflow-*` scrollers).
 * Those are real spills: the glyphs render outside their container.
 */
export async function measureTextSpill(page: Page, root: string): Promise<SpillOffender[]> {
  return page.evaluate((rootSel) => {
    const host = document.querySelector(rootSel);
    if (!host) return [];
    const describe = (el: Element) => {
      const cls = (el.getAttribute("class") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .join(".");
      return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""}`;
    };
    const out: SpillOffender[] = [];
    for (const el of Array.from(host.querySelectorAll("*"))) {
      if (el.getAttribute("aria-hidden") === "true") continue;
      if (el.closest("[data-allow-overflow]")) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      // Only leaf-ish text carriers; containers legitimately size to children.
      const text = (el.textContent ?? "").trim();
      if (!text) continue;
      const hasElementChild = Array.from(el.children).length > 0;
      if (hasElementChild) continue;
      const cls = el.getAttribute("class") ?? "";
      const clamped =
        cls.includes("truncate") ||
        cls.includes("line-clamp") ||
        style.textOverflow === "ellipsis" ||
        style.webkitLineClamp !== "none";
      const scroller =
        style.overflowX === "auto" ||
        style.overflowX === "scroll" ||
        style.overflowY === "auto" ||
        style.overflowY === "scroll";
      if (clamped || scroller) continue;
      const el2 = el as HTMLElement;
      const snippet = text.slice(0, 48);
      if (el2.scrollWidth > el2.clientWidth + 2 && style.overflowX !== "hidden") {
        out.push({
          selector: describe(el),
          text: snippet,
          axis: "x",
          content: el2.scrollWidth,
          box: el2.clientWidth,
        });
      } else if (style.overflowY === "hidden" && el2.scrollHeight > el2.clientHeight + 2) {
        out.push({
          selector: describe(el),
          text: snippet,
          axis: "y",
          content: el2.scrollHeight,
          box: el2.clientHeight,
        });
      }
      if (out.length >= 10) break;
    }
    return out;
  }, root);
}

/**
 * Text blocks that overlap a sibling text block or control by more than a few
 * pixels. Ancestor/descendant and positioned-overlay pairs are excluded, since
 * stacking is intentional there.
 */
export async function measureCollisions(page: Page, root: string): Promise<CollisionOffender[]> {
  return page.evaluate((rootSel) => {
    const host = document.querySelector(rootSel);
    if (!host) return [];
    const describe = (el: Element) => {
      const cls = (el.getAttribute("class") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .join(".");
      return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""}`;
    };
    const SELECTOR = "h1,h2,h3,h4,p,button,label,span[class],div[class]";
    const nodes = Array.from(host.querySelectorAll(SELECTOR)).filter((el) => {
      if (el.getAttribute("aria-hidden") === "true") return false;
      if (el.closest("[data-allow-overlap]")) return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (style.position === "absolute" || style.position === "fixed") return false;
      if (Number(style.opacity) === 0) return false;
      // Text carriers only, and only leaves so nesting isn't reported.
      if (el.children.length > 0) return false;
      const text = (el.textContent ?? "").trim();
      if (!text) return false;
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4;
    });
    const out: CollisionOffender[] = [];
    for (let i = 0; i < nodes.length && out.length < 8; i++) {
      const a = nodes[i]!;
      const ra = a.getBoundingClientRect();
      for (let j = i + 1; j < nodes.length && out.length < 8; j++) {
        const b = nodes[j]!;
        if (a.contains(b) || b.contains(a)) continue;
        // Ignore pairs whose nearest positioned ancestor differs by stacking.
        const rb = b.getBoundingClientRect();
        const overlapW = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const overlapH = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (overlapW > 3 && overlapH > 3) {
          out.push({
            a: describe(a),
            b: describe(b),
            aText: (a.textContent ?? "").trim().slice(0, 40),
            bText: (b.textContent ?? "").trim().slice(0, 40),
            overlapW: Math.round(overlapW),
            overlapH: Math.round(overlapH),
          });
        }
      }
    }
    return out;
  }, root);
}

/**
 * Stress the rendered subtree with pathological content: very long unbroken
 * titles and multi-sentence notes. This reproduces the real-world regression
 * (a 200-char asset title colliding with its status pills) without needing
 * seeded backend data.
 */
export async function injectLongContent(page: Page, root: string) {
  await page.evaluate((rootSel) => {
    const host = document.querySelector(rootSel);
    if (!host) return;
    const LONG_TITLE =
      "Global Enterprise Localization Program Kickoff Deck — EMEA / APAC Consolidated Rollout Wave 3 (Confidential Draft)";
    const LONG_NOTE =
      "Reviewer note: the cover lockup clear space is short by 4pt, the statistic block wraps onto three lines at tablet width, and the client logo needs replacing with an approved LogoHub mark before this can ship to the customer.";
    const headings = Array.from(host.querySelectorAll("h1,h2,h3,h4"));
    headings.forEach((el) => {
      el.textContent = LONG_TITLE;
    });
    Array.from(host.querySelectorAll("p")).forEach((el) => {
      el.textContent = LONG_NOTE;
    });
  }, root);
  await page.waitForTimeout(250);
}

export async function assertNoSpillOrCollision(page: Page, root: string, label: string) {
  const spills = await measureTextSpill(page, root);
  expect(spills, `${label}: text spills its container — ${JSON.stringify(spills)}`).toEqual([]);
  const collisions = await measureCollisions(page, root);
  expect(
    collisions,
    `${label}: text blocks collide — ${JSON.stringify(collisions)}`,
  ).toEqual([]);
}
