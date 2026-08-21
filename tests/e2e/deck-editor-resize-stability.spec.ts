import { test, expect, type Page } from "@playwright/test";
import { createDeckViaSkipAI } from "./helpers/create-deck";

/**
 * Deck editor — resize stability regression.
 *
 * Historically, entering an editor mode (Text vs Objects), opening the Layers
 * rail, double-clicking into a text block, enlarging the stage, or simply
 * resizing the window would rescale the slide: fonts jumped, canvas objects
 * moved, and copy overlapped. The root cause was more than one coordinate
 * system — a width-only ratio in the editor vs. the aspect-fit scale of the
 * visible surface — so any container that wasn't exactly 16:9 produced
 * different geometry than the preview.
 *
 * This spec pins the invariant in STAGE SPACE: everything is measured relative
 * to the visible `[data-print-surface]` and divided by its width. Those
 * normalized numbers describe the authored 1920x1080 slide and therefore MUST
 * be identical no matter which editor mode is active or how wide the window is.
 *
 *   1. SURFACE ASPECT is 16:9 in every mode (no stretch/squash).
 *   2. NORMALIZED TYPOGRAPHY (fontSize / surfaceWidth) is identical in every
 *      mode and at every viewport width.
 *   3. NORMALIZED OBJECT GEOMETRY (x/y/w/h in 1920-space) is identical in
 *      every mode — editing must never move or resize an object.
 *   4. The measure loop SETTLES: sampling twice at the same width returns the
 *      same values (no ResizeObserver oscillation).
 */

const STAGE_W = 1920;
const ASPECT = 16 / 9;
const WIDTHS = [1280, 1600, 1024, 1440, 1280] as const;

type Sample = {
  surfaceAspect: number;
  /** fontSize/lineHeight/weight per text node, normalized to 1920-space. */
  type: string[];
  /** x,y,w,h per canvas object, normalized to 1920-space. */
  geometry: string[];
};

async function sample(page: Page): Promise<Sample> {
  return page.evaluate((stageW) => {
    const surface = document.querySelector<HTMLElement>("[data-print-surface]");
    if (!surface) return { surfaceAspect: -1, type: [], geometry: [] };
    const sr = surface.getBoundingClientRect();
    const k = sr.width > 0 ? stageW / sr.width : 0;
    const round = (n: number) => Math.round(n * 10) / 10;

    const type = Array.from(
      surface.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,li,span,td,th"),
    )
      .filter((el) => (el.textContent ?? "").trim().length > 0)
      .slice(0, 40)
      .map((el) => {
        const cs = getComputedStyle(el);
        const lh = parseFloat(cs.lineHeight);
        return [
          round(parseFloat(cs.fontSize) * k),
          Number.isFinite(lh) ? round(lh * k) : "normal",
          cs.fontWeight,
          cs.letterSpacing,
        ].join("/");
      });

    const geometry = Array.from(
      surface.querySelectorAll<HTMLElement>("[data-canvas-block]"),
    ).map((el) => {
      const r = el.getBoundingClientRect();
      return [
        el.dataset["canvasBlock"] ?? "?",
        round((r.left - sr.left) * k),
        round((r.top - sr.top) * k),
        round(r.width * k),
        round(r.height * k),
      ].join("/");
    });

    return { surfaceAspect: round((sr.width / sr.height) * 1000) / 1000, type, geometry };
  }, STAGE_W);
}

/** Click a control when present; modes that don't exist for this deck are skipped. */
async function clickIfPresent(page: Page, name: RegExp): Promise<boolean> {
  const btn = page.getByRole("button", { name }).first();
  if (!(await btn.count())) return false;
  if (!(await btn.isVisible().catch(() => false))) return false;
  await btn.evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(400);
  return true;
}

test.describe("Deck editor stays dimensionally stable while editing", () => {
  test("every editor mode and viewport width renders identical stage geometry", async ({
    page,
  }) => {
    test.slow();
    await createDeckViaSkipAI(page);

    const surface = page.locator("[data-print-surface]").first();
    await expect(surface).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(800);

    const baseline = await sample(page);
    expect(baseline.surfaceAspect).toBeGreaterThan(0);
    expect(baseline.type.length).toBeGreaterThan(0);

    const modes: { label: string; enter: () => Promise<boolean> }[] = [
      { label: "Objects tool", enter: () => clickIfPresent(page, /^Objects$/) },
      { label: "Text tool", enter: () => clickIfPresent(page, /^Text$/) },
      { label: "Layers rail open", enter: () => clickIfPresent(page, /Layers/i) },
      { label: "Layers rail closed", enter: () => clickIfPresent(page, /Layers/i) },
      {
        label: "Text block editing",
        enter: async () => {
          const block = page.locator("[data-canvas-block]").first();
          if (!(await block.count())) return false;
          await block.dblclick({ force: true });
          await page.waitForTimeout(400);
          return true;
        },
      },
      { label: "Enlarged stage", enter: () => clickIfPresent(page, /Enlarge to edit/i) },
      { label: "Exit full size", enter: () => clickIfPresent(page, /Exit full size/i) },
    ];

    for (const mode of modes) {
      const entered = await mode.enter();
      if (!entered) continue;
      await expect(page.locator("[data-print-surface]").first()).toBeVisible();
      const after = await sample(page);
      expect(after.surfaceAspect, `${mode.label}: surface must stay 16:9`).toBeCloseTo(ASPECT, 2);
      expect(after.type, `${mode.label}: typography must not rescale`).toEqual(baseline.type);
      expect(after.geometry, `${mode.label}: objects must not move or resize`).toEqual(
        baseline.geometry,
      );
    }

    // Width sweep: the authored slide is resolution independent, so every
    // normalized measurement must survive a container of any size.
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 1800 });
      await page.waitForTimeout(600);
      const first = await sample(page);
      expect(first.surfaceAspect, `${width}px: surface must stay 16:9`).toBeCloseTo(ASPECT, 2);
      expect(first.type, `${width}px: typography must not rescale`).toEqual(baseline.type);
      expect(first.geometry, `${width}px: objects must not move or resize`).toEqual(
        baseline.geometry,
      );

      // Settling check — a feedback loop between measure and layout would show
      // up as different numbers a few hundred ms later at the same width.
      await page.waitForTimeout(500);
      const second = await sample(page);
      expect(second, `${width}px: measure loop must settle`).toEqual(first);
    }
  });
});
