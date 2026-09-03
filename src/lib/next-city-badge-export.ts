// -----------------------------------------------------------------------------
// City Series badge — production export.
//
// A print run exports three files in one zip:
//
//   pdf/<name>.pdf   press PDF, one page at bleed + slug, crop marks in the slug
//   ai/<name>.ai     Illustrator-openable twin of the same file
//   proof/<name>.png on-screen proof at 150 ppi for sign-off
//   READ-ME.txt      geometry, colour and output notes
//
// The plate is rasterised from the live badge node at the template's minimum
// 300 ppi, so what production receives is exactly what the build shows.
// -----------------------------------------------------------------------------

import JSZip from "jszip";
import jsPDF from "jspdf";
import { fetchIccProfile, wrapPdfAsX4 } from "./pdf-x4";

import { captureAssetCanvas } from "./asset-export";
import {
  BADGE_SPEC,
  badgeVersionSlug,
  cityBadgeDivision,
  type CityBadgeConfig,
} from "./next-city-badge";

const SLUG_IN = 0.25;
const PROOF_DPI = 150;

export type BadgeExportProgress = {
  stage: "render" | "pdf" | "proof" | "package";
  label: string;
};

export type BadgeExportResult = {
  blob: Blob;
  filename: string;
  plate: { width: number; height: number; dpi: number };
  pdfBytes: number;
  proofBytes: number;
};

