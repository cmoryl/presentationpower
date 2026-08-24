// -----------------------------------------------------------------------------
// Event print delivery.
//
// Takes rendered signage nodes (one per venue spec) and produces the package a
// venue production team expects:
//
//   pdf/<item>.pdf   press PDF — one page at trim + bleed, art run to the bleed
//   ai/<item>.ai     Illustrator-openable twin of the same file
//   manifest.csv     every item: trim, bleed, safe, quantity, substrate, scale
//   READ-ME.txt      how to output, and what is supplied at reduced scale
//
// Capture path: each signage frame is rasterized at its NATIVE frame pixels
// (the preview transform is neutralized) and scaled up to the item's press DPI,
// then placed edge-to-edge on a page sized trim + bleed. Going through the
// asset capture helper — rather than the print-document exporter — is what keeps
// the artwork full-bleed: no preview card radius, no drop shadow, no page
// margin baked into the plate.
//
// About the .ai files: Illustrator's native format has been PDF-compatible for
// two decades, so a PDF stream written with an `.ai` extension opens, edits and
// separates in Illustrator. That is what we emit; we do not claim a
// reverse-engineered legacy .ai binary.
// -----------------------------------------------------------------------------

import JSZip from "jszip";
import jsPDF from "jspdf";
import { captureAssetCanvas } from "./asset-export";
import {
  MAX_PLATE_EDGE_PX,
  pressGeometryFor,
  type PressGeometry,
} from "./event-print-pipeline";
import type { EventPrintSpec } from "./event-spec-intake";

export type DeliveryItem = {
  spec: EventPrintSpec;
  /** The rendered signage frame in the DOM (a preview card is fine). */
  node: HTMLElement;
  /** Native frame size in px — the format the renderer drew at. */
  width: number;
  height: number;
};

export type DeliveryProgress = {
  done: number;
  total: number;
  label: string;
  stage: "render" | "pdf" | "package";
};

export type DeliveryFileReport = {
  spec: EventPrintSpec;
  geometry: PressGeometry;
  pdfBytes: number;
  aiBytes: number;
  /** Raster pixels actually captured for the plate. */
  plate: { width: number; height: number };
  /** True when the canvas ceiling forced a lower DPI than requested. */
  dpiClamped: boolean;
  effectiveDpi: number;
};

export type DeliveryResult = {
  blob: Blob;
  filename: string;
  files: DeliveryFileReport[];
  failures: Array<{ label: string; reason: string }>;
};

export type DeliveryOptions = {
  eventName: string;
  venue?: string;
  /** Emit `.ai` twins alongside the PDFs. Default true. */
  includeAi?: boolean;
  onProgress?: (p: DeliveryProgress) => void;
};

function slug(s: string, fallback = "item"): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || fallback
  );
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Preview chrome — the card radius and drop shadow the review grid draws — must
 * not print. Suppress it on the captured subtree, then restore.
 */
function suppressPreviewChrome(node: HTMLElement): () => void {
  const targets = [node, ...Array.from(node.querySelectorAll<HTMLElement>("*"))].filter((el) => {
    const cs = getComputedStyle(el);
    return cs.borderRadius !== "0px" || cs.boxShadow !== "none";
  });
  const saved = targets.map((el) => ({
    el,
    radius: el.style.borderRadius,
    shadow: el.style.boxShadow,
  }));
  for (const el of targets) {
    el.style.borderRadius = "0px";
    el.style.boxShadow = "none";
  }
  return () => {
    for (const s of saved) {
      s.el.style.borderRadius = s.radius;
      s.el.style.boxShadow = s.shadow;
    }
  };
}

/** Rasterize one signage frame at the DPI its press geometry asks for. */
async function platePng(
  item: DeliveryItem,
  geometry: PressGeometry,
): Promise<{ dataUrl: string; width: number; height: number; dpi: number; clamped: boolean }> {
  // Pixels needed across the full page (trim + bleed on both edges).
  const pageWidthIn = geometry.trimWidthIn + geometry.bleedIn * 2;
  const wantPx = pageWidthIn * geometry.fileDpi;
  let scale = wantPx / item.width;
  const longest = Math.max(item.width, item.height) * scale;
  const clamped = longest > MAX_PLATE_EDGE_PX + 1;
  if (clamped) scale = MAX_PLATE_EDGE_PX / Math.max(item.width, item.height);
  scale = Math.max(0.5, scale);

  // The review card scales the frame with a CSS transform on a wrapper; capture
  // the native-size frame itself so the artwork fills the plate.
  const frame =
    item.node.querySelector<HTMLElement>("[data-kit-asset-frame='true']") ?? item.node;
  const restore = suppressPreviewChrome(frame);
  try {
    const canvas = await captureAssetCanvas(
      { node: frame, width: item.width, height: item.height, label: item.spec.label },
      { scale, background: "#ffffff" },
    );
    if (!(canvas.width > 0 && canvas.height > 0)) throw new Error("capture produced no pixels");
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: canvas.width,
      height: canvas.height,
      dpi: Math.round(canvas.width / pageWidthIn),
      clamped,
    };
  } finally {
    restore();
  }
}

