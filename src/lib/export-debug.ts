// -----------------------------------------------------------------------------
// Debug export: object-tree metadata for a finished PPTX.
//
// Two artefacts, both derived from the bytes we actually ship:
//   1. A sidecar JSON manifest (`<deck>.layers.json`) with, per slide, every
//      top-level object: type (text / image / icon / logo / shape / plate),
//      whether it is editable, whether it is layered, and its slide-space rect.
//   2. A debug copy of the .pptx where the same report is appended to each
//      slide's speaker notes and embedded as `docProps/layer-report.json`, so
//      layering can be inspected inside PowerPoint itself (View > Notes).
//
// Nothing here touches the normal export path — it runs after the file is
// written and only when the caller asks for it.
// -----------------------------------------------------------------------------

import JSZip from "jszip";
import { buildLayerReport, type LayerObject, type LayerReport } from "./layer-report";

export interface DebugSlideEntry {
  index: number;
  slideId?: string;
  variantId?: string;
  report: LayerReport;
}

export interface DebugManifest {
  generatedAt: string;
  deckTitle: string;
  fidelity: string;
  quality: string;
  slideSizeIn: { w: number; h: number };
  slides: DebugSlideEntry[];
  totals: {
    slides: number;
    objects: number;
    editable: number;
    layered: number;
    flattenedSlides: number;
    byType: Record<string, number>;
  };
}

const EMU_PER_IN = 914400;

function slideOrder(names: string[]): string[] {
  return names.sort(
    (a, b) => Number(/(\d+)\.xml$/.exec(a)![1]) - Number(/(\d+)\.xml$/.exec(b)![1]),
  );
}

export async function buildDebugManifest(
  blob: Blob,
  meta: {
    deckTitle: string;
    fidelity: string;
    quality: string;
    slides: Array<{ id?: string; variantId?: string }>;
  },
): Promise<{ manifest: DebugManifest; zip: JSZip }> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const presentationXml = (await zip.file("ppt/presentation.xml")?.async("string")) ?? "";
  const sizeMatch = /<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/.exec(presentationXml);
  const slideSizeIn = sizeMatch
    ? { w: Number(sizeMatch[1]) / EMU_PER_IN, h: Number(sizeMatch[2]) / EMU_PER_IN }
    : { w: 13.333, h: 7.5 };

  const parts = slideOrder(
    Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)),
  );

  const slides: DebugSlideEntry[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const xml = await zip.file(parts[i])!.async("string");
    slides.push({
      index: i,
      slideId: meta.slides[i]?.id,
      variantId: meta.slides[i]?.variantId,
      report: buildLayerReport(xml, presentationXml),
    });
  }

  const byType: Record<string, number> = {};
  let objects = 0;
  let editable = 0;
  let layered = 0;
  let flattenedSlides = 0;
  for (const s of slides) {
    objects += s.report.objects.length;
    editable += s.report.editableCount;
    layered += s.report.layeredCount;
    if (s.report.flattened) flattenedSlides += 1;
    for (const [k, v] of Object.entries(s.report.counts)) byType[k] = (byType[k] ?? 0) + v;
  }

  return {
    zip,
    manifest: {
      generatedAt: new Date().toISOString(),
      deckTitle: meta.deckTitle,
      fidelity: meta.fidelity,
      quality: meta.quality,
      slideSizeIn,
      slides,
      totals: { slides: slides.length, objects, editable, layered, flattenedSlides, byType },
    },
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function objectLine(o: LayerObject): string {
  const rect = [o.rect.x, o.rect.y, o.rect.w, o.rect.h].map((n) => n.toFixed(3)).join(", ");
  const label = o.text ? `"${o.text}"` : o.name || "(unnamed)";
  const flags = `${o.editable ? "editable" : "not editable"} · ${o.layered ? "layered" : "flattened"}`;
  return `#${o.id} ${o.type.toUpperCase()} ${label} — ${flags} — [${rect}]${o.note ? ` — ${o.note}` : ""}`;
}

/** Human-readable report appended to a slide's speaker notes. */
export function reportToNotes(entry: DebugSlideEntry): string {
  const r = entry.report;
  const counts = Object.entries(r.counts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ");
  const lines = [
    "— LAYERING REPORT —",
    `slide ${entry.index + 1}${entry.variantId ? ` · ${entry.variantId}` : ""}`,
    `${r.objects.length} objects · ${r.editableCount} editable · ${r.layeredCount} layered${
      r.flattened ? " · FLATTENED" : ""
    }`,
    counts,
    ...r.objects.map(objectLine),
    ...(r.problems.length ? [`problems: ${r.problems.join("; ")}`] : []),
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * Debug .pptx: same slides, plus the layering report in each slide's notes.
 * Falls back to the original bytes if
 * a notes part is missing or unparseable — a debug build must never be the
 * reason an export fails.
 */
export async function annotateDebugPptx(zip: JSZip, manifest: DebugManifest): Promise<Blob> {
  const notesParts = slideOrder(
    Object.keys(zip.files).filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n)),
  );

  for (const entry of manifest.slides) {
    const part = notesParts[entry.index];
    if (!part) continue;
    try {
      const xml = await zip.file(part)!.async("string");
      // Append one paragraph per line into the last text body on the notes page
      // (pptxgenjs writes the presenter body last).
      const paras = reportToNotes(entry)
        .split("\n")
        .map(
          (line) =>
            `<a:p><a:r><a:rPr lang="en-US" sz="900" dirty="0"/><a:t>${esc(line)}</a:t></a:r></a:p>`,
        )
        .join("");
      const idx = xml.lastIndexOf("</p:txBody>");
      if (idx < 0) continue;
      zip.file(part, `${xml.slice(0, idx)}${paras}${xml.slice(idx)}`);
    } catch {
      /* leave this slide's notes untouched */
    }
  }

  return (await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  })) as Blob;
}

/** Trigger a browser download for the sidecar manifest. */
export function downloadManifest(manifest: DebugManifest, fileName: string) {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
