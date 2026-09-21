// -----------------------------------------------------------------------------
// High-resolution print & production proof exporter.
//
// Digital exports (PNG/JPG/WebP at native pixels) stay where they are. This adds
// the production side: render a DOM asset at a true print resolution (300 DPI by
// default), optionally extend the sheet by a bleed margin, optionally draw crop
// marks outside the trim, and always write a proof metadata sheet next to the
// artwork.
//
// Honesty contract: anything rasterised from the DOM is a PROOF, not a press
// master. The metadata says so in plain words, and the filename carries it.
// -----------------------------------------------------------------------------

export const PROOF_DPI_OPTIONS = [150, 200, 300, 400] as const;
export type ProofDpi = (typeof PROOF_DPI_OPTIONS)[number];

/** CSS reference resolution — 96 px per inch. */
export const CSS_DPI = 96;
export const MM_PER_IN = 25.4;

export type ProofOptions = {
  dpi: ProofDpi;
  /** Bleed on every edge, in millimetres. 0 = trim only. */
  bleedMm: number;
  /** Draw crop (trim) marks in the bleed area. Requires bleedMm > 0. */
  cropMarks: boolean;
  /** Paper/base colour painted under the artwork. */
  paper?: string;
  /** JPEG quality when the caller asks for jpg. */
  quality?: number;
};

export const DEFAULT_PROOF_OPTIONS: ProofOptions = {
  dpi: 300,
  bleedMm: 3,
  cropMarks: true,
  paper: "#ffffff",
};

export type ProofGeometry = {
  dpi: ProofDpi;
  /** Capture scale over CSS pixels. */
  scale: number;
  /** Trim size. */
  trimIn: { width: number; height: number };
  trimPx: { width: number; height: number };
  /** Bleed per edge. */
  bleedIn: number;
  bleedPx: number;
  /** Sheet = trim + bleed on all four edges. */
  sheetIn: { width: number; height: number };
  sheetPx: { width: number; height: number };
  cropMarks: boolean;
  /** Crop-mark length / gap from trim, in device px. */
  markLenPx: number;
  markGapPx: number;
  markWeightPx: number;
  /** True when the requested DPI had to be reduced to stay inside canvas limits. */
  downscaled: boolean;
  requestedDpi: ProofDpi;
};

/** Browsers refuse canvases above this edge; we reduce DPI instead of failing. */
export const MAX_PROOF_EDGE = 12000;

export function proofGeometry(
  cssWidth: number,
  cssHeight: number,
  opts: ProofOptions,
): ProofGeometry {
  if (!(cssWidth > 0 && cssHeight > 0)) {
    throw new Error("proofGeometry: asset CSS size is required");
  }
  const trimIn = { width: cssWidth / CSS_DPI, height: cssHeight / CSS_DPI };
  const bleedIn = Math.max(0, opts.bleedMm) / MM_PER_IN;
  const sheetIn = {
    width: trimIn.width + bleedIn * 2,
    height: trimIn.height + bleedIn * 2,
  };

  let dpi = opts.dpi;
  let downscaled = false;
  const longestIn = Math.max(sheetIn.width, sheetIn.height);
  while (longestIn * dpi > MAX_PROOF_EDGE) {
    const next = PROOF_DPI_OPTIONS.filter((d) => d < dpi).pop();
    if (!next) break;
    dpi = next;
    downscaled = true;
  }

  const px = (inches: number) => Math.round(inches * dpi);
  return {
    dpi,
    requestedDpi: opts.dpi,
    downscaled,
    scale: dpi / CSS_DPI,
    trimIn,
    trimPx: { width: px(trimIn.width), height: px(trimIn.height) },
    bleedIn,
    bleedPx: px(bleedIn),
    sheetIn,
    // Composed from the trim so the sheet is exactly trim + bleed on all four
    // edges — independent rounding would leave a 1 px sliver of paper.
    sheetPx: {
      width: px(trimIn.width) + px(bleedIn) * 2,
      height: px(trimIn.height) + px(bleedIn) * 2,
    },
    cropMarks: opts.cropMarks && bleedIn > 0,
    markLenPx: Math.max(6, Math.round(0.125 * dpi)),
    markGapPx: Math.max(2, Math.round(0.0625 * dpi)),
    markWeightPx: Math.max(1, Math.round(dpi / 600)),
  };
}

