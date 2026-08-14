// -----------------------------------------------------------------------------
// Text layout belongs to PowerPoint (EXPORT SPEC: delegated text layout)
//
// The measured text layer produces one record per DOM text node. Emitting one
// text box per record makes the renderer the layout engine, and it collided in
// two measurable ways:
//
//   FAULT A — two styles on one line ("The Module" navy bold + "Library" blue
//   italic) became two `<p:sp>` shapes at the same y with `wrap="none"`, the
//   second positioned from a DOM-measured width. Any font-metric difference
//   overlapped them.
//
//   FAULT B — a wrapped headline became a `wrap="square"` box plus a separate
//   `wrap="none"` box for the tail word, positioned from a predicted line
//   count, landing inside the first box's vertical span.
//
// Both are fixed by merging records BEFORE placement: same-line fragments become
// one text box with sibling runs, and continuation fragments become one wrapping
// box. PowerPoint then lays the line out, and the runs cannot collide by
// construction.
// -----------------------------------------------------------------------------

import type { TextRun } from "./export-text-layer";

export interface MergedTextBlock {
  /** Union geometry in stage pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Styled fragments, in reading order, emitted as sibling runs. */
  runs: TextRun[];
  /** True when PowerPoint must wrap (`wrap="square"`). */
  wrap: boolean;
}

const styleKey = (r: TextRun) =>
  [
    r.fontFamily,
    Math.round(r.fontSizePx),
    r.bold ? "b" : "",
    r.italic ? "i" : "",
    r.underline ? "u" : "",
    r.color,
    r.align,
    r.valign,
  ].join("|");

const right = (r: { x: number; w: number }) => r.x + r.w;
const bottom = (r: { y: number; h: number }) => r.y + r.h;

function vOverlapRatio(a: TextRun, b: TextRun): number {
  const top = Math.max(a.y, b.y);
  const bot = Math.min(bottom(a), bottom(b));
  const span = Math.min(a.h, b.h);
  return span > 0 ? Math.max(0, bot - top) / span : 0;
}

function hOverlapRatio(a: MergedTextBlock, b: MergedTextBlock): number {
  const left = Math.max(a.x, b.x);
  const rgt = Math.min(right(a), right(b));
  const span = Math.min(a.w, b.w);
  return span > 0 ? Math.max(0, rgt - left) / span : 0;
}

function blockOf(runs: TextRun[], wrap: boolean): MergedTextBlock {
  const x = Math.min(...runs.map((r) => r.x));
  const y = Math.min(...runs.map((r) => r.y));
  return {
    x,
    y,
    w: Math.max(...runs.map(right)) - x,
    h: Math.max(...runs.map(bottom)) - y,
    runs,
    wrap,
  };
}

/**
 * FAULT A — fragments that share a visual line. Adjacent (in DOM order) single
 * line runs sitting on the same baseline band, at a comparable size, with a
 * gap no wider than a space, are one line with mixed styling.
 */
function sameLine(a: TextRun, b: TextRun): boolean {
  if (!a.singleLine || !b.singleLine) return false;
  if (a.align !== b.align || a.valign !== b.valign) return false;
  const sizeRatio =
    Math.max(a.fontSizePx, b.fontSizePx) / Math.max(1, Math.min(a.fontSizePx, b.fontSizePx));
  if (sizeRatio > 1.35) return false;
  if (vOverlapRatio(a, b) < 0.6) return false;
  const gap = b.x - right(a);
  const em = Math.max(a.fontSizePx, b.fontSizePx);
  return gap <= em * 0.75 && gap >= -em * 0.35;
}

/**
 * FAULT B — a fragment that continues the SAME paragraph in the same style,
 * either on the next line or overlapping the paragraph box the renderer
 * pre-wrapped. One wrapping box replaces both.
 */
function continuation(a: MergedTextBlock, b: MergedTextBlock): boolean {
  if (a.runs.length !== 1 || b.runs.length !== 1) return false;
  const ra = a.runs[0]!;
  const rb = b.runs[0]!;
  if (styleKey(ra) !== styleKey(rb)) return false;
  if (hOverlapRatio(a, b) < 0.5) return false;
  const line = ra.lineHeightPx > 0 ? ra.lineHeightPx : ra.fontSizePx * 1.2;
  const gap = b.y - bottom(a);
  // Directly below (one line feed) or inside the pre-wrapped box's span.
  return gap <= line * 0.6 && b.y >= a.y - line * 0.2;
}

/**
 * Merge measured runs into the smallest set of text boxes that expresses the
 * same design, so PowerPoint owns line breaking and run placement.
 */
export function mergeTextRuns(runs: TextRun[]): MergedTextBlock[] {
  const usable = runs.filter((r) => r.text.trim());
  // Pass 1 — same-line runs.
  const lines: MergedTextBlock[] = [];
  let current: TextRun[] = [];
  for (const run of usable) {
    const prev = current[current.length - 1];
    if (prev && sameLine(prev, run)) current.push(run);
    else {
      if (current.length) lines.push(blockOf(current, !current[0]!.singleLine));
      current = [run];
    }
  }
  if (current.length) lines.push(blockOf(current, !current[0]!.singleLine));

  // Pass 2 — continuation fragments of one paragraph.
  const out: MergedTextBlock[] = [];
  for (const block of lines) {
    const prev = out[out.length - 1];
    if (prev && continuation(prev, block)) {
      const merged = blockOf([...prev.runs, ...block.runs], true);
      // One wrapping paragraph: a single run carrying the joined text.
      const head = merged.runs[0]!;
      merged.runs = [
        {
          ...head,
          text: merged.runs.map((r) => r.text.trim()).join(" "),
          x: merged.x,
          y: merged.y,
          w: merged.w,
          h: merged.h,
          singleLine: false,
        },
      ];
      out[out.length - 1] = merged;
      continue;
    }
    out.push(block);
  }
  return out;
}
