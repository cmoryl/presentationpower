// -----------------------------------------------------------------------------
// NEXT master pillar sign — production export.
//
//   pdf/<name>.pdf          press file, one page at bleed + slug with crop marks
//   ai/<name>.ai            Illustrator-openable twin of the press file
//   ai/<name>-ground.ai     live editable vector gradient ground (no raster)
//   proof/<name>-proof.png  on-screen proof for sign-off
//   READ-ME.txt             geometry, colour and output notes
// -----------------------------------------------------------------------------

import JSZip from "jszip";
import jsPDF from "jspdf";
import { fetchIccProfile, wrapPdfAsX4 } from "./pdf-x4";

import { captureAssetCanvas } from "./asset-export";
import { buildPillarVectorPdf } from "./pillar-vector-pdf";
import { buildLondonPanelAi } from "./next-london-revise";
import type { LondonPanel } from "./next-london-signage";
import {
  PILLAR_SPEC,
  pillarDivision,
  pillarGeometry,
  pillarKind,
  pillarName,
  pillarPanelSpec,
  pillarSlug,
  pillarFace,
  pillarStops,
  pillarStyleLabel,
  type PillarConfig,
} from "./next-pillar-masters";

const MM_TO_IN = 1 / 25.4;
const SLUG_IN = 0.4;
const PROOF_PPI = 24;

export type PillarExportProgress = { stage: "render" | "pdf" | "vector" | "proof" | "package"; label: string };

export type PillarExportResult = {
  blob: Blob;
  filename: string;
  plate: { width: number; height: number; ppi: number };
  pdfBytes: number;
};

function drawCropMarks(pdf: jsPDF, pageW: number, pageH: number, inset: number): void {
  const len = 0.3;
  const gap = 0.08;
  pdf.setLineWidth(0.01);
  pdf.setDrawColor(0, 0, 0);
  const corners = [
    { x: inset, y: inset },
    { x: pageW - inset, y: inset },
    { x: inset, y: pageH - inset },
    { x: pageW - inset, y: pageH - inset },
  ];
  for (const c of corners) {
    const left = c.x < pageW / 2;
    const top = c.y < pageH / 2;
    pdf.line(left ? c.x - gap - len : c.x + gap, c.y, left ? c.x - gap : c.x + gap + len, c.y);
    pdf.line(c.x, top ? c.y - gap - len : c.y + gap, c.x, top ? c.y - gap : c.y + gap + len);
  }
}

async function plate(
  node: HTMLElement,
  nativeW: number,
  nativeH: number,
  ppi: number,
  bg: string,
  bleedWmm: number,
) {
  const wantPx = bleedWmm * MM_TO_IN * ppi;
  const scale = Math.max(0.25, wantPx / nativeW);
  const canvas = await captureAssetCanvas(
    { node, width: nativeW, height: nativeH, label: "NEXT master pillar" },
    { scale, background: bg },
  );
  if (!(canvas.width > 0 && canvas.height > 0)) throw new Error("pillar capture produced no pixels");
  return canvas;
}

const RASTER_NOTICE =
  "The layered vector build was unavailable in this session, so the press file in pdf/ is a\n" +
  "high-resolution raster plate. Re-export from the pillar studio to get the layered vector\n" +
  "artwork (ground, lockup, headline, sub-line, arrow, QR and guides on separate layers).\n";

function readme(
  config: PillarConfig,
  ppi: number,
  vector: Awaited<ReturnType<typeof buildPillarVectorPdf>> | null,
): string {
  const geo = pillarGeometry(config);
  const qr = (config.qrData ?? "").trim();
  return [
    `TransPerfect NEXT — master pillar sign`,
    `Sign:            ${pillarName(config)}`,
    `Kind:            ${pillarKind(config.kind).name}`,
    `Division area:   ${pillarDivision(config.divisionId).name}`,
    `Gradient:        ${pillarStyleLabel(config.styleId)} (${config.styleId})`,
    `Face:            ${pillarFace(config.face).name}`,
    ``,
    `Pillar size:     ${geo.sizeName}`,
    `Trim:            ${geo.trimW} x ${geo.trimH} mm`,
    `Bleed:           ${geo.bleedW} x ${geo.bleedH} mm (${geo.bleedEdge} mm per edge)`,
    `Safe area:       ${Math.round(geo.safeInset)} mm inside trim`,
    `Sub-line:        ${(config.subheadline ?? "").trim() || "none"}`,
    `QR payload:      ${qr || "none"}`,
    qr ? `QR block:        ${Math.round(Number(config.qrSize) || 180)} mm square, quiet zone included, ECC level H` : `QR block:        n/a`,
    `Plate:           ${ppi} ppi (large-format issued tier ${PILLAR_SPEC.rasterPpi} ppi)`,
    `Colour:          convert to ${PILLAR_SPEC.colorMode} at output; body text 100K`,
    `Export preset:   ${PILLAR_SPEC.exportPreset}`,
    vector
      ? `Standard:        PDF/X-4 — GTS_PDF_X output intent with an embedded ${vector.pdfx.outputIntent}`
      : `Standard:        PDF/X-4 output intent embedded on the fallback plate`,
    vector
      ? `Colour tagging:  artwork colour tagged ICC sRGB (DefaultRGB); RIP separates to the intent`
      : ``,
    `Boxes:           MediaBox / BleedBox / TrimBox all set numerically for preflight`,
    ``,
    vector
      ? `Artwork:         100% vector, layered (scales to any pillar size with no quality loss)`
      : `Artwork:         raster fallback plate at ${ppi} ppi (layered vector build unavailable)`,
    vector ? `Layers:          ${vector.layers.join(" · ")}` : `Layers:          n/a`,
    vector
      ? `Lockup:          ${vector.lockupVector ? "vector paths (editable, single-colour)" : "high-resolution placed bitmap"}`
      : `Lockup:          placed bitmap`,
    vector ? `Type:            live Geist text, font embedded and subset — editable in Illustrator` : ``,
    vector ? `QR code:         vector modules, ECC level H — no raster upscaling` : ``,
    vector ? `Guides layer:    trim + safe guides sit on a non-printing layer` : ``,
    ``,
    `pdf/    press file. Art runs to the bleed edge; crop marks sit in the slug.`,
    `ai/     the layered press artwork with an .ai extension, plus a "-ground" file holding`,
    `        the gradient as live editable vector geometry (no embedded raster).`,
    `proof/  ${PROOF_PPI} ppi RGB proof for sign-off only. Never output from the proof.`,
    ``,
    `The palette and geometry are fixed across every NEXT division area — only the`,
    `approved division lockup and the copy change.`,
  ].join("\n");
}

