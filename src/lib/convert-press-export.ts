// -----------------------------------------------------------------------------
// Press-ready export for the cross-format adaptor (print targets).
//
// The adaptor's existing print download is a screen proof: a flat raster at
// screen-ish resolution. This adds the production side for every print target
// (A4 brief, case study, flyer, rack card, postcard, sell sheet, posters, table
// tent, roll-up banner):
//
//   pdf/<item>.pdf   press PDF at 300/600 DPI, trim + bleed, crop marks, and
//                    the copy re-drawn as embedded-Geist vector text on top of
//                    the raster so it is sharp, selectable and searchable.
//   ai/<item>.ai     the same bytes with an .ai extension — Illustrator's
//                    native format has been PDF-compatible for two decades, so
//                    this opens and edits in Illustrator. We do not claim a
//                    reverse-engineered legacy .ai binary.
//   manifest.csv     trim, bleed, DPI, colour space, source of the copy.
//   PRESS-READ-ME.txt  what the printer gets and the honest limits.
//
// Honesty contract: text is vector; artwork (grounds, photography, gradients)
// is a 300/600 DPI raster, not native vector objects. Colour is brand RGB —
// never auto-converted to CMYK. PDF/X-4 is opt-in and adds a real ICC output
// intent plus TrimBox/BleedBox. Anything we had to reduce (DPI on a very large
// banner) is reported back to the caller, never hidden.
// -----------------------------------------------------------------------------

import type { AdaptTarget } from "./cross-format-adapt";
import { exportPrintAssetAsPdf, type VectorTextReport } from "./print-asset-export";
import type { IccProfileKey } from "./pdf-x4";

export const MM_PER_IN = 25.4;

export type PressDelivery = "pdf" | "ai" | "zip";

export type PressExportOptions = {
  /** The rendered print page node (true trim size, may carry a preview scale). */
  node: HTMLElement;
  /** Trim size in inches — the adaptor target's own geometry. */
  trimIn: { width: number; height: number };
  /** Human label, used for filenames and the manifest. */
  label: string;
  quality?: "300dpi" | "600dpi";
  /** Bleed per edge, in millimetres. 0 = trim only, no crop marks. */
  bleedMm?: number;
  cropMarks?: boolean;
  /** Wrap as PDF/X-4 with an ICC output intent. */
  pdfX4?: boolean;
  iccProfile?: IccProfileKey;
  /** What to hand back: a single PDF, a single .ai, or the full pack. */
  deliver?: PressDelivery;
  /** Production context written into the manifest (source module, division…). */
  context?: Record<string, string | number | null>;
  onProgress?: (p: { progress: number; message: string }) => void;
};

export type PressExportResult = {
  blob: Blob;
  filename: string;
  bytes: number;
  /** Vector-text overlay diagnostics — 0 lines means raster-only text. */
  vector: VectorTextReport;
  /** DPI actually achieved, and whether the request had to be reduced. */
  effectiveDpi: number;
  requestedDpi: number;
  dpiClamped: boolean;
  clampReason: string;
  trimIn: { width: number; height: number };
  bleedMm: number;
  pdfX4: boolean;
};

export function pressSlug(label: string, fallback = "asset"): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || fallback
  );
}

/** Print targets only — social formats keep the digital/proof menus. */
export function isPressTarget(target: AdaptTarget): boolean {
  return target.medium === "print" && !!target.trimIn;
}

/**
 * Neutralize the preview's CSS scale for the duration of the capture. The
 * adaptor renders the page at true trim pixels and scales it down for display;
 * rasterizing the scaled node would bake the preview reduction into the plate.
 */
