import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * PAGE FIT — relayout a slide for a print page whose shape differs from 16:9.
 *
 * When a slide is placed on a taller page (letter/A4/A3, landscape or
 * portrait), its authored content only covers the top part of the sheet and
 * prints small. PageFitBody wraps the slide's content plane and searches for
 * the largest CSS `zoom` at which everything still fits: zoom narrows the
 * layout width (so rows reflow and wrap) and enlarges type, cards, charts and
 * imagery together, so the content grows until it fills the page.
 *
 * Guard rails — a zoom is only accepted when:
 *   - the content plane does not overflow its own box (header/footer reserve
 *     stays clear), and
 *   - no text that fitted at zoom 1 is pushed outside the plane or clipped by
 *     its own box. Text the original design already clips is ignored, so a
 *     deliberate ellipsis can't force everything tiny.
 * If the design already overflows at zoom 1, it shrinks (never below 0.75)
 * until it fits. Off by default; only print/export pages enable it.
 */
export const PageFitContext = createContext(false);
export const usePageFit = () => useContext(PageFitContext);

const MAX_ZOOM = 1.8;
const MIN_ZOOM = 0.75;
const TOL = 2;

function textElements(root: HTMLElement): Element[] {
  const out: Element[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set<Element>();
  let n = walker.nextNode();
  while (n) {
    if (n.nodeValue && n.nodeValue.trim() && n.parentElement && !seen.has(n.parentElement)) {
      seen.add(n.parentElement);
      out.push(n.parentElement);
    }
    n = walker.nextNode();
  }
  return out;
}

const clips = (cs: CSSStyleDeclaration) =>
  cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible";

/** Nearest ancestor inside the plane that clips its content. */
function clipAncestor(el: Element, root: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p && p !== root) {
    if (clips(getComputedStyle(p))) return p;
    p = p.parentElement;
  }
  return null;
}

/** Graphics (svg, images, round discs) — these must never get smaller or
 *  change shape when the page zooms; a squeezed dial or disc means the
 *  layout ran out of room even if no text overflowed. */
function graphicElements(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  root.querySelectorAll<HTMLElement>("svg, img, canvas, div, span").forEach((el) => {
    if (el.tagName.toLowerCase() === "svg" && el.parentElement?.closest("svg")) return;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) return;
    const tag = el.tagName.toLowerCase();
    if (tag === "svg" || tag === "img" || tag === "canvas") {
      out.push(el);
      return;
    }
    const rad = parseFloat(getComputedStyle(el).borderTopLeftRadius);
    if (rad > 0 && rad >= Math.min(r.width, r.height) / 2 - 1) out.push(el);
  });
  return out;
}

type Probe = {
  texts: Element[];
  leaves: Element[];
  clipOf: Map<Element, HTMLElement | null>;
  graphics: HTMLElement[];
  graphicBase: Map<HTMLElement, { w: number; h: number }>;
};

function probe(root: HTMLElement): Probe {
  const texts = textElements(root);
  const leaves = texts.filter((t) => !texts.some((o) => o !== t && t.contains(o)));
  const clipOf = new Map<Element, HTMLElement | null>();
  for (const t of texts) clipOf.set(t, clipAncestor(t, root));
  const graphics = graphicElements(root);
  const graphicBase = new Map<HTMLElement, { w: number; h: number }>();
  for (const g of graphics) {
    const r = g.getBoundingClientRect();
    graphicBase.set(g, { w: r.width, h: r.height });
  }
  return { texts, leaves, clipOf, graphics, graphicBase };
}

/** How far (px) a rect pokes out of a box; 0 when inside. */
const spill = (r: DOMRect, R: DOMRect) =>
  Math.max(0, r.bottom - R.bottom, r.right - R.right, R.left - r.left, R.top - r.top);

const overlapFrac = (a: DOMRect, b: DOMRect) => {
  const ov =
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const area = a.width * a.height;
  return area > 0 ? ov / area : 0;
};

/**
 * Every layout defect at the current zoom, keyed, with a size. Pixel amounts
 * are divided by the zoom so a defect the original design already had (a
 * deliberate ellipsis, a badge overlapping a card edge) only counts against a
 * zoom when it gets worse.
 */
