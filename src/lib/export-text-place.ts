// -----------------------------------------------------------------------------
// Native placement of measured text runs
//
// The layered export captures a plate from the REAL renderer with the glyphs
// made invisible, then re-emits the measured text as native PowerPoint text
// boxes. Because the geometry, size, weight, spacing and colour are all read
// off the settled DOM, the exported copy matches the build exactly instead of
// the approximations the hand-written module renderers produced.
//
// Runs are merged first (`export-text-merge.ts`): several styles on one line
// become sibling runs inside ONE box, and a pre-wrapped paragraph becomes ONE
// wrapping box. PowerPoint owns line layout, so two fragments of one line can
// never collide from a font-metric difference.
// -----------------------------------------------------------------------------

import { describeTextRun } from "./pptx-text-props";
import type { TextRun } from "./export-text-layer";
import { inX, inY, pxToPt } from "./pptx-text-props";
import { mergeTextRuns, type MergedTextBlock } from "./export-text-merge";

export interface TextPlacementTarget {
  addText: (text: unknown, opts: Record<string, unknown>) => unknown;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Per-run character properties for a multi-run paragraph. */
function runProps(run: TextRun) {
  const p = describeTextRun(run);
  if (!p) return null;
  return {
    text: p.text,
    options: {
      fontSize: p.fontSize,
      fontFace: p.fontFace,
      bold: p.bold,
      italic: p.italic,
      underline: p.underline ? { style: "sng" } : undefined,
      color: p.color,
      transparency: p.transparency,
      charSpacing: p.charSpacing,
    },
  };
}

/**
 * BAKED LINES — a paragraph the browser broke across several lines is emitted as
 * one run per measured line with explicit breaks and `wrap="none"`, so
 * PowerPoint reproduces the build's line breaks instead of re-flowing the
 * paragraph with its own font metrics (the single biggest visual difference
 * between the on-screen slide and the exported one).
 */
function bakedLineParts(run: TextRun, props: NonNullable<ReturnType<typeof runProps>>) {
  const lines = run.lines ?? [];
  return lines
    .map((l) => l.text.trim())
    .filter(Boolean)
    .map((text, i) => ({
      text,
      options: { ...props.options, breakLine: i < lines.length - 1 },
    }));
}

/** Union rect of the measured lines, with tracking slack on the wide edge. */
function bakedGeometry(run: TextRun, align: "left" | "center" | "right") {
  const lines = run.lines!;
  const left = Math.min(...lines.map((l) => l.x));
  const top = Math.min(...lines.map((l) => l.y));
  const wide = Math.max(...lines.map((l) => l.x + l.w)) - left;
  const tall = Math.max(...lines.map((l) => l.y + l.h)) - top;
  // `wrap="none"` means PowerPoint never re-breaks, but a metric difference can
  // still make a line marginally wider than the DOM measured it; the slack keeps
  // that from clipping, and centred / right copy shifts to stay anchored.
  const slack = 0.08 + inX(Math.max(0, run.letterSpacingPx) * 2);
  const xShift = align === "center" ? slack / 2 : align === "right" ? slack : 0;
  return {
    x: r3(Math.max(0, inX(left) - xShift)),
    y: r3(inY(top)),
    w: r3(inX(wide) + slack),
    h: r3(inY(tall) + 0.04),
  };
}

/**
 * Emit every merged block onto a pptxgenjs slide. Boxes get zero inset so the
 * text lands on the same pixel as the plate it replaces.
 */
export function placeTextRuns(
  slide: TextPlacementTarget,
  runs: TextRun[],
  opts?: { objectNamePrefix?: string },
): number {
  const blocks: MergedTextBlock[] = mergeTextRuns(runs);
  let placed = 0;
  blocks.forEach((block, i) => {
    const lead = block.runs[0]!;
    const base = describeTextRun(lead);
    if (!base) return;
    // Sibling runs on one visual line: each measured DOM node is trimmed, so a
    // real word gap between two styled fragments ("New" + "prospect") would be
    // lost and PowerPoint would render "Newprospect". Re-insert one space when
    // the runs were separated on screen.
    const parts = block.runs
      .map((run, ri) => {
        const p = runProps(run);
        if (!p) return null;
        const prev = block.runs[ri - 1];
        if (prev) {
          const gap = run.x - (prev.x + prev.w);
          const em = Math.max(prev.fontSizePx, run.fontSizePx);
          if (gap > em * 0.06) return { ...p, text: ` ${p.text}` };
        }
        return p;
      })
      .filter(Boolean) as NonNullable<ReturnType<typeof runProps>>[];
    if (!parts.length) return;

    // BAKED path — one measured line per run, no wrapping, measured pitch.
    if (block.runs.length === 1 && (lead.lines?.length ?? 0) > 1) {
      const lineParts = bakedLineParts(lead, parts[0]!);
      if (lineParts.length > 1) {
        slide.addText(lineParts, {
          ...bakedGeometry(lead, base.align),
          align: base.align,
          valign: "top",
          lineSpacing: lead.linePitchPx
            ? Math.round(pxToPt(lead.linePitchPx) * 10) / 10
            : base.lineSpacing,
          margin: 0,
          inset: 0,
          wrap: false,
          shrinkText: false,
          isTextBox: true,
          objectName: `${opts?.objectNamePrefix ?? "TP Text"} ${i + 1}`,
        });
        placed += 1;
        return;
      }
    }

    // Single-run blocks keep the exact box `describeTextRun` computed (it
    // carries the tracking slack allowance); merged blocks use the union rect.
    const geometry =
      block.runs.length === 1
        ? { x: base.x, y: base.y, w: base.w, h: base.h }
        : {
            x: r3(Math.max(0, inX(block.x))),
            y: r3(inY(block.y)),
            w: r3(inX(block.w) + 0.06),
            h: r3(inY(block.h) + 0.02),
          };

    slide.addText(parts.length === 1 ? parts[0]!.text : parts, {
      ...geometry,
      ...(parts.length === 1 ? parts[0]!.options : {}),
      align: base.align,
      valign: base.valign,
      lineSpacing: base.lineSpacing,
      margin: 0,
      inset: 0,
      wrap: block.wrap || block.runs.length > 1 ? true : base.wrap,
      shrinkText: false,
      isTextBox: true,
      objectName: `${opts?.objectNamePrefix ?? "TP Text"} ${i + 1}`,
    });
    placed += 1;
  });
  return placed;
}