export function unscaleForCapture(node: HTMLElement): () => void {
  const saved: Array<{ el: HTMLElement; transform: string; origin: string; overflow: string }> = [
    {
      el: node,
      transform: node.style.transform,
      origin: node.style.transformOrigin,
      overflow: node.style.overflow,
    },
  ];
  node.style.transform = "none";
  node.style.transformOrigin = "top left";

  // The preview wraps the page in a clipping box sized to the SCALED page. At
  // full size the page overflows that box, and the vector-text pass treats any
  // line outside a clipping ancestor as trimmed away — which silently dropped
  // every line below the headline. Open the clips for the duration of the
  // capture so the whole page is measurable.
  let el: HTMLElement | null = node.parentElement;
  let hops = 0;
  while (el && hops < 12 && el !== document.body) {
    const cs = getComputedStyle(el);
    if (cs.overflow !== "visible" || cs.overflowY !== "visible" || cs.overflowX !== "visible") {
      saved.push({
        el,
        transform: el.style.transform,
        origin: el.style.transformOrigin,
        overflow: el.style.overflow,
      });
      el.style.overflow = "visible";
    }
    el = el.parentElement;
    hops += 1;
  }

  return () => {
    for (const s of saved) {
      s.el.style.transform = s.transform;
      s.el.style.transformOrigin = s.origin;
      s.el.style.overflow = s.overflow;
    }
  };
}

function manifestCsv(r: PressExportResult, label: string, stamp: string, base: string): string {
  const mm = (v: number) => Math.round(v * MM_PER_IN);
  const rows: Array<[string, string | number]> = [
    ["Item", label],
    ["File", `pdf/${base}.pdf`],
    ["Trim (mm)", `${mm(r.trimIn.width)} × ${mm(r.trimIn.height)}`],
    ["Trim (in)", `${r.trimIn.width.toFixed(2)} × ${r.trimIn.height.toFixed(2)}`],
    ["Bleed (mm per edge)", r.bleedMm],
    ["Requested DPI", r.requestedDpi],
    ["Effective DPI", Math.round(r.effectiveDpi)],
    ["Colour space", "RGB (brand) — do not auto-convert"],
    ["PDF/X-4", r.pdfX4 ? "yes" : "no"],
    ["Vector text lines", r.vector.linesDrawn],
    ["File size (bytes)", r.bytes],
    ["Generated", stamp],
  ];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return ["Field,Value", ...rows.map(([k, v]) => `${esc(k)},${esc(v)}`)].join("\n") + "\n";
}

function readme(
  r: PressExportResult,
  label: string,
  stamp: string,
  base: string,
  includeAi: boolean,
): string {
  const mm = (v: number) => Math.round(v * MM_PER_IN);
  return [
    label.trim() || "TransPerfect Element — press artwork",
    `Generated ${stamp} by TransPerfect Element (cross-format adaptor).`,
    "",
    "CONTENTS",
    `  pdf/${base}.pdf   one page at trim + bleed with crop marks in the bleed.`,
    includeAi
      ? `  ai/${base}.ai     the same file, Illustrator-openable (PDF-compatible).`
      : "  (no .ai twin was requested)",
    "  manifest.csv      trim, bleed, DPI, colour space and vector-text count.",
    "",
    "GEOMETRY",
    `  Trim  ${mm(r.trimIn.width)} × ${mm(r.trimIn.height)} mm`,
    `  Bleed ${r.bleedMm} mm per edge${r.bleedMm > 0 ? " — art runs to the bleed edge" : " — trim only"}`,
    "",
    "WHAT IS VECTOR AND WHAT IS NOT",
    `  Copy is drawn as embedded Geist vector text (${r.vector.linesDrawn} line${r.vector.linesDrawn === 1 ? "" : "s"}), so it is sharp at`,
    "  any size, selectable and searchable. Backgrounds, photography and gradients are a",
    `  ${Math.round(r.effectiveDpi)} DPI raster composed from the approved layout — not native vector objects.`,
    r.dpiClamped
      ? `  NOTE: ${r.requestedDpi} DPI could not be honoured at this size (${r.clampReason}); the plate was` +
        `\n  written at ~${Math.round(r.effectiveDpi)} DPI. Large-format work is normally viewed from 2 m or more,` +
        "\n  but check with your printer before output."
      : "  The requested resolution was honoured in full.",
    "",
    "COLOUR",
    "  Supplied in brand RGB. Do not auto-convert to CMYK — use the approved brand builds",
    "  and set any added body text to 100K.",
    r.pdfX4
      ? "  This file is wrapped as PDF/X-4 with a real ICC output intent and TrimBox/BleedBox."
      : "  No PDF/X-4 output intent is attached. Turn PDF/X-4 on if your printer requires it.",
    "",
  ].join("\n");
}

