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
/** Union rect of the measured lines (plus any folded-in styled fragments),
 *  with tracking slack on the wide edge. */
function bakedGeometry(
  run: TextRun,
  align: "left" | "center" | "right",
  extras: { x: number; y: number; w: number; h: number; chars: number; lineIdx: number }[] = [],
) {
  const lines = run.lines!;
  const rects: { x: number; y: number; w: number; h: number }[] = [...lines, ...extras];
  const left = Math.min(...rects.map((l) => l.x));
  const top = Math.min(...rects.map((l) => l.y));
  const measured = Math.max(...rects.map((l) => l.x + l.w)) - left;
  const tall = Math.max(...rects.map((l) => l.y + l.h)) - top;
  // `wrap="none"` means PowerPoint never re-breaks, but a metric difference can
  // still make a line marginally wider than the DOM measured it; the slack keeps
  // that from clipping, and centred / right copy shifts to stay anchored.
  // Tracking is applied after EVERY character in PowerPoint, so the allowance has
  // to scale with the longest baked line, not with a fixed couple of characters —
  // otherwise letter-spaced eyebrows and footers clip ("CONFIDENTIAL · INTERN…").
  const longest = Math.max(
    ...lines.map(
      (l, li) =>
        l.text.trim().length +
        extras.filter((e) => e.lineIdx === li).reduce((n, e) => n + e.chars + 1, 0),
    ),
    1,
  );
  const track = Math.max(0, run.letterSpacingPx) * (longest + 1);
  // Width FLOOR from the estimated tracked advance of the longest baked line: a
  // nowrap DOM line can be wider than the box that measured it, so the union rect
  // alone leaves the emitted box too narrow and the tail clips.
  const estPx = longest * run.fontSizePx * (run.bold ? 0.6 : 0.56) + track;
  const wide = Math.max(measured, estPx);
  const slack = 0.08 + inX(track) + inX(wide) * 0.03;
  const grow = inX(wide) + slack - inX(measured);
  const xShift = align === "center" ? grow / 2 : align === "right" ? grow : 0;
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
          // The DOM kept the whitespace (recorded as flags at extraction, since
          // run text is trimmed) or the fragments simply sit apart on the line.
          const rawSpace =
            prev.trailWs || run.leadWs || /\s$/.test(prev.text) || /^\s/.test(run.text);
          if (rawSpace || gap > em * 0.06) return { ...p, text: ` ${p.text}` };
        }
        return p;
      })
      .filter(Boolean) as NonNullable<ReturnType<typeof runProps>>[];
    if (!parts.length) return;

    // BAKED path — one measured line per run, no wrapping, measured pitch.
    // Styled single-line fragments folded onto a measured line (an italic tail
    // word, a coloured span) are emitted as sibling runs INSIDE that line's
    // paragraph, so they keep their own style yet can never float as a separate
    // box and collide with the baked line when PowerPoint's font metrics drift.
    if ((lead.lines?.length ?? 0) > 1 && block.runs.every((r, ri) => ri === 0 || r.singleLine)) {
      const lines = lead.lines!;
      const frags = block.runs.slice(1);
      const fragParts = frags.map((f) => runProps(f));
      if (fragParts.every(Boolean)) {
        type BakedPart = { text: string; options: Record<string, unknown> };
        const lineParts: BakedPart[] = [];
        const extras: {
          x: number;
          y: number;
          w: number;
          h: number;
          chars: number;
          lineIdx: number;
        }[] = [];
        const fragUsed = new Set<number>();
        lines.forEach((line, li) => {
          const leadOpts = { ...parts[0]!.options } as Record<string, unknown>;
          lineParts.push({ text: line.text.trim(), options: leadOpts });
          frags.forEach((f, fi) => {
            if (fragUsed.has(fi)) return;
            const mid = f.y + f.h / 2;
            if (mid < line.y - line.h * 0.5 || mid > line.y + line.h * 1.5) return;
            const p = fragParts[fi]!;
            const em = Math.max(lead.fontSizePx, f.fontSizePx);
            const gap = f.x - (line.x + line.w);
            const spacer =
              /\s$/.test(line.text) || /^\s/.test(f.text) ? "" : gap > em * 0.06 ? " " : "";
            lineParts.push({
              text: `${spacer}${p.text.trim()}`,
              options: { ...p.options } as Record<string, unknown>,
            });
            extras.push({
              x: f.x,
              y: f.y,
              w: f.w,
              h: f.h,
              chars: p.text.trim().length + (spacer ? 1 : 0),
              lineIdx: li,
            });
            fragUsed.add(fi);
          });
          lineParts[lineParts.length - 1]!.options.breakLine = li < lines.length - 1;
        });
        // A fragment that matched no line (geometry drift at capture) must not
        // be dropped: append it to the nearest line.
        frags.forEach((f, fi) => {
          if (fragUsed.has(fi)) return;
          const p = fragParts[fi]!;
          const mid = f.y + f.h / 2;
          let best = 0;
          let bestD = Infinity;
          lines.forEach((line, li) => {
            const d = Math.abs(mid - (line.y + line.h / 2));
            if (d < bestD) {
              bestD = d;
              best = li;
            }
          });
          lineParts.push({
            text: ` ${p.text.trim()}`,
            options: { ...p.options } as Record<string, unknown>,
          });
          extras.push({
            x: f.x,
            y: f.y,
            w: f.w,
            h: f.h,
            chars: p.text.trim().length + 1,
            lineIdx: best,
          });
        });

        slide.addText(lineParts, {
          ...bakedGeometry(lead, base.align, extras),
          align: base.align,
          valign: "top",
          lineSpacing: lead.linePitchPx
            ? Math.round(pxToPt(lead.linePitchPx) * 10) / 10
            : base.lineSpacing,
          margin: 0,
          inset: 0,
          // Tracked copy must wrap-enable its body: a no-wrap body is laid out at the
          // untracked width by some renderers and the tail of every line is clipped.
          // The geometry above carries the full tracking allowance, so the baked
          // breaks still survive.
          wrap: block.runs.some((r) => r.letterSpacingPx > 0),
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
