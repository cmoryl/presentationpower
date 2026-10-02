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
  // A word split across two lines ("AM–" / "5:30") yields one box per fragment
  // carrying ONLY that fragment's characters — pushing the whole word for each
  // rect printed it twice ("9:30 AM–5:30AM–5:30 PM").
  while ((m = re.exec(raw))) boxes.push(...fragmentBoxes(node, m.index, m[0]));
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

// -----------------------------------------------------------------------------
// Inline-aware paragraphs
//
// A paragraph that mixes styles mid-line ("Maintain <b>100%</b> accuracy…",
// "reduce turnaround time by <span>60%</span>.") used to be captured as one run
// for the parent's own text plus a separate floating run per inline child. The
// parent's words were joined with the child's gap collapsed, then the child was
// appended at the END of a line — so the export printed "Maintain accuracy…"
// with "100%" stamped over it. Measuring the whole inline stream in reading
// order, word by word, keeps every styled segment in its own place on its own
// line.
// -----------------------------------------------------------------------------

export interface InlineSegment {
  text: string;
  /** Index into the owner list returned with the lines. */
  owner: number;
}

export interface InlineLine extends MeasuredLine {
  segments: InlineSegment[];
}

const isInlineDisplay = (d: string) => d === "inline" || d === "contents";

/**
 * Text nodes of `el` in reading order, descending into INLINE element children
 * only (spans, strong, em, a). Block / inline-block children are their own runs.
 */
export function inlineTextNodes(el: Element): { nodes: Text[]; inlineEls: Element[] } {
  const nodes: Text[] = [];
  const inlineEls: Element[] = [];
  const walk = (parent: Element) => {
    parent.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        if ((n.textContent ?? "").length) nodes.push(n as Text);
        return;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return;
      const child = n as Element;
      if (child.tagName === "BR") return;
      if (child.namespaceURI === "http://www.w3.org/2000/svg") return;
      const cs = getComputedStyle(child);
      if (!isInlineDisplay(cs.display)) return;
      if (cs.visibility === "hidden") return;
      inlineEls.push(child);
      walk(child);
    });
  };
  walk(el);
  return { nodes, inlineEls };
}

interface StreamWord extends WordBox {
  owner: Element;
  spaceBefore: boolean;
}

/** Client rects for one word; a word broken across lines yields one box PER
 *  FRAGMENT with only that fragment's characters (never the whole word twice). */
function fragmentBoxes(node: Text, start: number, word: string): WordBox[] {
  const range = document.createRange();
  try {
    range.setStart(node, start);
    range.setEnd(node, start + word.length);
  } catch {
    return [];
  }
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
  if (!rects.length) return [];
  if (rects.length === 1) {
    const r = rects[0]!;
    return [{ text: word, left: r.left, top: r.top, right: r.right, bottom: r.bottom }];
  }
  const out: WordBox[] = [];
  for (let i = 0; i < word.length; i += 1) {
    try {
      range.setStart(node, start + i);
      range.setEnd(node, start + i + 1);
    } catch {
      continue;
    }
    const r = Array.from(range.getClientRects()).find((x) => x.height > 0.5);
    if (!r) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(r.top - last.top) < Math.max(2, (last.bottom - last.top) * 0.5) && r.left >= last.left - 1) {
      last.text += word[i];
      last.right = Math.max(last.right, r.right);
      last.bottom = Math.max(last.bottom, r.bottom);
    } else {
      out.push({ text: word[i]!, left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    }
  }
  return out;
}

/**
 * Measure an inline paragraph (own text + inline children) as visual lines of
 * styled segments, in stage space. Returns [] when nothing measurable.
 */
export function measureInlineLines(
  el: HTMLElement,
  origin: { left: number; top: number },
  sx: number,
  sy: number,
): { lines: InlineLine[]; owners: Element[] } {
  const { nodes } = inlineTextNodes(el);
  const words: StreamWord[] = [];
  let pendingWs = false;
  for (const n of nodes) {
    const raw = n.textContent ?? "";
    const owner = n.parentElement ?? el;
    const re = /\S+|\s+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw))) {
      if (/^\s/.test(m[0])) {
        pendingWs = true;
        continue;
      }
      const frags = fragmentBoxes(n, m.index, m[0]);
      frags.forEach((f, fi) => words.push({ ...f, owner, spaceBefore: fi === 0 && pendingWs }));
      pendingWs = false;
    }
  }
  if (!words.length) return { lines: [], owners: [] };

  const owners: Element[] = [];
  const ownerIdx = (o: Element) => {
    const i = owners.indexOf(o);
    if (i >= 0) return i;
    owners.push(o);
    return owners.length - 1;
  };

  // A new visual line starts when a word wraps back to the left or sits fully
  // below the previous one. Mixed font sizes on one line share vertical overlap.
  const groups: StreamWord[][] = [];
  for (const w of words) {
    const band = groups[groups.length - 1];
    const prev = band?.[band.length - 1];
    // Tight display leading (0.94) makes line boxes overlap vertically, so the
    // reliable signal is horizontal: a word that starts left of where the
    // previous one ended has wrapped.
    const slack = prev ? Math.max(2, (prev.bottom - prev.top) * 0.3) : 0;
    const wrapped = prev && (w.left < prev.right - slack || w.top >= prev.bottom - 1);
    if (!prev || wrapped) groups.push([w]);
    else band!.push(w);
  }

  const lines: InlineLine[] = groups.map((band) => {
    const segments: InlineSegment[] = [];
    band.forEach((w, wi) => {
      const owner = ownerIdx(w.owner);
      const spacer = wi > 0 && w.spaceBefore ? " " : "";
      const last = segments[segments.length - 1];
      if (last && last.owner === owner) last.text += `${spacer}${w.text}`;
      else segments.push({ text: `${spacer}${w.text}`, owner });
    });
    const left = Math.min(...band.map((w) => w.left));
    const top = Math.min(...band.map((w) => w.top));
    const rightEdge = Math.max(...band.map((w) => w.right));
    const bottomEdge = Math.max(...band.map((w) => w.bottom));
    return {
      text: segments.map((s) => s.text).join(""),
      segments,
      x: (left - origin.left) * sx,
      y: (top - origin.top) * sy,
      w: Math.max(1, (rightEdge - left) * sx),
      h: Math.max(1, (bottomEdge - top) * sy),
    };
  });
  return { lines, owners };
}
