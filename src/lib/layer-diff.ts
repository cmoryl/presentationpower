// -----------------------------------------------------------------------------
// Layered vs. previous (flat) export — visual diff
//
// The layered export path drops ONE decor-only plate (gradients, glass, seams,
// masks) and re-emits everything else — tiles, rules, icons, logos, photos,
// text — as native PowerPoint objects. The previous path flattened the whole
// design into a single plate.
//
// That means the pixels that differ between the two plates are exactly the
// pixels the layered export must supply as editable objects. This module makes
// that testable:
//
//   1. raster the FLAT plate (the previous export's appearance = the build)
//   2. raster the DECOR-ONLY plate (the layered export's background)
//   3. diff them → "content mask": every pixel the layered path owes as an object
//   4. read the object rectangles out of the produced .pptx object tree
//   5. any masked cell no object rectangle covers = a MISSING editable layer
//
// The pure functions below are DOM-free so they can be unit tested; the browser
// entry point (`compareLayeredExport`) wires them to the real rasterizer and the
// real exporter.
// -----------------------------------------------------------------------------

import { STAGE_H, STAGE_W } from "./export-quality";

/** Diff canvas: small enough to be fast, big enough to catch a missing icon. */
export const DIFF_W = 480;
export const DIFF_H = Math.round((DIFF_W * STAGE_H) / STAGE_W);
/** Coverage grid cell size in diff pixels (8px ≈ 32px on the 1920 stage). */
export const CELL = 8;
/**
 * Summed RGBA delta that counts as "designed content". Deliberately well above
 * soft-gradient drift between the two plates: only crisp content (type, icons,
 * tiles, rules, photography edges) should register, otherwise a background
 * vignette reads as a missing layer.
 */
export const PIXEL_THRESHOLD = 48;
/** Ignore specks: a cell must hold this share of changed pixels to count. */
export const CELL_FILL_RATIO = 0.2;

const EMU_PER_IN = 914400;

export interface ObjectRect {
  kind: "shape" | "picture";
  /** Normalized 0..1 against the slide box. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Slide size in EMU from ppt/presentation.xml, defaulting to a 16:9 10in slide. */
export function parseSlideSize(presentationXml: string): { cx: number; cy: number } {
  const m = /<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/.exec(presentationXml);
  if (!m) return { cx: 10 * EMU_PER_IN, cy: 5.625 * EMU_PER_IN };
  return { cx: Number(m[1]), cy: Number(m[2]) };
}

/**
 * Every independently selectable object on the slide, as normalized rects.
 * A full-bleed picture (the decor plate, or a flattened export) is reported
 * like any other object — callers decide what to do with it.
 */
export function parseObjectRects(
  slideXml: string,
  slideSize: { cx: number; cy: number },
): ObjectRect[] {
  const out: ObjectRect[] = [];
  const blocks: Array<[ObjectRect["kind"], RegExp]> = [
    ["shape", /<p:sp\b[\s\S]*?<\/p:sp>/g],
    ["picture", /<p:pic\b[\s\S]*?<\/p:pic>/g],
  ];
  for (const [kind, re] of blocks) {
    for (const block of slideXml.match(re) ?? []) {
      const off = /<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/.exec(block);
      const ext = /<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/.exec(block);
      if (!off || !ext) continue;
      out.push({
        kind,
        x: Number(off[1]) / slideSize.cx,
        y: Number(off[2]) / slideSize.cy,
        w: Number(ext[1]) / slideSize.cx,
        h: Number(ext[2]) / slideSize.cy,
      });
    }
  }
  return out;
}

/** A rect that covers (almost) the whole slide — i.e. a plate, not content. */
export function isFullBleed(r: ObjectRect): boolean {
  return r.w >= 0.97 && r.h >= 0.97 && r.x <= 0.02 && r.y <= 0.02;
}

/**
 * Per-pixel mask (1 = differs) between two same-sized RGBA buffers.
 * Alpha is folded in so a transparent decor plate region counts as a change.
 */
export function diffMask(
  a: Uint8ClampedArray | Uint8Array,
  b: Uint8ClampedArray | Uint8Array,
  threshold = PIXEL_THRESHOLD,
): Uint8Array {
  const n = Math.min(a.length, b.length) / 4;
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    const p = i * 4;
    const d =
      Math.abs(a[p] - b[p]) +
      Math.abs(a[p + 1] - b[p + 1]) +
      Math.abs(a[p + 2] - b[p + 2]) +
      Math.abs(a[p + 3] - b[p + 3]);
    mask[i] = d > threshold ? 1 : 0;
  }
  return mask;
}