/** Standard corner crop marks drawn in the bleed margin. */
function drawCropMarks(pdf: jsPDF, pageW: number, pageH: number, bleed: number): void {
  if (bleed <= 0) return;
  const len = Math.min(0.25, bleed * 0.9);
  const gap = Math.min(0.05, bleed * 0.2);
  pdf.setLineWidth(0.005);
  pdf.setDrawColor(0, 0, 0);
  const corners = [
    { x: bleed, y: bleed },
    { x: pageW - bleed, y: bleed },
    { x: bleed, y: pageH - bleed },
    { x: pageW - bleed, y: pageH - bleed },
  ];
  for (const c of corners) {
    const left = c.x < pageW / 2;
    const top = c.y < pageH / 2;
    pdf.line(left ? c.x - gap - len : c.x + gap, c.y, left ? c.x - gap : c.x + gap + len, c.y);
    pdf.line(c.x, top ? c.y - gap - len : c.y + gap, c.x, top ? c.y - gap : c.y + gap + len);
  }
}

/** Clear margin outside the bleed so crop marks sit off the artwork. */
const SLUG_IN = 0.25;

async function pressPdf(item: DeliveryItem, geometry: PressGeometry) {
  const plate = await platePng(item, geometry);
  const artW = geometry.trimWidthIn + geometry.bleedIn * 2;
  const artH = geometry.trimHeightIn + geometry.bleedIn * 2;
  const pageW = artW + SLUG_IN * 2;
  const pageH = artH + SLUG_IN * 2;
  const pdf = new jsPDF({
    orientation: pageW >= pageH ? "landscape" : "portrait",
    unit: "in",
    format: [pageW, pageH],
    compress: true,
  });
  // jsPDF may normalize the page box (orientation, rounding), so place against
  // the page it actually created rather than the requested numbers.
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  // Art runs to the bleed edge, inset by the slug so the marks stay off it.
  const ox = (w - artW) / 2;
  const oy = (h - artH) / 2;
  pdf.addImage(plate.dataUrl, "JPEG", ox, oy, artW, artH, undefined, "FAST");
  drawCropMarks(pdf, w, h, geometry.bleedIn + SLUG_IN);
  const blob = pdf.output("blob");
  return { blob, plate };
}