function issues(root: HTMLElement, p: Probe, zoom: number): Map<string, number> {
  const R = root.getBoundingClientRect();
  const bad = new Map<string, number>();
  const add = (k: string, v: number) => {
    if (v > 0) bad.set(k, v);
  };
  const rects = new Map<Element, DOMRect>();
  p.texts.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    rects.set(el, r);
    if (r.width === 0 && r.height === 0) return;
    add(`out:${i}`, spill(r, R) / zoom);
    const c = p.clipOf.get(el);
    if (c) add(`clip:${i}`, spill(r, c.getBoundingClientRect()) / zoom);
    if (el instanceof HTMLElement && el.clientWidth > 0) {
      const cs = getComputedStyle(el);
      // A word wider than its own box (e.g. "Productivit|y").
      if (cs.display !== "inline") add(`wide:${i}`, (el.scrollWidth - el.clientWidth) / zoom);
      if (clips(cs)) add(`self:${i}`, (el.scrollHeight - el.clientHeight) / zoom);
    }
  });
  const L = p.leaves;
  for (let i = 0; i < L.length; i++) {
    const a = rects.get(L[i]);
    if (!a || a.width === 0) continue;
    // Text blocks running into each other.
    for (let j = i + 1; j < L.length; j++) {
      const b = rects.get(L[j]);
      if (!b || b.width === 0) continue;
      add(`hit:${i}-${j}`, Math.max(overlapFrac(a, b), overlapFrac(b, a)) * 100);
    }
    // Text slipping under a disc / badge / picture it wasn't on before.
    p.graphics.forEach((g, k) => {
      if (g.contains(L[i]) || L[i].contains(g)) return;
      add(`under:${i}-${k}`, overlapFrac(a, g.getBoundingClientRect()) * 100);
    });
  }
  // Graphics must grow with the zoom (allowing 5%) and keep their shape.
  p.graphics.forEach((g, k) => {
    const base = p.graphicBase.get(g)!;
    const r = g.getBoundingClientRect();
    if (base.w === 0 || base.h === 0) return;
    const grow = Math.min(1, zoom) * 0.95;
    if (r.width < base.w * grow || r.height < base.h * grow) bad.set(`shrink:${k}`, 100);
    const ar0 = base.w / base.h;
    const ar = r.height > 0 ? r.width / r.height : 0;
    if (Math.abs(ar - ar0) / ar0 > 0.08) bad.set(`shape:${k}`, 100);
  });
  return bad;
}

function planeOverflows(el: HTMLElement) {
  return el.scrollHeight > el.clientHeight + TOL || el.scrollWidth > el.clientWidth + TOL;
}

export function fitPage(el: HTMLElement): number {
  el.style.zoom = "1";
  const p = probe(el);
  const baseline = issues(el, p, 1);
  const fits = (z: number) => {
    el.style.zoom = String(z);
    if (planeOverflows(el)) return false;
    for (const [k, v] of issues(el, p, z)) {
      const b = baseline.get(k) ?? 0;
      // Overlap scores are percentages; spills are px — both get a small slack.
      const slack = k.startsWith("hit:") || k.startsWith("under:") ? 3 : TOL;
      if (v > b + slack) return false;
    }
    return true;
  };
  let lo: number;
  let hi: number;
  if (fits(1)) {
    lo = 1;
    hi = MAX_ZOOM;
    if (fits(hi)) lo = hi;
  } else {
    lo = MIN_ZOOM;
    hi = 1;
    if (!fits(lo)) {
      el.style.zoom = "1";
      el.dataset.pageFitZoom = "1";
      return 1;
    }
  }
  for (let i = 0; i < 8 && hi - lo > 0.01; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  const z = Math.floor(lo * 100) / 100;
  el.style.zoom = String(z);
  el.dataset.pageFitZoom = String(z);
  return z;
}

export function PageFitBody({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const run = () => {
      if (!cancelled && el.isConnected) fitPage(el);
    };
    run();
    const raf = requestAnimationFrame(() => requestAnimationFrame(run));
    const timers = [300, 1000, 2500, 5000].map((t) => window.setTimeout(run, t));
    document.fonts?.ready.then(run).catch(() => {});
    // Late images (logos, photos) change heights — refit when they land.
    const onLoad = () => run();
    el.addEventListener("load", onLoad, true);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      el.removeEventListener("load", onLoad, true);
    };
  }, []);
  return (
    <div
      ref={ref}
      data-page-fit-body=""
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
        width: "100%",
        alignItems: "inherit",
        justifyContent: "inherit",
      }}
    >
      {children}
    </div>
  );
}
