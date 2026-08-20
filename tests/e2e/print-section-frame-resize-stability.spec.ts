import { test, expect, type Page } from "@playwright/test";

/**
 * PrintSectionPreviewFrame — resize stability regression.
 *
 * The frame measures itself (outer width → transform scale, inner height →
 * reserved box height) inside a ResizeObserver loop. That loop can feed back on
 * itself: height depends on scale, scale depends on outer width, and outer
 * width changes when the page gains or loses a scrollbar. Historically that
 * made previews jitter and — worse — made cq()-based typography drift, because
 * a wrong container width rescales every font in the section.
 *
 * This spec resizes the viewport across a repeated cycle of widths and asserts
 * the two invariants that must hold no matter how often the frame is measured:
 *
 *   1. PAGE-SPACE HEIGHT IS CONSTANT. The inner page is authored at a fixed
 *      816px width, so its unscaled offsetHeight must not change with the
 *      viewport. Only the transform scale (and therefore the rendered height)
 *      may change.
 *   2. FONT SIZES ARE CONSTANT. Section type is authored in cqw against the
 *      816px page container, so every computed font-size inside the page must
 *      be byte-identical at every viewport width.
 *
 * It also proves the measure loop settles: sampling twice at the same width,
 * ~400ms apart, must return identical scale and height (no oscillation).
 */

const WIDTHS = [1600, 1280, 900, 1440, 768, 1600, 1024, 1280] as const;
const FRAMES = 3; // sample the first few module previews on the page

type FrameSample = {
  pageHeight: number;
  renderedHeight: number;
  scale: number;
  pageWidth: number;
  fonts: string[];
};

async function sample(page: Page): Promise<FrameSample[]> {
  return page.evaluate((limit) => {
    const frames = Array.from(
      document.querySelectorAll('[data-testid="print-section-preview-frame"]'),
    ).slice(0, limit);
    return frames.map((frame) => {
      const inner = frame.querySelector<HTMLElement>('[data-testid="print-section-preview-page"]');
      const box = frame.querySelector<HTMLElement>('[data-testid="print-section-preview-box"]');
      if (!inner || !box)
        return { pageHeight: -1, renderedHeight: -1, scale: -1, pageWidth: -1, fonts: [] };
      const fonts = Array.from(inner.querySelectorAll("h1,h2,h3,h4,p,li,span,td,th"))
        .slice(0, 24)
        .map((el) => {
          const cs = getComputedStyle(el);
          return `${cs.fontSize}/${cs.lineHeight}`;
        });
      return {
        pageHeight: Math.round(inner.offsetHeight * 100) / 100,
        renderedHeight: Math.round(box.getBoundingClientRect().height * 100) / 100,
        scale: Number(inner.dataset["previewScale"] ?? "0"),
        pageWidth: Math.round(inner.getBoundingClientRect().width / (Number(inner.dataset["previewScale"]) || 1)),
        fonts,
      };
    });
  }, FRAMES);
}

test.describe("PrintSectionPreviewFrame — height + type stability under resize", () => {
  test("module heights and font sizes survive repeated viewport resizes", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });

    await page.setViewportSize({ width: WIDTHS[0], height: 1400 });
    await page.goto("/library/print/modules", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="print-section-preview-frame"]', { timeout: 30_000 });
    await page.waitForTimeout(900); // let the first measure pass settle

    const baseline = await sample(page);
    expect(baseline.length).toBeGreaterThan(0);
    for (const f of baseline) {
      expect(f.pageHeight).toBeGreaterThan(0);
      expect(f.fonts.length).toBeGreaterThan(0);
      // The page container is authored at exactly one Letter page wide.
      expect(Math.abs(f.pageWidth - 816)).toBeLessThanOrEqual(2);
    }

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 1400 });
      await page.waitForTimeout(500);
      const first = await sample(page);

      // No oscillation: a second read at the same width is identical.
      await page.waitForTimeout(400);
      const second = await sample(page);

      expect(first.length).toBe(baseline.length);
      for (let i = 0; i < baseline.length; i += 1) {
        const base = baseline[i]!;
        const now = first[i]!;
        const again = second[i]!;

        // 1. Page-space height is viewport-independent.
        expect(
          Math.abs(now.pageHeight - base.pageHeight),
          `frame ${i} page height drifted at ${width}px (${base.pageHeight} → ${now.pageHeight})`,
        ).toBeLessThanOrEqual(1);

        // 2. Typography is viewport-independent.
        expect(now.fonts, `frame ${i} font metrics changed at ${width}px`).toEqual(base.fonts);

        // 3. The measure loop has settled.
        expect(again.scale, `frame ${i} scale oscillated at ${width}px`).toBeCloseTo(now.scale, 3);
        expect(
          Math.abs(again.pageHeight - now.pageHeight),
          `frame ${i} height oscillated at ${width}px`,
        ).toBeLessThanOrEqual(1);

        // 4. Reserved box height tracks scale × page height (no clipping / gap).
        expect(
          Math.abs(now.renderedHeight - now.pageHeight * now.scale),
          `frame ${i} reserved height out of sync at ${width}px`,
        ).toBeLessThanOrEqual(2);
      }
    }

    // No horizontal overflow at the narrowest width we visited.
    await page.setViewportSize({ width: 768, height: 1400 });
    await page.waitForTimeout(400);
    const doc = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 2);

    expect(
      // Known, resize-unrelated noise: favicon 404s, the benign ResizeObserver
      // loop warning, and the SSR `data-theme` hydration diff from the theme
      // script. Anything else during resize cycling is a real regression.
      consoleErrors.filter(
        (t) =>
          !/favicon|ResizeObserver loop|hydrat|data-theme|Warning:/i.test(t) &&
          // Pre-existing, harmless: some icon glyphs pass cqw calc() through
          // the SVG width/height attributes, which the browser rejects and
          // falls back to CSS sizing for. Not a resize regression.
          !/<svg> attribute (width|height)/i.test(t),
      ),
      "console errors during resize cycling",
    ).toEqual([]);
  });
});