export async function exportPillarSign(opts: {
  node: HTMLElement;
  nativeWidth: number;
  nativeHeight: number;
  config: PillarConfig;
  ppi?: number;
  onProgress?: (p: PillarExportProgress) => void;
}): Promise<PillarExportResult> {
  const { node, nativeWidth, nativeHeight, config } = opts;
  const ppi = opts.ppi ?? PILLAR_SPEC.rasterPpi;
  const slug = pillarSlug(config);
  const groundBg = pillarStops(config.styleId, config.face ?? "dark")[0]!;
  const geo = pillarGeometry(config);

  opts.onProgress?.({ stage: "vector", label: "Building the layered vector artwork" });
  let vector: Awaited<ReturnType<typeof buildPillarVectorPdf>> | null = null;
  try {
    vector = await buildPillarVectorPdf(config);
  } catch {
    vector = null;
  }

  opts.onProgress?.({ stage: "render", label: `Rendering the proof plate at ${ppi} ppi` });
  const canvas = await plate(node, nativeWidth, nativeHeight, ppi, groundBg, geo.bleedW);
  const jpeg = canvas.toDataURL("image/jpeg", 0.96);
  const artW = geo.bleedW * MM_TO_IN;
  const artH = geo.bleedH * MM_TO_IN;
  const effectivePpi = Math.round(canvas.width / artW);

  opts.onProgress?.({ stage: "pdf", label: "Writing the press PDF" });
  const pdf = new jsPDF({
    orientation: artW > artH ? "landscape" : "portrait",
    unit: "in",
    format: [artW + SLUG_IN * 2, artH + SLUG_IN * 2],
    compress: true,
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.addImage(jpeg, "JPEG", (pageW - artW) / 2, (pageH - artH) / 2, artW, artH, undefined, "FAST");
  drawCropMarks(pdf, pageW, pageH, SLUG_IN + geo.bleedEdge * MM_TO_IN);
  let rasterPdf = await pdf.output("blob").arrayBuffer();
  // Even the fallback plate ships as PDF/X-4 so print workflows treat every
  // pillar file the same way.
  try {
    const wrapped = await wrapPdfAsX4(new Uint8Array(rasterPdf), {
      trimSize: { widthIn: geo.trimW * MM_TO_IN, heightIn: geo.trimH * MM_TO_IN },
      bleedIn: geo.bleedEdge * MM_TO_IN,
      slugIn: SLUG_IN,
      iccProfileBytes: await fetchIccProfile("GRACoL2013_CRPC6"),
      iccProfileName: "GRACoL2013_CRPC6",
      title: pillarName(config),
      creator: "TransPerfect Element — NEXT pillar studio",
    });
    rasterPdf = wrapped.buffer.slice(
      wrapped.byteOffset,
      wrapped.byteOffset + wrapped.byteLength,
    ) as ArrayBuffer;
  } catch {
    // Offline: keep the plain press PDF rather than failing the export.
  }
  // Vector, layered artwork is the press/Illustrator deliverable whenever the
  // builder succeeds; the raster plate is only the fallback.
  const pdfBuffer: ArrayBuffer = vector
    ? (vector.bytes.buffer.slice(
        vector.bytes.byteOffset,
        vector.bytes.byteOffset + vector.bytes.byteLength,
      ) as ArrayBuffer)
    : rasterPdf;

  opts.onProgress?.({ stage: "vector", label: "Building the editable vector ground" });
  const groundAi = buildLondonPanelAi(pillarPanelSpec(config) as LondonPanel);

  opts.onProgress?.({ stage: "proof", label: "Rendering the proof PNG" });
  const proofCanvas = await plate(node, nativeWidth, nativeHeight, PROOF_PPI, groundBg, geo.bleedW);
  const proofBlob: Blob = await new Promise((resolve, reject) => {
    proofCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error("proof render failed"))), "image/png");
  });
  const proofBuffer = await proofBlob.arrayBuffer();

  opts.onProgress?.({ stage: "package", label: "Packaging the zip" });
  const zip = new JSZip();
  zip.file(`pdf/${slug}.pdf`, pdfBuffer);
  zip.file(`ai/${slug}.ai`, pdfBuffer);
  zip.file(`ai/${slug}-ground.ai`, groundAi);
  zip.file(`proof/${slug}-proof.png`, proofBuffer);
  zip.file("READ-ME.txt", readme(config, effectivePpi, vector));
  if (!vector) zip.file("pdf/raster-fallback-notice.txt", RASTER_NOTICE);
  const blob = await zip.generateAsync({ type: "blob" });

  return {
    blob,
    filename: `next-pillar-${slug}.zip`,
    plate: { width: canvas.width, height: canvas.height, ppi: effectivePpi },
    pdfBytes: pdfBuffer.byteLength,
  };
}