export type ProofMetadata = {
  document: string;
  exportedAt: string;
  fidelity: "proof";
  note: string;
  colourSpace: "RGB";
  dpi: number;
  requestedDpi: number;
  trim: { inches: string; mm: string; px: string };
  bleed: { mm: number; px: number };
  sheet: { inches: string; mm: string; px: string };
  cropMarks: boolean;
  paper: string;
  /** Optional production context the caller knows about. */
  context?: Record<string, string | number | null>;
};

const round = (n: number, p = 2) => Number(n.toFixed(p));

export function buildProofMetadata(
  document: string,
  geo: ProofGeometry,
  opts: ProofOptions,
  context?: Record<string, string | number | null>,
): ProofMetadata {
  const size = (w: number, h: number) => ({
    inches: `${round(w)} × ${round(h)} in`,
    mm: `${round(w * MM_PER_IN, 1)} × ${round(h * MM_PER_IN, 1)} mm`,
    px: `${Math.round(w * geo.dpi)} × ${Math.round(h * geo.dpi)} px`,
  });
  return {
    document,
    exportedAt: new Date().toISOString(),
    fidelity: "proof",
    note: "Rasterised from the live layout at print resolution. This is a production proof for checking position, copy and colour direction — it is not a press master. Press masters keep their copy as outlined vector paths.",
    colourSpace: "RGB",
    dpi: geo.dpi,
    requestedDpi: geo.requestedDpi,
    trim: size(geo.trimIn.width, geo.trimIn.height),
    bleed: { mm: round(opts.bleedMm, 2), px: geo.bleedPx },
    sheet: size(geo.sheetIn.width, geo.sheetIn.height),
    cropMarks: geo.cropMarks,
    paper: opts.paper ?? "#ffffff",
    context,
  };
}

