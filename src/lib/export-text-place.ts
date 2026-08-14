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
import { inX, inY } from "./pptx-text-props";
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
    const parts = block.runs.map(runProps).filter(Boolean) as NonNullable<
      ReturnType<typeof runProps>
    >[];
    if (!parts.length) return;

    // Single-run blocks keep the exact box `describeTextRun` computed (it
    // carries the tracking slack allowance); merged blocks use the union rect.
    const merged = block.runs.length > 1;
    // A merged block that does not wrap is one visual line: widen it so foreign
    // font metrics cannot clip the tail. Wrapping blocks keep the measured width
    // so PowerPoint breaks the lines where the build did.
    const cushion = merged && !block.wrap ? Math.max(0.14, inX(block.w) * 0.22) : 0;
    const geometry = !merged
      ? { x: base.x, y: base.y, w: base.w, h: base.h }
      : {
          x: r3(Math.max(0, inX(block.x))),
          y: r3(inY(block.y)),
          w: r3(inX(block.w) + 0.06 + cushion),
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
