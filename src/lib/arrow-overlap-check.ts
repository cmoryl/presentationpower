/**
 * Arrow / content overlap check.
 *
 * Directional cues (EchoArrow, HouseArrow, connector chevrons) are decorative
 * layers positioned in gutters. When copy grows — long headlines, an auto-fit
 * bump, a wider stat block — a cue can end up sitting under real content. On
 * screen that reads as a smudge; in an exported .pptx it becomes a genuinely
 * overlapping shape, because arrows and text land on separate layers.
 *
 * This module measures the rendered DOM (the same pixels that get exported) and
 * reports every arrow box that intersects a piece of live content. It is purely
 * a read: nothing here mutates layout, so it is safe to run on a preview grid
 * right before an export.
 */

/** Selectors for every decorative directional cue we paint. */
const ARROW_SELECTOR = [
  "[data-echo-arrow]",
  "[data-house-arrow]",
  "[data-arrow-cue]",
  "[data-connector]",
].join(",");

/**
 * Content leaves. Deliberately narrow: only elements that carry visible copy or
 * imagery, so we do not flag the arrow's own wrapper or a full-bleed panel that
 * legitimately sits behind it.
 */
const CONTENT_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "li",
  "span",
  "strong",
  "em",
  "td",
  "th",
  "img",
  "figcaption",
  "[data-stat-value]",
  "[data-block-text]",
].join(",");

export type ArrowOverlapHit = {
  /** Which cue overlapped, e.g. `echo-arrow`. */
  arrowKind: string;
  /** Trimmed copy (or image alt) of the content it collides with. */
  content: string;
  /** Overlap area as a fraction of the arrow's own box (0–1). */
  ratio: number;
  /** Overlap rect in viewport px — ready to paint a highlight with. */
  rect: { left: number; top: number; width: number; height: number };
};

export type SlideArrowOverlap = {
  slideId: string;
  /** 1-based position, for messages like "Slide 4". */
  index: number;
  hits: ArrowOverlapHit[];
};

export type ArrowOverlapReport = {
  scanned: number;
  arrows: number;
  slides: SlideArrowOverlap[];
  get totalHits(): number;
};

function intersect(a: DOMRect, b: DOMRect) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  if (right <= left || bottom <= top) return null;
  return { left, top, width: right - left, height: bottom - top };
}

function visible(el: Element): boolean {
  const cs = getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.display === "none") return false;
  if (Number(cs.opacity) < 0.06) return false;
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1;
}

/** Text of an element ignoring nested children with their own text nodes. */
function ownText(el: Element): string {
  if (el instanceof HTMLImageElement) return (el.alt || "image").trim();
  let out = "";
  el.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out += n.textContent ?? "";
  });
  return out.replace(/\s+/g, " ").trim();
}

function kindOf(el: Element): string {
  if (el.hasAttribute("data-echo-arrow")) return "echo-arrow";
  if (el.hasAttribute("data-house-arrow")) return "house-arrow";
  if (el.hasAttribute("data-connector")) return "connector";
  return "arrow";
}

/**
 * Scan a single rendered slide frame. `minRatio` ignores hairline kisses that
 * are invisible at presentation size (default: 4% of the arrow box).
 */
export function findArrowOverlaps(scope: HTMLElement, minRatio = 0.04): ArrowOverlapHit[] {
  const arrows = Array.from(scope.querySelectorAll<HTMLElement>(ARROW_SELECTOR)).filter(visible);
  if (arrows.length === 0) return [];
  const content = Array.from(scope.querySelectorAll<HTMLElement>(CONTENT_SELECTOR)).filter(
    (el) =>
      !el.closest(ARROW_SELECTOR) &&
      !el.hasAttribute("data-decorative") &&
      !el.closest("[data-decorative]") &&
      el.getAttribute("aria-hidden") !== "true" &&
      ownText(el).length > 0 &&
      visible(el),
  );

  const hits: ArrowOverlapHit[] = [];
  for (const arrow of arrows) {
    const ar = arrow.getBoundingClientRect();
    const area = ar.width * ar.height;
    if (area <= 0) continue;
    for (const el of content) {
      const box = intersect(ar, el.getBoundingClientRect());
      if (!box) continue;
      const ratio = (box.width * box.height) / area;
      if (ratio < minRatio) continue;
      hits.push({
        arrowKind: kindOf(arrow),
        content: ownText(el).slice(0, 80),
        ratio,
        rect: box,
      });
    }
  }
  // Worst offenders first so a reviewer fixes the loudest collision first.
  return hits.sort((a, b) => b.ratio - a.ratio);
}

/**
 * Scan every slide frame inside `root`. Frames opt in by carrying
 * `data-arrow-check-slide="<slideId>"`.
 */
export function scanArrowOverlaps(root: ParentNode = document, minRatio = 0.04): ArrowOverlapReport {
  const frames = Array.from(root.querySelectorAll<HTMLElement>("[data-arrow-check-slide]"));
  let arrows = 0;
  const slides: SlideArrowOverlap[] = [];
  frames.forEach((frame, i) => {
    arrows += frame.querySelectorAll(ARROW_SELECTOR).length;
    const hits = findArrowOverlaps(frame, minRatio);
    if (hits.length > 0) {
      slides.push({
        slideId: frame.getAttribute("data-arrow-check-slide") ?? String(i),
        index: Number(frame.getAttribute("data-arrow-check-index") ?? i + 1),
        hits,
      });
    }
  });
  return {
    scanned: frames.length,
    arrows,
    slides,
    get totalHits() {
      return this.slides.reduce((n, s) => n + s.hits.length, 0);
    },
  };
}

export function summarizeArrowOverlaps(report: ArrowOverlapReport): string {
  if (report.slides.length === 0)
    return `No arrow/content overlap across ${report.scanned} slide${report.scanned === 1 ? "" : "s"}`;
  const n = report.totalHits;
  return `${n} overlap${n === 1 ? "" : "s"} on ${report.slides.length} slide${
    report.slides.length === 1 ? "" : "s"
  }`;
}