export function proofMetadataText(meta: ProofMetadata): string {
  const lines = [
    "PRODUCTION PROOF",
    "================",
    `Document      ${meta.document}`,
    `Exported      ${meta.exportedAt}`,
    `Resolution    ${meta.dpi} DPI${meta.dpi !== meta.requestedDpi ? ` (requested ${meta.requestedDpi} DPI — reduced to stay inside browser canvas limits)` : ""}`,
    `Colour space  ${meta.colourSpace}`,
    `Trim          ${meta.trim.mm}  ·  ${meta.trim.inches}  ·  ${meta.trim.px}`,
    `Bleed         ${meta.bleed.mm} mm per edge (${meta.bleed.px} px)`,
    `Sheet         ${meta.sheet.mm}  ·  ${meta.sheet.px}`,
    `Crop marks    ${meta.cropMarks ? "yes — drawn outside the trim" : "no"}`,
    `Paper base    ${meta.paper}`,
    "",
    "WHAT THIS IS",
    meta.note,
  ];
  if (meta.context) {
    lines.push("", "CONTEXT");
    for (const [k, v] of Object.entries(meta.context)) {
      if (v === null || v === "") continue;
      lines.push(`${k.padEnd(13)} ${v}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function proofFileBase(label: string, geo: ProofGeometry, opts: ProofOptions): string {
  const slug =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "asset";
  const bleed = opts.bleedMm > 0 ? `-bleed${round(opts.bleedMm, 1)}mm` : "";
  const marks = geo.cropMarks ? "-crop" : "";
  return `${slug}-proof-${geo.dpi}dpi${bleed}${marks}`;
}

/** Paint crop marks into the bleed area of an already-composed sheet canvas. */
export function drawCropMarks(
  ctx: CanvasRenderingContext2D,
  geo: ProofGeometry,
  colour = "#03002C",
): void {
  if (!geo.cropMarks) return;
  const { bleedPx, markLenPx, markGapPx, markWeightPx } = geo;
  const w = geo.sheetPx.width;
  const h = geo.sheetPx.height;
  const len = Math.min(markLenPx, Math.max(1, bleedPx - markGapPx));
  if (len <= 0) return;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = markWeightPx;
  const seg = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  const left = bleedPx;
  const right = w - bleedPx;
  const top = bleedPx;
  const bottom = h - bleedPx;
  // horizontal marks (left/right of the trim box, at top and bottom corners)
  for (const y of [top, bottom]) {
    seg(left - bleedPx, y, left - markGapPx, y);
    seg(right + markGapPx, y, right + bleedPx, y);
  }
  // vertical marks
  for (const x of [left, right]) {
    seg(x, top - bleedPx, x, top - markGapPx);
    seg(x, bottom + markGapPx, x, bottom + bleedPx);
  }
  ctx.restore();
}

export type ProofTarget = {
  node: HTMLElement;
  /** Native CSS pixel size of the asset (its trim). */
  width: number;
  height: number;
  label: string;
};

export type ProofResult = {
  blob: Blob;
  filename: string;
  geometry: ProofGeometry;
  metadata: ProofMetadata;
};

/**
 * Render one asset as a high-resolution proof.
 *
 * `format: "zip"` bundles the image with its metadata sheet; "pdf" writes a
 * single page sized to the sheet (trim + bleed) in inches.
 */
export async function exportPrintProof(
  target: ProofTarget,
  opts: ProofOptions = DEFAULT_PROOF_OPTIONS,
  format: "png" | "jpg" | "pdf" | "zip" = "png",
  context?: Record<string, string | number | null>,
): Promise<ProofResult> {
  const geo = proofGeometry(target.width, target.height, opts);
  const meta = buildProofMetadata(target.label, geo, opts, context);
  const { captureAssetCanvas } = await import("@/lib/asset-export");

  const art = await captureAssetCanvas(
    { node: target.node, width: target.width, height: target.height, label: target.label },
    { scale: geo.scale, background: opts.paper },
  );

  // Compose onto the full sheet: paper, artwork centred at trim, crop marks.
  const sheet = document.createElement("canvas");
  sheet.width = geo.sheetPx.width;
  sheet.height = geo.sheetPx.height;
  const ctx = sheet.getContext("2d");
  if (!ctx) throw new Error("exportPrintProof: 2D canvas context unavailable");
  ctx.fillStyle = opts.paper ?? "#ffffff";
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  if (geo.bleedPx > 0) {
    // Edge-extend the artwork into the bleed so no paper shows after trimming.
    ctx.drawImage(art, 0, 0, art.width, 1, geo.bleedPx, 0, geo.trimPx.width, geo.bleedPx);
    ctx.drawImage(
      art,
      0,
      art.height - 1,
      art.width,
      1,
      geo.bleedPx,
      geo.sheetPx.height - geo.bleedPx,
      geo.trimPx.width,
      geo.bleedPx,
    );
    ctx.drawImage(art, 0, 0, 1, art.height, 0, geo.bleedPx, geo.bleedPx, geo.trimPx.height);
    ctx.drawImage(
      art,
      art.width - 1,
      0,
      1,
      art.height,
      geo.sheetPx.width - geo.bleedPx,
      geo.bleedPx,
      geo.bleedPx,
      geo.trimPx.height,
    );
  }
  ctx.drawImage(art, geo.bleedPx, geo.bleedPx, geo.trimPx.width, geo.trimPx.height);
  drawCropMarks(ctx, geo);

  const base = proofFileBase(target.label, geo, opts);
  const quality = opts.quality ?? 0.95;

  if (format === "pdf") {
    const { default: jsPDF } = await import("jspdf");
    const orientation = geo.sheetIn.width >= geo.sheetIn.height ? "landscape" : "portrait";
    const pdf = new jsPDF({
      orientation,
      unit: "in",
      format: [geo.sheetIn.width, geo.sheetIn.height],
      compress: true,
    });
    pdf.addImage(
      sheet.toDataURL("image/jpeg", quality),
      "JPEG",
      0,
      0,
      geo.sheetIn.width,
      geo.sheetIn.height,
      undefined,
      "FAST",
    );
    pdf.setProperties({ title: target.label, subject: proofMetadataText(meta).slice(0, 500) });
    const blob = pdf.output("blob");
    if (blob.size === 0) throw new Error("exportPrintProof: empty PDF");
    return { blob, filename: `${base}.pdf`, geometry: geo, metadata: meta };
  }

  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  const image = await new Promise<Blob>((resolve, reject) => {
    sheet.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("exportPrintProof: canvas.toBlob returned null"))),
      mime,
      format === "jpg" ? quality : undefined,
    );
  });
  if (image.size === 0) throw new Error("exportPrintProof: empty image");

  if (format === "zip") {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const folder = zip.folder(base)!;
    folder.file(`${base}.png`, image);
    folder.file("proof-metadata.json", JSON.stringify(meta, null, 2));
    folder.file("PROOF-READ-ME.txt", proofMetadataText(meta));
    const blob = await zip.generateAsync({ type: "blob" });
    return { blob, filename: `${base}.zip`, geometry: geo, metadata: meta };
  }

  return {
    blob: image,
    filename: `${base}.${format}`,
    geometry: geo,
    metadata: meta,
  };
}