export interface CoverageCell {
  /** Cell column/row on the CELL grid. */
  cx: number;
  cy: number;
  /** Changed-pixel share inside the cell, 0..1. */
  fill: number;
  covered: boolean;
}

export interface CoverageResult {
  cells: CoverageCell[];
  /** Cells holding designed content the layered export must own. */
  contentCells: number;
  /** Content cells no native object covers — these are the regressions. */
  uncoveredCells: number;
  /** uncoveredCells / contentCells, 0 when there is no content. */
  gapRatio: number;
}

/**
 * Bucket the diff mask into cells and mark each content cell as covered when a
 * non-full-bleed object rectangle overlaps its centre.
 */
export function coverageFromMask(
  mask: Uint8Array,
  rects: ObjectRect[],
  width = DIFF_W,
  height = DIFF_H,
  cell = CELL,
  fillRatio = CELL_FILL_RATIO,
): CoverageResult {
  const content = rects.filter((r) => !isFullBleed(r) && r.w > 0 && r.h > 0);
  const cells: CoverageCell[] = [];
  let contentCells = 0;
  let uncoveredCells = 0;
  for (let cy = 0; cy * cell < height; cy += 1) {
    for (let cx = 0; cx * cell < width; cx += 1) {
      let changed = 0;
      let total = 0;
      for (let y = cy * cell; y < Math.min(height, (cy + 1) * cell); y += 1) {
        for (let x = cx * cell; x < Math.min(width, (cx + 1) * cell); x += 1) {
          total += 1;
          changed += mask[y * width + x];
        }
      }
      const fill = total ? changed / total : 0;
      if (fill < fillRatio) continue;
      // Sample the cell centre in normalized slide space.
      const nx = (cx * cell + cell / 2) / width;
      const ny = (cy * cell + cell / 2) / height;
      const covered = content.some(
        (r) => nx >= r.x && nx <= r.x + r.w && ny >= r.y && ny <= r.y + r.h,
      );
      contentCells += 1;
      if (!covered) uncoveredCells += 1;
      cells.push({ cx, cy, fill, covered });
    }
  }
  return {
    cells,
    contentCells,
    uncoveredCells,
    gapRatio: contentCells ? uncoveredCells / contentCells : 0,
  };
}

/** Uncovered share above which the module is reported as a missing-layer regression. */
export const GAP_FAIL_RATIO = 0.08;

export interface LayerDiffResult {
  variantId: string;
  mode: "light" | "dark";
  /** Data URL of the previous (flat) export appearance. */
  flatPlate: string | null;
  /** Data URL of the layered export's decor-only background plate. */
  decorPlate: string | null;
  /** Data URL of the heatmap: covered content green, uncovered magenta. */
  diffOverlay: string | null;
  shapes: number;
  pictures: number;
  textRuns: number;
  coverage: CoverageResult | null;
  ok: boolean;
  problems: string[];
  error?: string;
}

// ── Browser-only wiring ──────────────────────────────────────────────────────

async function pixelsFromDataUrl(dataUrl: string): Promise<Uint8ClampedArray> {
  const img = new Image();
  img.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("plate failed to decode"));
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = DIFF_W;
  canvas.height = DIFF_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, DIFF_W, DIFF_H);
  ctx.drawImage(img, 0, 0, DIFF_W, DIFF_H);
  return ctx.getImageData(0, 0, DIFF_W, DIFF_H).data;
}

