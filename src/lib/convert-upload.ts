// -----------------------------------------------------------------------------
// Upload a finished artwork file into the cross-format adapter.
//
// Accepted sources:
//   · Illustrator (.ai) — modern .ai files are PDF-compatible, so they are
//     read as PDF server-side.
//   · Canva exports — Canva has no open file format; "Download → PDF Print"
//     or "Download → PPTX" from Canva produces a .pdf / .pptx we can read.
//   · PDF, PowerPoint, Word, Excel — text extracted server-side.
//   · SVG — text read client-side from <text> nodes (no server round-trip).
//
// The extracted text is structured into the adapter's neutral payload
// (eyebrow / headline / body / points / figure / CTA / footnote) so the file
// can be re-shaped to every social, print and event size like any other
// source. Nothing is invented: the structuring prompt is told to use only
// words that appear in the file.
// -----------------------------------------------------------------------------

import type { AdaptContent } from "@/lib/cross-format-adapt";

export const CONVERT_UPLOAD_ACCEPT =
  ".ai,.ait,.pdf,application/postscript,application/illustrator,.pptx,.docx,.xlsx,.svg,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/svg+xml";

/** 20 MB — matches the agent document intake ceiling. */
export const CONVERT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

export type ConvertUploadKind = "svg" | "office" | "pdf";

export function uploadKindOf(name: string): ConvertUploadKind | null {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  if (ext === "svg") return "svg";
  if (ext === "pptx" || ext === "docx" || ext === "xlsx") return "office";
  if (ext === "pdf" || ext === "ai" || ext === "ait") return "pdf";
  return null;
}

/** Plain-language label for the accepted file, shown in the source panel. */
export function uploadKindLabel(name: string): string {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  if (ext === "ai" || ext === "ait") return "Illustrator file";
  if (ext === "svg") return "SVG artwork";
  if (ext === "pptx") return "PowerPoint / Canva export";
  if (ext === "pdf") return "PDF / Canva export";
  if (ext === "docx") return "Word document";
  if (ext === "xlsx") return "Excel sheet";
  return "File";
}

/**
 * Read the visible text of an SVG artwork into the neutral payload, in
 * document order: the first (usually largest) line becomes the headline, the
 * next the body, the rest supporting points. Returns null when the markup is
 * not parseable SVG or carries no text.
 */
export function contentFromSvgMarkup(markup: string): AdaptContent | null {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const svg = doc.documentElement;
  if (!svg || svg.tagName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) return null;
  const lines: string[] = [];
  for (const node of svg.querySelectorAll("text")) {
    const t = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (t) lines.push(t);
  }
  if (!lines.length) return null;
  const [headline, body, ...rest] = lines;
  return {
    headline,
    body: body || undefined,
    points: rest.length ? rest.slice(0, 8) : undefined,
  };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}
