/**
 * Print relayout — fits each slide to a page of any aspect ratio.
 *
 * Slides are authored on a 1920-wide canvas. For another page shape, each
 * slide is re-rendered on several candidate canvas widths (height always
 * follows the page ratio) so its own responsive layout reflows: narrower
 * canvases stack content taller and print type larger. The candidate that
 * fills the page best without clipping anything wins, per slide.
 */

export const FIT_WIDTHS = [1920, 1600, 1440, 1280];

const FOOTER_SHARE = 0.9;

export type FitMeasure = { fill: number; overflow: boolean };

/** How much of the canvas a slide's content uses, and whether it clips. */
export function measureFit(stage: HTMLElement): FitMeasure {
  const W = stage.offsetWidth;
  const H = stage.offsetHeight;
  const s = stage.getBoundingClientRect();
  const scale = s.width / W || 1;
  let bottom = 0;
  let overflow = stage.scrollWidth > W + 2;
  // Text clipped inside its own box (a word cut by the card edge) is a fail too.
  for (const el of stage.querySelectorAll<HTMLElement>("div, p, h1, h2, h3, span")) {
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2) {
      const ov = getComputedStyle(el).overflowX;
      if (ov === "hidden" || ov === "clip") {
        overflow = true;
        break;
      }
    }
  }
  for (const el of stage.querySelectorAll<HTMLElement>("p, h1, h2, h3, h4, li, img, svg, span")) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const h = r.height / scale;
    if (h > H * 0.85) continue; // backgrounds
    const top = (r.top - s.top) / scale;
    const b = (r.bottom - s.top) / scale;
    const left = (r.left - s.left) / scale;
    const right = (r.right - s.left) / scale;
    if (right > W * 1.005 || left < -W * 0.005) overflow = true;
    if (top > H * FOOTER_SHARE) continue; // footer chrome
    if (b > H * 0.95) overflow = true;
    bottom = Math.max(bottom, b);
  }
  return { fill: bottom / H, overflow };
}

/** Pick the best canvas width from the per-candidate measurements. */
export function pickFit(results: Array<{ w: number; m: FitMeasure }>): number {
  const ok = results.filter((r) => !r.m.overflow);
  if (!ok.length) return results[0]?.w ?? 1920;
  // Fill target ~0.86: full page without crowding the footer.
  const score = (f: number) => (f > 0.92 ? 1 : Math.abs(0.86 - f));
  ok.sort((a, b) => score(a.m.fill) - score(b.m.fill) || b.w - a.w);
  return ok[0].w;
}