/** Heatmap PNG: flat plate dimmed, content cells tinted by coverage verdict. */
export function renderDiffOverlay(flatPixels: Uint8ClampedArray, coverage: CoverageResult): string {
  const canvas = document.createElement("canvas");
  canvas.width = DIFF_W;
  canvas.height = DIFF_H;
  const ctx = canvas.getContext("2d")!;
  const img = new ImageData(new Uint8ClampedArray(flatPixels), DIFF_W, DIFF_H);
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(0, 0, DIFF_W, DIFF_H);
  for (const c of coverage.cells) {
    ctx.fillStyle = c.covered ? "rgba(16,150,90,0.34)" : "rgba(236,56,138,0.78)";
    ctx.fillRect(c.cx * CELL, c.cy * CELL, CELL, CELL);
  }
  return canvas.toDataURL("image/png");
}

/**
 * Full visual diff for one module × mode: rasterize both export appearances,
 * export the real layered .pptx, and report which designed regions lost their
 * editable object.
 */
export async function compareLayeredExport(args: {
  variantId: string;
  mode: "light" | "dark";
  buildDeck: (variantId: string) => { deck: unknown; brand: unknown; slide: unknown; variant: unknown };
}): Promise<LayerDiffResult> {
  const base: LayerDiffResult = {
    variantId: args.variantId,
    mode: args.mode,
    flatPlate: null,
    decorPlate: null,
    diffOverlay: null,
    shapes: 0,
    pictures: 0,
    textRuns: 0,
    coverage: null,
    ok: false,
    problems: [],
  };
  try {
    const built = args.buildDeck(args.variantId);
    const [{ rasterizeExactSlide }, { exportDeckToPptx }, JSZip] = await Promise.all([
      import("./slide-exact-raster"),
      import("./pptx-export"),
      import("jszip").then((m) => m.default),
    ]);

    const plateArgs = {
      slide: built.slide,
      variant: built.variant as never,
      brand: built.brand as never,
      mode: args.mode,
      pageNumber: 1,
      quality: "standard" as const,
    };
    const flatPlate = await rasterizeExactSlide({ ...plateArgs });
    const decorPlate = await rasterizeExactSlide({ ...plateArgs, decorOnly: true });
    if (!flatPlate) base.problems.push("flat plate failed to rasterize");
    if (!decorPlate) base.problems.push("decor plate failed to rasterize");

    const res = await exportDeckToPptx(built.deck as never, built.brand as never, {
      output: "blob",
      forceMode: args.mode,
      fidelity: "layered",
    });
    if (!res.blob) {
      return { ...base, flatPlate, decorPlate, problems: [...base.problems, "no blob returned"] };
    }
    const zip = await JSZip.loadAsync(await res.blob.arrayBuffer());
    const slideXml = (await zip.file("ppt/slides/slide1.xml")?.async("string")) ?? "";
    const presXml = (await zip.file("ppt/presentation.xml")?.async("string")) ?? "";
    const rects = parseObjectRects(slideXml, parseSlideSize(presXml));
    const shapes = rects.filter((r) => r.kind === "shape").length;
    const pictures = rects.filter((r) => r.kind === "picture").length;
    const textRuns = (slideXml.match(/<a:t>/g) ?? []).length;

    let coverage: CoverageResult | null = null;
    let diffOverlay: string | null = null;
    if (flatPlate && decorPlate) {
      const flatPx = await pixelsFromDataUrl(flatPlate);
      const decorPx = await pixelsFromDataUrl(decorPlate);
      coverage = coverageFromMask(diffMask(flatPx, decorPx), rects);
      diffOverlay = renderDiffOverlay(flatPx, coverage);
      if (coverage.contentCells === 0) {
        base.problems.push("decor plate is identical to the flat plate — nothing was layered out");
      } else if (coverage.gapRatio > GAP_FAIL_RATIO) {
        base.problems.push(
          `${coverage.uncoveredCells}/${coverage.contentCells} designed regions have no editable object`,
        );
      }
    }
    if (shapes === 0) base.problems.push("no native shapes in the object tree");
    if (textRuns === 0) base.problems.push("no native text runs in the object tree");

    return {
      ...base,
      flatPlate,
      decorPlate,
      diffOverlay,
      shapes,
      pictures,
      textRuns,
      coverage,
      ok: base.problems.length === 0,
      problems: base.problems,
    };
  } catch (err) {
    return {
      ...base,
      problems: [...base.problems, "threw"],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
