// One PDF of every QEII Centre floor, for event materials.
//
// Each page is a rasterised proof of the plan exactly as it reads on screen —
// room colours, room names, event use lines and division lockups included. A
// floor the issued design places as a picture is carried as that picture.
//
// This is a proof for handing round and printing on office stock, not a press
// master: the plan artwork is rasterised, so it is labelled as a proof on every
// page and in the file name.

import type { QeiiPlanFace } from "@/lib/next-london-qeii-plan";

export type QeiiPdfPage = {
  /** Floor title as printed on the sheet. */
  title: string;
  /** Rebuilt plan as standalone SVG markup. */
  svg?: string;
  /** Issued sheet artwork, used when a floor cannot be rebuilt. */
  imageUrl?: string;
  /** Plain-language note printed under the page title. */
  note?: string;
};

export type QeiiPdfResult = {
  filename: string;
  pages: number;
  /** Pages that could not be drawn, with the honest reason. */
  skipped: { title: string; reason: string }[];
  /** Things that were dropped from a page but did not stop it. */
  warnings: string[];
};

/** Longest edge of each rasterised plan, in pixels. 300dpi on A3 landscape. */
const RASTER_LONG_EDGE = 4960;

async function fetchDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`${res.status}`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("unreadable"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Embed every linked lockup in an SVG as data.
 *
 * A rasteriser cannot reach out to the network from inside an SVG, so a linked
 * lockup would simply be missing. Anything we cannot fetch is removed and
 * reported rather than left as a silent blank.
 */
export async function inlineSvgImages(
  svg: string,
  cache: Map<string, string | null>,
): Promise<{ svg: string; dropped: string[] }> {
  const urls = [...svg.matchAll(/<image[^>]*href="([^"]+)"/g)].map((m) => m[1]!);
  const dropped: string[] = [];
  for (const url of new Set(urls)) {
    if (url.startsWith("data:")) continue;
    if (!cache.has(url)) {
      // The plan links a lockup by its full site URL so a handed-on SVG still
      // finds it. Inside this app the same file sits on our own origin, which is
      // the only place a browser will let us read the bytes from.
      const candidates = [url];
      if (url.startsWith(NEXT_APP_ORIGIN)) candidates.unshift(url.slice(NEXT_APP_ORIGIN.length));
      let data: string | null = null;
      for (const candidate of candidates) {
        try {
          data = await fetchDataUrl(candidate);
          break;
        } catch {
          // Try the next candidate; a total failure is reported below.
        }
      }
      cache.set(url, data);
    }
    const data = cache.get(url);
    if (data) {
      svg = svg.split(`href="${url}"`).join(`href="${data}"`);
    } else {
      dropped.push(url);
      // Drop the whole element so the page never shows a broken-image box.
      svg = svg.replace(new RegExp(`<image[^>]*href="${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*/>`, "g"), "");
    }
  }
  return { svg, dropped };
}

async function rasterise(svg: string): Promise<{ dataUrl: string; w: number; h: number }> {
  const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("The plan artwork could not be drawn in this browser."));
      el.src = blobUrl;
    });
    const natural = { w: img.naturalWidth || 1123, h: img.naturalHeight || 1587 };
    const k = RASTER_LONG_EDGE / Math.max(natural.w, natural.h);
    const w = Math.round(natural.w * k);
    const h = Math.round(natural.h * k);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot draw the plan to an image.");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { dataUrl: canvas.toDataURL("image/png"), w, h };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function loadRaster(url: string): Promise<{ dataUrl: string; w: number; h: number }> {
  const dataUrl = await fetchDataUrl(url);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("The issued sheet could not be read."));
    el.src = dataUrl;
  });
  return { dataUrl, w: img.naturalWidth, h: img.naturalHeight };
}

export function qeiiPdfFilename(face: QeiiPlanFace): string {
  return `TP-NEXT-2026-London-QEII-floor-plans-${face}-PROOF.pdf`;
}

/**
 * Build the single all-floor PDF and hand the browser the download.
 *
 * jsPDF is pulled in only when this runs — the page itself never loads it.
 */
export async function exportQeiiFloorsPdf(
  pages: QeiiPdfPage[],
  face: QeiiPlanFace,
): Promise<QeiiPdfResult> {
  const { jsPDF } = await import("jspdf");
  const skipped: QeiiPdfResult["skipped"] = [];
  const warnings: string[] = [];
  const cache = new Map<string, string | null>();
  let doc: import("jspdf").jsPDF | undefined;
  let drawn = 0;

  for (const page of pages) {
    let art: { dataUrl: string; w: number; h: number };
    try {
      if (page.svg) {
        const inlined = await inlineSvgImages(page.svg, cache);
        if (inlined.dropped.length) {
          warnings.push(
            `${page.title}: ${inlined.dropped.length} division lockup${inlined.dropped.length === 1 ? "" : "s"} could not be embedded, so ${inlined.dropped.length === 1 ? "it is" : "they are"} not on this page.`,
          );
        }
        art = await rasterise(inlined.svg);
      } else if (page.imageUrl) {
        art = await loadRaster(page.imageUrl);
      } else {
        skipped.push({ title: page.title, reason: "No artwork available for this floor." });
        continue;
      }
    } catch (err) {
      skipped.push({
        title: page.title,
        reason: err instanceof Error ? err.message : "The artwork could not be read.",
      });
      continue;
    }

    const landscape = art.w > art.h;
    if (!doc) {
      doc = new jsPDF({ unit: "mm", format: "a3", orientation: landscape ? "landscape" : "portrait" });
    } else {
      doc.addPage("a3", landscape ? "landscape" : "portrait");
    }
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 12;
    const headH = 16;
    const footH = 8;
    const boxW = pw - margin * 2;
    const boxH = ph - margin * 2 - headH - footH;
    const k = Math.min(boxW / art.w, boxH / art.h);
    const w = art.w * k;
    const h = art.h * k;

    doc.setTextColor(3, 0, 44);
    doc.setFontSize(14);
    doc.text(`Queen Elizabeth II Centre — ${page.title}`, margin, margin + 6);
    doc.setFontSize(8.5);
    doc.setTextColor(102, 102, 102);
    doc.text(
      page.note ?? "NEXT 2026 London · 24–25 September 2026",
      margin,
      margin + 11.5,
      { maxWidth: boxW },
    );
    doc.addImage(art.dataUrl, "PNG", margin + (boxW - w) / 2, margin + headH, w, h, undefined, "FAST");
    doc.setFontSize(7.5);
    doc.text(
      "Proof for event materials — rasterised from the Element floor plan. Not a press master.",
      margin,
      ph - margin + 2,
    );
    drawn += 1;
  }

  const filename = qeiiPdfFilename(face);
  if (doc && drawn > 0) doc.save(filename);
  return { filename, pages: drawn, skipped, warnings };
}
