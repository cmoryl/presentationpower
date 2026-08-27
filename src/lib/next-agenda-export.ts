// -----------------------------------------------------------------------------
// NEXT division agenda — production export.
//
//   pdf/<name>.pdf          layered, PDF/X-4 press file (bleed + slug, crop marks)
//   ai/<name>.ai            Illustrator-openable twin of the press file
//   proof/<name>-proof.png  on-screen proof for sign-off
//   READ-ME.txt             geometry, colour and output notes
// -----------------------------------------------------------------------------

import JSZip from "jszip";

import { captureAssetCanvas } from "./asset-export";
import { buildAgendaVectorPdf } from "./agenda-vector-pdf";
import { buildAgendaDocx } from "./next-agenda-docx";

import {
  AGENDA_SPEC,
  agendaDivision,
  agendaFace,
  agendaGeometry,
  agendaName,
  agendaSlug,
  agendaStops,
  agendaStyleLabel,
  type AgendaConfig,
} from "./next-agenda";

const MM_TO_IN = 1 / 25.4;
const PROOF_PPI = 60;

export type AgendaExportProgress = { stage: "vector" | "proof" | "package"; label: string };

export type AgendaExportResult = {
  blob: Blob;
  filename: string;
  pdfBytes: number;
  layers: string[];
};

function readme(
  config: AgendaConfig,
  vector: Awaited<ReturnType<typeof buildAgendaVectorPdf>>,
  wordNotes: string[] = [],
): string {
  const geo = agendaGeometry(config);
  const qr = (config.qrData ?? "").trim();

  return [
    `TransPerfect NEXT — division agenda`,
    `Asset:           ${agendaName(config)}`,
    `Division area:   ${agendaDivision(config.divisionId).name}`,
    `Event:           ${config.eventLabel || "not assigned"}`,
    `Gradient:        ${agendaStyleLabel(config.styleId)} (${config.styleId})`,
    `Face:            ${agendaFace(config.face).name}`,
    ``,
    `Format:          ${geo.sizeName}`,
    `Medium:          ${geo.isScreen ? "screen (sRGB)" : "print"}`,
    geo.isScreen
      ? `Pixels:          ${geo.pxW} x ${geo.pxH} px — exported at 1:1, no bleed`
      : `Trim:            ${geo.trimW} x ${geo.trimH} mm`,
    geo.isScreen
      ? `Reference:       ${geo.trimW} x ${geo.trimH} mm at 96 ppi (layout reference only)`
      : `Bleed:           ${geo.bleedW} x ${geo.bleedH} mm (${geo.bleedEdge} mm per edge)`,
    `Safe area:       ${Math.round(geo.safeInset)} mm inside trim`,
    `Sessions:        ${config.sessions.length} rows`,
    `QR payload:      ${qr || "none"}`,
    `Colour:          convert to ${AGENDA_SPEC.colorMode} at output; body text 100K`,
    `Standard:        PDF/X-4 — GTS_PDF_X output intent with an embedded ${vector.pdfx.outputIntent}`,
    `Boxes:           MediaBox / BleedBox / TrimBox set numerically for preflight`,
    ``,
    `Artwork:         100% vector, layered — scales to any board size with no loss`,
    `Layers:          ${vector.layers.join(" · ")}`,
    `Lockup:          ${vector.lockupVector ? "vector paths (editable, single-colour)" : "high-resolution placed bitmap"}`,
    `Type:            live Geist text, font fully embedded — editable in Illustrator`,
    `QR code:         vector modules, ECC level H — no raster upscaling`,
    `Guides layer:    trim + safe guides sit on a non-printing layer`,
    ``,
    `pdf/    press file. Art runs to the bleed edge; crop marks sit in the slug.`,
    `ai/     the same layered artwork with an .ai extension for Illustrator.`,
    wordNotes.length
      ? `word/   editable Microsoft Word version — flattened approved ground behind live text.`
      : `word/   not included (Word build unavailable in this browser).`,
    geo.isScreen
      ? `screen/ ${geo.pxW} x ${geo.pxH} px sRGB PNG, ready to load on the display.`
      : `proof/  ${PROOF_PPI} ppi RGB proof for sign-off only. Never output from the proof.`,
    ``,
    ...(wordNotes.length ? ["Word file:", ...wordNotes.map((n) => `  - ${n}`), ``] : []),

    `Palette and geometry are fixed across every NEXT division area — only the`,
    `approved division lockup and the programme copy change.`,
  ].join("\n");
}

export async function exportAgendaSheet(opts: {
  node: HTMLElement;
  nativeWidth: number;
  nativeHeight: number;
  config: AgendaConfig;
  onProgress?: (p: AgendaExportProgress) => void;
}): Promise<AgendaExportResult> {
  const { node, nativeWidth, nativeHeight, config } = opts;
  const geo = agendaGeometry(config);
  const slug = agendaSlug(config);

  opts.onProgress?.({ stage: "vector", label: "Building the layered vector artwork" });
  const vector = await buildAgendaVectorPdf(config);
  const pdfBuffer = vector.bytes.buffer.slice(
    vector.bytes.byteOffset,
    vector.bytes.byteOffset + vector.bytes.byteLength,
  ) as ArrayBuffer;

  const screen = geo.isScreen;
  opts.onProgress?.({
    stage: "proof",
    label: screen ? `Rendering ${geo.pxW} × ${geo.pxH} px screen artwork` : "Rendering the proof PNG",
  });
  const wantPx = screen ? geo.pxW : geo.bleedW * MM_TO_IN * PROOF_PPI;
  const canvas = await captureAssetCanvas(
    { node, width: nativeWidth, height: nativeHeight, label: "NEXT division agenda" },
    { scale: Math.max(0.4, wantPx / nativeWidth), background: agendaStops(config.styleId, config.face, config.divisionId)[0]! },
  );
  const proofBlob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("proof render failed"))), "image/png");
  });

  opts.onProgress?.({ stage: "package", label: "Building the editable Word file" });
  const word = await buildAgendaDocx(config).catch(() => null);

  opts.onProgress?.({ stage: "package", label: "Packaging the zip" });
  const zip = new JSZip();
  zip.file(`pdf/${slug}.pdf`, pdfBuffer);
  zip.file(`ai/${slug}.ai`, pdfBuffer);
  if (word) {
    zip.file(`word/${slug}.docx`, await word.blob.arrayBuffer());
  }
  if (screen) {
    zip.file(`screen/${slug}-${geo.pxW}x${geo.pxH}.png`, await proofBlob.arrayBuffer());
  } else {
    zip.file(`proof/${slug}-proof.png`, await proofBlob.arrayBuffer());
  }
  zip.file("READ-ME.txt", readme(config, vector, word?.notes ?? []));


  const blob = await zip.generateAsync({ type: "blob" });

  return {
    blob,
    filename: `next-agenda-${slug}.zip`,
    pdfBytes: pdfBuffer.byteLength,
    layers: vector.layers,
  };
}