/**
 * Build a press-ready file (or pack) from a rendered adaptor print page.
 * Throws with a plain-language message when the PDF writer produces nothing.
 */
export async function exportConvertPress(opts: PressExportOptions): Promise<PressExportResult> {
  const quality = opts.quality ?? "300dpi";
  const bleedMm = Math.max(0, opts.bleedMm ?? 3);
  const deliver = opts.deliver ?? "zip";
  const base = pressSlug(opts.label);
  const requestedDpi = quality === "600dpi" ? 600 : 300;

  let pdfBlob: Blob | null = null;
  let vector: VectorTextReport = {
    enabled: true,
    linesDrawn: 0,
    trackedLinesLines: 0,
    fontResources: [],
    rasterBytes: 0,
    finalBytes: 0,
    skippedClamped: 0,
  };
  let effectiveDpi = requestedDpi;
  let dpiClamped = false;
  let clampReason = "";

  const restore = unscaleForCapture(opts.node);
  try {
    await exportPrintAssetAsPdf(opts.node, {
      pageSize: "Custom",
      custom: { widthIn: opts.trimIn.width, heightIn: opts.trimIn.height },
      bleedIn: bleedMm / MM_PER_IN,
      cropMarks: opts.cropMarks !== false && bleedMm > 0,
      quality,
      format: opts.pdfX4 ? "press-x4" : "press",
      iccProfile: opts.pdfX4 ? (opts.iccProfile ?? "GRACoL2013_CRPC6") : undefined,
      vectorText: true,
      mode: "light",
      filename: `${base}.pdf`,
      download: false,
      onBlob: (b) => {
        pdfBlob = b;
      },
      onVectorTextReport: (r) => {
        vector = r;
      },
      onQualityClamp: (info) => {
        dpiClamped = true;
        effectiveDpi = info.effectiveDpi;
        clampReason = info.reason;
      },
      onProgress: (p) =>
        opts.onProgress?.({ progress: p.progress ?? 0, message: p.message ?? "Working…" }),
    });
  } finally {
    restore();
  }

  const pdf = pdfBlob as Blob | null;
  if (!pdf || pdf.size === 0) {
    throw new Error("The press file came back empty — nothing was written.");
  }

  const result: PressExportResult = {
    blob: pdf,
    filename: `${base}-press-${Math.round(effectiveDpi)}dpi.pdf`,
    bytes: pdf.size,
    vector,
    effectiveDpi,
    requestedDpi,
    dpiClamped,
    clampReason,
    trimIn: opts.trimIn,
    bleedMm,
    pdfX4: !!opts.pdfX4,
  };

  if (deliver === "pdf") return result;

  if (deliver === "ai") {
    return {
      ...result,
      blob: new Blob([await pdf.arrayBuffer()], { type: "application/postscript" }),
      filename: `${base}-press-${Math.round(effectiveDpi)}dpi.ai`,
    };
  }

  opts.onProgress?.({ progress: 0.97, message: "Packaging the press files…" });
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const bytes = await pdf.arrayBuffer();
  const stamp = `${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
  zip.folder("pdf")!.file(`${base}.pdf`, bytes);
  zip.folder("ai")!.file(`${base}.ai`, bytes);
  const withContext = [
    manifestCsv(result, opts.label, stamp, base),
    ...(opts.context
      ? [
          "",
          "Context,Value",
          ...Object.entries(opts.context)
            .filter(([, v]) => v !== null && v !== "")
            .map(([k, v]) => `${k},${String(v).replace(/,/g, " ")}`),
        ]
      : []),
  ].join("\n");
  zip.file("manifest.csv", withContext);
  zip.file("PRESS-READ-ME.txt", readme(result, opts.label, stamp, base, true));
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return {
    ...result,
    blob,
    filename: `${base}-press-pack-${Math.round(effectiveDpi)}dpi.zip`,
    bytes: blob.size,
  };
}
