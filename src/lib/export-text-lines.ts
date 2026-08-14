// -----------------------------------------------------------------------------
// Baked line layout (EXPORT SPEC: the browser owns line breaking)
//
// `export-text-merge.ts` deliberately handed line breaking to PowerPoint so two
// fragments of one line could not collide. That removed the collisions but kept
// the biggest visible difference between the build and the export: PowerPoint
// re-flows the paragraph with its OWN metrics, so a headline that breaks
// "Localization at\nenterprise scale" on screen can break
// "Localization\nat enterprise scale" in the file, and the block grows or shrinks
// by a line.
//
// This module removes the ambiguity for multi-line paragraphs: it measures where
// the BROWSER actually broke each line (via Range client rects) and returns those
// lines. The exporter then emits one PowerPoint run per measured line with an
// explicit break and `wrap="none"`, so PowerPoint has no layout decision left to
// make and the exported paragraph breaks exactly where the build breaks.
//
// Single-line runs are untouched — they cannot re-wrap.
// -----------------------------------------------------------------------------

export interface MeasuredLine {
  /** Text of this visual line, in stage space geometry. */
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Direct text-node children only, matching the run extractor's own scope. */
function directTextNodes(el: Element): Text[] {
  const out: Text[] = [];
  el.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim()) out.push(n as Text);
  });
  return out;
}

interface WordBox {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Word-level client rects for one text node, in viewport space. */
function wordBoxes(node: Text): WordBox[] {
  const raw = node.textContent ?? "";
  const boxes: WordBox[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  const range = document.createRange();
  while ((m = re.exec(raw))) {
    try {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
    } catch {
      continue;
    }
    // A word split across two lines (hyphenation / break-anywhere) yields more
    // than one rect; keep each fragment so it lands on its own line.
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    if (rects.length === 1) {
      const r = rects[0]!;
      boxes.push({ text: m[0], left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    } else {
      for (const r of rects) {
        boxes.push({ text: m[0], left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      }
    }
  }
  return boxes;
}

/**
 * Measure the visual lines the browser produced inside `el`.
 *
 * `sx` / `sy` scale viewport px into the canonical 1920×1080 stage space, and
 * `origin` is the stage's viewport-space top-left.
 *
 * Returns an empty array when the element has no measurable direct text, and a
 * single entry when it renders on one line (the caller can then keep its
 * existing single-box path).
 */
export function measureLines(
  el: HTMLElement,
  origin: { left: number; top: number },
  sx: number,
  sy: number,
): MeasuredLine[] {
  const nodes = directTextNodes(el);
  if (!nodes.length) return [];

  const words: WordBox[] = [];
  for (const n of nodes) words.push(...wordBoxes(n));
  if (!words.length) return [];

  // Group by vertical band. Words on one line share a top within a fraction of
  // their own height; a superscript or inline-sized sibling never shifts a whole
  // line, so the band tolerance is generous relative to sub-pixel jitter but
  // tight relative to a line advance.
  const groups: WordBox[][] = [];
  for (const w of words) {
    const band = groups[groups.length - 1];
    const ref = band?.[band.length - 1];
    const tol = ref ? Math.max(2, Math.min(ref.bottom - ref.top, w.bottom - w.top) * 0.55) : 0;
    if (ref && Math.abs(w.top - ref.top) <= tol) band!.push(w);
    else groups.push([w]);
  }

  return groups.map((band) => {
    const left = Math.min(...band.map((w) => w.left));
    const top = Math.min(...band.map((w) => w.top));
    const rightEdge = Math.max(...band.map((w) => w.right));
    const bottomEdge = Math.max(...band.map((w) => w.bottom));
    return {
      text: band.map((w) => w.text).join(" "),
      x: (left - origin.left) * sx,
      y: (top - origin.top) * sy,
      w: Math.max(1, (rightEdge - left) * sx),
      h: Math.max(1, (bottomEdge - top) * sy),
    };
  });
}

/**
 * Vertical pitch between measured lines, in stage px. Used as the emitted
 * `lineSpacing` so the baked lines keep the build's rhythm exactly instead of
 * PowerPoint's font-derived default.
 */
export function linePitch(lines: MeasuredLine[]): number {
  if (lines.length < 2) return 0;
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i += 1) gaps.push(lines[i]!.y - lines[i - 1]!.y);
  const usable = gaps.filter((g) => g > 0.5);
  if (!usable.length) return 0;
  usable.sort((a, b) => a - b);
  return usable[Math.floor(usable.length / 2)]!;
}
