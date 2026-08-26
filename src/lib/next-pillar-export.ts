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

import { captureAssetCanvas } from "./asset-export";
import { buildLondonPanelAi } from "./next-london-revise";
import type { LondonPanel } from "./next-london-signage";
import {
  PILLAR_SPEC,
  pillarDivision,
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

async function plate(node: HTMLElement, nativeW: number, nativeH: number, ppi: number, bg: string) {
  const wantPx = PILLAR_SPEC.bleedW * MM_TO_IN * ppi;
  const scale = Math.max(0.25, wantPx / nativeW);
  const canvas = await captureAssetCanvas(
    { node, width: nativeW, height: nativeH, label: "NEXT master pillar" },
    { scale, background: bg },
  );
  if (!(canvas.width > 0 && canvas.height > 0)) throw new Error("pillar capture produced no pixels");
  return canvas;
}

function readme(config: PillarConfig, ppi: number): string {
  return [
    `TransPerfect NEXT — master pillar sign`,
    `Sign:            ${pillarName(config)}`,
    `Kind:            ${pillarKind(config.kind).name}`,
    `Division area:   ${pillarDivision(config.divisionId).name}`,
    `Gradient:        ${pillarStyleLabel(config.styleId)} (${config.styleId})`,
    `Face:            ${pillarFace(config.face).name}`,
    ``,
    `Trim:            ${PILLAR_SPEC.trimW} x ${PILLAR_SPEC.trimH} mm`,
    `Bleed:           ${PILLAR_SPEC.bleedW} x ${PILLAR_SPEC.bleedH} mm (${PILLAR_SPEC.bleedEdge} mm per edge)`,
    `Safe area:       ${PILLAR_SPEC.safeInset} mm inside trim`,
    `Plate:           ${ppi} ppi (large-format issued tier ${PILLAR_SPEC.rasterPpi} ppi)`,
    `Colour:          convert to ${PILLAR_SPEC.colorMode} at output; body text 100K`,
    `Export preset:   ${PILLAR_SPEC.exportPreset}`,
    ``,
    `pdf/    press file. Art runs to the bleed edge; crop marks sit in the slug.`,
    `ai/     the press file with an .ai extension, plus a "-ground" file holding`,
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

  opts.onProgress?.({ stage: "render", label: `Rasterising the plate at ${ppi} ppi` });
  const canvas = await plate(node, nativeWidth, nativeHeight, ppi, groundBg);
  const jpeg = canvas.toDataURL("image/jpeg", 0.96);
  const artW = PILLAR_SPEC.bleedW * MM_TO_IN;
  const artH = PILLAR_SPEC.bleedH * MM_TO_IN;
  const effectivePpi = Math.round(canvas.width / artW);

  opts.onProgress?.({ stage: "pdf", label: "Writing the press PDF" });
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: [artW + SLUG_IN * 2, artH + SLUG_IN * 2],
    compress: true,
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.addImage(jpeg, "JPEG", (pageW - artW) / 2, (pageH - artH) / 2, artW, artH, undefined, "FAST");
  drawCropMarks(pdf, pageW, pageH, SLUG_IN + PILLAR_SPEC.bleedEdge * MM_TO_IN);
  const pdfBuffer = await pdf.output("blob").arrayBuffer();

  opts.onProgress?.({ stage: "vector", label: "Building the editable vector ground" });
  const groundAi = buildLondonPanelAi(pillarPanelSpec(config) as LondonPanel);

  opts.onProgress?.({ stage: "proof", label: "Rendering the proof PNG" });
  const proofCanvas = await plate(node, nativeWidth, nativeHeight, PROOF_PPI, groundBg);
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
  zip.file("READ-ME.txt", readme(config, effectivePpi));
  const blob = await zip.generateAsync({ type: "blob" });

  return {
    blob,
    filename: `next-pillar-${slug}.zip`,
    plate: { width: canvas.width, height: canvas.height, ppi: effectivePpi },
    pdfBytes: pdfBuffer.byteLength,
  };
}