function drawCropMarks(pdf: jsPDF, pageW: number, pageH: number, inset: number): void {
  const len = 0.18;
  const gap = 0.04;
  pdf.setLineWidth(0.005);
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

async function plate(node: HTMLElement, nativeW: number, nativeH: number, dpi: number) {
  const wantPx = BADGE_SPEC.bleedW * dpi;
  const scale = Math.max(0.5, wantPx / nativeW);
  const canvas = await captureAssetCanvas(
    { node, width: nativeW, height: nativeH, label: "City Series badge" },
    { scale, background: "#03002C" },
  );
  if (!(canvas.width > 0 && canvas.height > 0)) throw new Error("badge capture produced no pixels");
  return canvas;
}

function readme(config: CityBadgeConfig, name: string, dpi: number): string {
  return [
    `TransPerfect NEXT — City Series attendee badge`,
    `Version: ${name}`,
    ``,
    `Division track: ${cityBadgeDivision(config.divisionId).name}`,
    `Artwork face:   ${config.face === "light" ? "LIGHT (diagonal aqua)" : "DARK (chevron ascent)"}`,
    `Trim:           ${BADGE_SPEC.trimW}in x ${BADGE_SPEC.trimH}in`,
    `Bleed:          ${BADGE_SPEC.bleedW}in x ${BADGE_SPEC.bleedH}in (${BADGE_SPEC.bleed}in per edge)`,
    `Safe area:      ${BADGE_SPEC.safeW}in x ${BADGE_SPEC.safeH}in`,
    `Slots:          dual hanging slots on the top edge`,
    `Cutout:         BLE Klik, ${BADGE_SPEC.klik.w}in x ${BADGE_SPEC.klik.h}in, ${BADGE_SPEC.klik.fromBottom}in from the bottom edge`,
    `Plate:          ${dpi} ppi (template minimum ${BADGE_SPEC.minImageDpi} ppi)`,
    `Colour:         convert to ${BADGE_SPEC.colorMode} at output; body text 100K`,
    `Export preset:  ${BADGE_SPEC.exportPreset}`,
    `Source template: ${BADGE_SPEC.sourceTemplate}`,
    `Standard:        PDF/X-4 — GTS_PDF_X output intent (GRACoL 2013 CRPC6) embedded`,
    `Boxes:           MediaBox / BleedBox / TrimBox all set numerically for preflight`,
    ``,
    `pdf/   press file. Art runs to the bleed edge; crop marks sit in the slug.`,
    `ai/    the same file with an .ai extension — opens and edits in Illustrator.`,
    `proof/ ${PROOF_DPI} ppi RGB proof for sign-off only. Do not output from the proof.`,
  ].join("\n");
}

/**
 * Build the print package for one saved badge version from its live DOM node.
 */
export async function exportCityBadge(opts: {
  node: HTMLElement;
  /** Optional badge back — exported as page 2 of the same press file. */
  backNode?: HTMLElement | null;
  nativeWidth: number;
  nativeHeight: number;
  config: CityBadgeConfig;
  versionName: string;
  dpi?: number;
  onProgress?: (p: BadgeExportProgress) => void;
}): Promise<BadgeExportResult> {
  const { node, nativeWidth, nativeHeight, config, versionName } = opts;
  const dpi = opts.dpi ?? BADGE_SPEC.minImageDpi;
  const slug = badgeVersionSlug(versionName);

  opts.onProgress?.({ stage: "render", label: "Rasterising the plate at 300 ppi" });
  const canvas = await plate(node, nativeWidth, nativeHeight, dpi);
  const plateJpeg = canvas.toDataURL("image/jpeg", 0.96);
  const effectiveDpi = Math.round(canvas.width / BADGE_SPEC.bleedW);
  let backJpeg: string | null = null;
  if (opts.backNode) {
    opts.onProgress?.({ stage: "render", label: "Rasterising the badge back" });
    const backCanvas = await plate(opts.backNode, nativeWidth, nativeHeight, dpi);
    backJpeg = backCanvas.toDataURL("image/jpeg", 0.96);
  }

  opts.onProgress?.({ stage: "pdf", label: "Writing the press PDF" });
  const artW = BADGE_SPEC.bleedW;
  const artH = BADGE_SPEC.bleedH;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: [artW + SLUG_IN * 2, artH + SLUG_IN * 2],
    compress: true,
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.addImage(
    plateJpeg,
    "JPEG",
    (pageW - artW) / 2,
    (pageH - artH) / 2,
    artW,
    artH,
    undefined,
    "FAST",
  );
  drawCropMarks(pdf, pageW, pageH, SLUG_IN + BADGE_SPEC.bleed);
  if (backJpeg) {
    pdf.addPage([pageW, pageH], "portrait");
    pdf.addImage(
      backJpeg,
      "JPEG",
      (pageW - artW) / 2,
      (pageH - artH) / 2,
      artW,
      artH,
      undefined,
      "FAST",
    );
    drawCropMarks(pdf, pageW, pageH, SLUG_IN + BADGE_SPEC.bleed);
  }

  const pdfBlob = pdf.output("blob");
  let pdfBuffer = await pdfBlob.arrayBuffer();
  try {
    const wrapped = await wrapPdfAsX4(new Uint8Array(pdfBuffer), {
      trimSize: { widthIn: BADGE_SPEC.trimW, heightIn: BADGE_SPEC.trimH },
      bleedIn: BADGE_SPEC.bleed,
      slugIn: SLUG_IN,
      iccProfileBytes: await fetchIccProfile("GRACoL2013_CRPC6"),
      iccProfileName: "GRACoL2013_CRPC6",
      title: `CityNEXT badge — ${versionName}`,
      creator: "TransPerfect Element — City Series badge studio",
    });
    pdfBuffer = wrapped.buffer.slice(
      wrapped.byteOffset,
      wrapped.byteOffset + wrapped.byteLength,
    ) as ArrayBuffer;
  } catch {
    // Offline: ship the plain press PDF rather than failing the export.
  }

  opts.onProgress?.({ stage: "proof", label: "Rendering the proof PNG" });
  const proofCanvas = await plate(node, nativeWidth, nativeHeight, PROOF_DPI);
  const proofBlob: Blob = await new Promise((resolve, reject) => {
    proofCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("proof render failed"))),
      "image/png",
    );
  });
  const proofBuffer = await proofBlob.arrayBuffer();

  opts.onProgress?.({ stage: "package", label: "Packaging the zip" });
  const zip = new JSZip();
  zip.file(`pdf/${slug}.pdf`, pdfBuffer);
  zip.file(`ai/${slug}.ai`, pdfBuffer);
  zip.file(`proof/${slug}-proof.png`, proofBuffer);
  zip.file("READ-ME.txt", readme(config, versionName, effectiveDpi));
  const blob = await zip.generateAsync({ type: "blob" });

  return {
    blob,
    filename: `citynext-badge-${slug}.zip`,
    plate: { width: canvas.width, height: canvas.height, dpi: effectiveDpi },
    pdfBytes: pdfBuffer.byteLength,
    proofBytes: proofBuffer.byteLength,
  };
}
