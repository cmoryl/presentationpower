// -----------------------------------------------------------------------------
// Layered-editable capture for PRINT pages
//
// The print exporter used to ship one flattened JPEG per page: visually right,
// but nothing in PowerPoint was selectable. Decks already export layered —
// a design-exact plate carrying only the paint OOXML cannot describe, with every
// measured box, picture, rule and text run re-emitted as native objects on top.
//
// This module reuses that exact pipeline for print pages. The only difference is
// the coordinate space: a deck measures into 1920x1080 (13.333in x 7.5in at
// 144 px/in), a print page measures into `trim inches * 144`, so the shared
// px -> inch / px -> pt conversions stay one constant and land on real inches of
// the trim box.
//
// Live DOM safety: deck plates are captured from a throwaway offscreen stage, so
// hiding text and neutralising paint is free. Print pages are the REAL editor
// DOM, so every inline style we touch is snapshotted and restored afterwards.
// -----------------------------------------------------------------------------

import { captureSlideAsDataUrl } from "./slide-image-export";
import { withExportChrome } from "./export-chrome-suppress";
import { spaceForTrim } from "./export-space";
import type { DomShape } from "./export-dom-decompose";
import type { TextRun } from "./export-text-layer";
import type { PrintMode } from "./print-assets.types";

export interface PrintPageLayers {
  /** Design plate: every designed pixel EXCEPT what shipped as a native object. */
  plate: string;
  shapes: DomShape[];
  runs: TextRun[];
}

/** Snapshot + restore inline styles, so the live editor DOM is never mutated. */
function styleSnapshot(root: HTMLElement): () => void {
  const targets: Element[] = [root, ...Array.from(root.querySelectorAll("*"))];
  const saved = targets.map((el) => [el, el.getAttribute("style")] as const);
  return () => {
    for (const [el, style] of saved) {
      if (style === null) el.removeAttribute("style");
      else el.setAttribute("style", style);
    }
  };
}

/** Shift measured geometry by a letterbox offset, in stage px. */
function shift<T extends { x: number; y: number }>(items: T[], dx: number, dy: number): T[] {
  if (dx === 0 && dy === 0) return items;
  return items.map((it) => ({ ...it, x: it.x + dx, y: it.y + dy }));
}

/**
 * Measure one print page into native objects + a design plate.
 *
 * `space` is the measurement space in stage px (trim inches x 144). `offsetPx`
 * shifts every emitted object by the letterbox offset the slide uses, so shapes
 * and text sit exactly on the plate.
 */
export async function capturePrintPageLayers(
  node: HTMLElement,
  opts: {
    space: { w: number; h: number };
    offsetPx?: { x: number; y: number };
    mode?: PrintMode;
    targetWidth: number;
  },
): Promise<PrintPageLayers | null> {
  const [textLayer, dom] = await Promise.all([
    import("./export-text-layer"),
    import("./export-dom-decompose"),
  ]);

  const restore = styleSnapshot(node);
  try {
    const { runs, nodes } = textLayer.extractTextRuns(node, opts.space);
    const measured = dom.decomposeStage(node, { space: opts.space, planes: "self" });

    // Inline pictures BEFORE neutralising: anything that cannot embed has to
    // stay on the plate rather than vanish from both layers.
    const droppedNodes: Element[] = [];
    const resolved = await dom.resolveShapeImages(measured, droppedNodes);
    const shapes = dom.keepBackgroundPaintOnPlate(
      dom.pruneOccludingPaint(
        resolved,
        [...droppedNodes, ...dom.platedPaintRoots(node)],
        dom.surfacePaintRoots(node),
      ),
      opts.space,
    );

    textLayer.hideTextRuns(nodes);
    dom.neutralizeCapturedPaint(shapes);
    // Two frames so the browser has settled the neutralised paint before capture.
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const plate = await withExportChrome(() =>
      captureSlideAsDataUrl(node, {
        mode: opts.mode ?? "light",
        targetWidth: opts.targetWidth,
        cacheBust: true,
        readyTimeoutMs: 9000,
      }),
    );
    if (!plate) return null;

    const dx = opts.offsetPx?.x ?? 0;
    const dy = opts.offsetPx?.y ?? 0;
    return {
      plate,
      shapes: shift(
        shapes.map(({ node: _node, ...rest }) => rest as DomShape),
        dx,
        dy,
      ),
      runs: shift(runs, dx, dy),
    };
  } catch (err) {
    console.error("[print-pptx] layered capture failed for one page", err);
    return null;
  } finally {
    restore();
  }
}

export { spaceForTrim };
