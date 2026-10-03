/**
 * Print relayout — adapts a slide authored for 16:9 to a taller page canvas.
 *
 * When a slide's content leaves a large empty band at the bottom of the taller
 * canvas, its main side-by-side row (grid or flex) is restacked into a column
 * so the content uses the page height. Every change is measured: if the
 * restacked slide would overflow the page, it is reverted, so a relayout can
 * never cut content off. Returns a cleanup that restores the authored layout.
 */

type Saved = { el: HTMLElement; style: string | null };

const FOOTER_SHARE = 0.9;
const FILL_OK = 0.82;
const OVERFLOW_LIMIT = 0.93;

function contentBottom(stage: HTMLElement): number {
  const s = stage.getBoundingClientRect();
  const scale = s.height / stage.offsetHeight || 1;
  let max = 0;
  for (const el of stage.querySelectorAll<HTMLElement>("p, h1, h2, h3, h4, li, img, svg, span")) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (r.height / scale > stage.offsetHeight * 0.85) continue; // backgrounds
    const bottom = (r.bottom - s.top) / scale;
    if (bottom > stage.offsetHeight * FOOTER_SHARE) continue; // footer chrome
    max = Math.max(max, bottom);
  }
  return max;
}

function mainRow(stage: HTMLElement): HTMLElement | null {
  const W = stage.offsetWidth;
  let best: HTMLElement | null = null;
  let bestArea = 0;
  for (const el of stage.querySelectorAll<HTMLElement>("div, section")) {
    const cs = getComputedStyle(el);
    const rowish =
      (cs.display.includes("flex") && cs.flexDirection.startsWith("row")) ||
      (cs.display.includes("grid") && cs.gridTemplateColumns.split(" ").length >= 2);
    if (!rowish || cs.position === "absolute") continue;
    const kids = Array.from(el.children).filter(
      (k) => (k as HTMLElement).offsetWidth > 0,
    ) as HTMLElement[];
    if (kids.length < 2 || kids.length > 4) continue;
    // Children must actually sit side by side.
    if (Math.abs(kids[0].offsetTop - kids[1].offsetTop) > 8) continue;
    if (el.offsetWidth < W * 0.7) continue;
    const area = el.offsetWidth * el.offsetHeight;
    if (area > bestArea) {
      best = el;
      bestArea = area;
    }
  }
  return best;
}

export function relayoutForPage(stages: HTMLElement[]): () => void {
  const saved: Saved[] = [];
  const keep = (el: HTMLElement) => saved.push({ el, style: el.getAttribute("style") });
  const restore = (from: number) => {
    for (const s of saved.splice(from).reverse()) {
      if (s.style === null) s.el.removeAttribute("style");
      else s.el.setAttribute("style", s.style);
    }
  };

  for (const stage of stages) {
    const H = stage.offsetHeight;
    if (H <= stage.offsetWidth * 0.6) continue; // 16:9 canvas: nothing to adapt
    if (contentBottom(stage) / H >= FILL_OK) continue;
    const row = mainRow(stage);
    if (!row) continue;
    const mark = saved.length;
    keep(row);
    const cs = getComputedStyle(row);
    if (cs.display.includes("grid")) {
      row.style.gridTemplateColumns = "minmax(0, 1fr)";
    } else {
      row.style.flexDirection = "column";
    }
    row.style.height = "auto";
    for (const kid of Array.from(row.children) as HTMLElement[]) {
      keep(kid);
      kid.style.width = "100%";
      kid.style.maxWidth = "100%";
      kid.style.flex = "1 1 auto";
    }
    if (contentBottom(stage) > H * OVERFLOW_LIMIT || row.scrollHeight > H) restore(mark);
  }
  return () => restore(0);
}
