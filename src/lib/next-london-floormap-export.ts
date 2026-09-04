// Downloads for the London location maps: SVG, PNG, a per-floor PDF plan set
// and a zip of one install card per asset.

import { jsPDF } from "jspdf";
import JSZip from "jszip";

import { loadSvgImage } from "@/lib/london-panel-raster";
import {
  LONDON_FLOOR_PLANS,
  londonMapCsv,
  type LondonAssetKind,
  type LondonMarkerOverrides,
} from "@/lib/next-london-floorplan";
import { assetMapSvg, floorMapSize, floorMapSvg } from "@/lib/next-london-floormap-svg";
import {
  LONDON_VENUE,
  panelSlug,
  type LondonFloorId,
  type LondonPanel,
} from "@/lib/next-london-signage";

export type MapExportOptions = {
  panels: LondonPanel[];
  overrides?: LondonMarkerOverrides;
  kinds?: LondonAssetKind[];
  labels?: boolean;
};

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Rasterise a map SVG at a print-friendly multiplier. */
export async function mapPngBlob(svg: string, w: number, h: number, scale = 2): Promise<Blob> {
  const img = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png"),
  );
}

async function pngDataUrl(svg: string, w: number, h: number, scale = 2): Promise<string> {
  const blob = await mapPngBlob(svg, w, h, scale);
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Read failed"));
    fr.readAsDataURL(blob);
  });
}

export function downloadFloorMapSvg(floor: LondonFloorId, opts: MapExportOptions) {
  const svg = floorMapSvg(floor, opts);
  save(new Blob([svg], { type: "image/svg+xml" }), `next-london-map-${floor.toLowerCase()}.svg`);
}

export async function downloadFloorMapPng(floor: LondonFloorId, opts: MapExportOptions) {
  const plan = LONDON_FLOOR_PLANS.find((p) => p.floor === floor);
  if (!plan) return;
  const { w, h } = floorMapSize(plan);
  const blob = await mapPngBlob(floorMapSvg(floor, opts), w, h, 2.5);
  save(blob, `next-london-map-${floor.toLowerCase()}.png`);
}

export function downloadAssetMapSvg(panel: LondonPanel, opts: MapExportOptions) {
  const svg = assetMapSvg(panel, opts);
  save(new Blob([svg], { type: "image/svg+xml" }), `next-london-location-${panelSlug(panel)}.svg`);
}

/** One PDF page per floor — the install plan set the crew works from. */
export async function downloadFloorMapPdf(opts: MapExportOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 28;
  let first = true;

  for (const plan of LONDON_FLOOR_PLANS) {
    const count = opts.panels.filter((p) => p.floor === plan.floor).length;
    if (!count) continue;
    if (!first) doc.addPage();
    first = false;
    const { w, h } = floorMapSize(plan);
    const data = await pngDataUrl(floorMapSvg(plan.floor, { ...opts, labels: true }), w, h, 2);
    const k = Math.min((PW - M * 2) / w, (PH - M * 2 - 18) / h);
    doc.addImage(data, "PNG", M, M, w * k, h * k, undefined, "FAST");
    doc.setFontSize(8);
    doc.setTextColor(102);
    doc.text(
      `${LONDON_VENUE.venue} · Job ${LONDON_VENUE.job} · schematic install plan — confirm positions on site`,
      M,
      PH - 14,
    );
  }
  doc.save("next-london-install-maps.pdf");
}

/** A zip with one location map per asset, plus the install schedule. */
export async function downloadAssetMapPack(opts: MapExportOptions) {
  const zip = new JSZip();
  const mapped = new Set(LONDON_FLOOR_PLANS.map((p) => p.floor));
  for (const panel of opts.panels) {
    if (!mapped.has(panel.floor)) continue;
    zip
      .folder(panel.floor.toLowerCase())!
      .file(`${panelSlug(panel)}-location.svg`, assetMapSvg(panel, opts));
  }
  zip.file("install-positions.csv", londonMapCsv(opts.panels, opts.overrides));
  zip.file(
    "README.txt",
    [
      "TransPerfect NEXT 2026 — London (QEII Centre) location maps",
      "Job 2281 · one top-down install card per asset.",
      "",
      "Positions are schematic: each asset is placed in its scheduled floor and zone,",
      "on the face it is installed against. Corrections made on the maps page are",
      "included here as confirmed positions (see install-positions.csv).",
    ].join("\n"),
  );
  save(await zip.generateAsync({ type: "blob" }), "next-london-location-maps.zip");
}

export function downloadMapCsv(opts: MapExportOptions) {
  save(
    new Blob([londonMapCsv(opts.panels, opts.overrides)], { type: "text/csv" }),
    "next-london-install-positions.csv",
  );
}