function manifestCsv(opts: DeliveryOptions, files: DeliveryFileReport[], stamp: string): string {
  const head = [
    "Item",
    "File",
    "Trim (in)",
    "Trim (mm)",
    "Bleed (in)",
    "Safe (in)",
    "Supplied at",
    "Print at",
    "File DPI",
    "DPI at final size",
    "Qty",
    "Substrate",
    "Notes",
  ];
  const mm = (v: number) => Math.round(v * 25.4);
  const rows = files.map((f) =>
    [
      f.spec.label,
      `${slug(f.spec.label, f.spec.id)}.pdf`,
      `${f.geometry.trimWidthIn} × ${f.geometry.trimHeightIn}`,
      `${mm(f.geometry.trimWidthIn)} × ${mm(f.geometry.trimHeightIn)}`,
      f.geometry.bleedIn,
      f.spec.safeIn,
      `${Math.round(f.geometry.scale * 100)}%`,
      `${f.geometry.printAtPct}%`,
      f.effectiveDpi,
      Math.round(f.effectiveDpi * f.geometry.scale),
      f.spec.quantity,
      f.spec.substrate ?? "",
      f.spec.notes ?? "",
    ].map(csvCell),
  );
  return [
    `# ${opts.eventName}${opts.venue ? ` — ${opts.venue}` : ""}`,
    `# Generated ${stamp} · TransPerfect Element`,
    "",
    head.map(csvCell).join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\n");
}

function readme(opts: DeliveryOptions, files: DeliveryFileReport[], stamp: string): string {
  const scaled = files.filter((f) => f.geometry.scale < 1);
  return [
    `${opts.eventName}${opts.venue ? ` — ${opts.venue}` : ""}`,
    `Artwork package generated ${stamp} by TransPerfect Element.`,
    "",
    "CONTENTS",
    `  pdf/   ${files.length} press PDF${files.length === 1 ? "" : "s"} — one page each, art run to the bleed,`,
    "         crop marks in the bleed margin where a bleed was specified.",
    opts.includeAi === false
      ? "  (no .ai twins were requested)"
      : `  ai/    the same ${files.length} file${files.length === 1 ? "" : "s"} as Illustrator-openable .ai (PDF-compatible).`,
    "  manifest.csv  every item with trim, bleed, safe area, quantity, substrate and scale.",
    "",
    "GEOMETRY",
    "  Page = trim + bleed on all four sides. The trim sits one bleed width inside each edge.",
    "  Copy and logos are held inside the safe area listed per item in the manifest.",
    "",
    "OUTPUT",
    "  Each page carries a single composed plate at the DPI listed in the manifest, so what",
    "  you see is exactly what was approved — no font substitution or reflow at the printer.",
    "  Colour is supplied in brand RGB: do not auto-convert to CMYK. Use the approved brand",
    "  builds from the swatch sheet, and set any added body text to 100K.",
    "",
    "SCALE",
    scaled.length
      ? scaled
          .map(
            (f) =>
              `  ${f.spec.label}: supplied at ${Math.round(f.geometry.scale * 100)}% — print at ${f.geometry.printAtPct}% ` +
              `(final ${f.spec.widthIn}in × ${f.spec.heightIn}in, ${Math.round(f.effectiveDpi * f.geometry.scale)} DPI at size).`,
          )
          .join("\n")
      : "  Every file is supplied at 100% final size.",
    "",
    "QUESTIONS",
    "  Reply to the Element production thread for this event with the item name and file.",
    "",
  ].join("\n");
}

/** Render → PDF → package. One PDF (and optional .ai twin) per venue spec. */
export async function deliverEventPrintPackage(
  items: DeliveryItem[],
  opts: DeliveryOptions,
): Promise<DeliveryResult> {
  if (items.length === 0) throw new Error("deliverEventPrintPackage: no items to deliver");
  const includeAi = opts.includeAi !== false;
  const zip = new JSZip();
  const pdfDir = zip.folder("pdf")!;
  const aiDir = includeAi ? zip.folder("ai")! : null;

  const files: DeliveryFileReport[] = [];
  const failures: Array<{ label: string; reason: string }> = [];
  const used = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const geometry = pressGeometryFor(item.spec);
    opts.onProgress?.({ done: i, total: items.length, label: item.spec.label, stage: "pdf" });

    let base = slug(item.spec.label, item.spec.id);
    let n = 2;
    while (used.has(base)) base = `${slug(item.spec.label, item.spec.id)}-${n++}`;
    used.add(base);

    try {
      const { blob, plate } = await pressPdf(item, geometry);
      const bytes = await blob.arrayBuffer();
      if (bytes.byteLength === 0) throw new Error("the PDF writer returned an empty file");
      pdfDir.file(`${base}.pdf`, bytes);
      if (aiDir) aiDir.file(`${base}.ai`, bytes);
      files.push({
        spec: item.spec,
        geometry,
        pdfBytes: bytes.byteLength,
        aiBytes: aiDir ? bytes.byteLength : 0,
        plate: { width: plate.width, height: plate.height },
        dpiClamped: plate.clamped,
        effectiveDpi: plate.dpi,
      });
    } catch (err) {
      failures.push({
        label: item.spec.label,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
    opts.onProgress?.({ done: i + 1, total: items.length, label: item.spec.label, stage: "pdf" });
  }

  if (files.length === 0) {
    throw new Error(
      `No artwork could be generated. First failure: ${failures[0]?.reason ?? "unknown"}`,
    );
  }

  const stamp = `${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
  zip.file("manifest.csv", manifestCsv(opts, files, stamp));
  zip.file("READ-ME.txt", readme(opts, files, stamp));

  opts.onProgress?.({
    done: items.length,
    total: items.length,
    label: "Packaging",
    stage: "package",
  });
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return {
    blob,
    filename: `${slug(opts.eventName, "event")}-print-package.zip`,
    files,
    failures,
  };
}

/** Totals for the UI receipt. */
export function deliverySummary(result: DeliveryResult): {
  items: number;
  pdfBytes: number;
  aiBytes: number;
  clamped: number;
} {
  return result.files.reduce(
    (acc, f) => ({
      items: acc.items + 1,
      pdfBytes: acc.pdfBytes + f.pdfBytes,
      aiBytes: acc.aiBytes + f.aiBytes,
      clamped: acc.clamped + (f.dpiClamped ? 1 : 0),
    }),
    { items: 0, pdfBytes: 0, aiBytes: 0, clamped: 0 },
  );
}
