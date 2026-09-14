// -----------------------------------------------------------------------------
// NEXT event booklet — page rendering (browser only).
//
// The venue maps and the chart modules are SVG in the app. A booklet page needs
// them as placed artwork, so they are rasterised here at 300 ppi of the printed
// area and handed to the three builders as `BookletImagePage`s. Each page keeps
// an honest credit line: rendered artwork, and — for a chart still carrying the
// module's sample dataset — a visible warning that the figures are not real.
// -----------------------------------------------------------------------------

import { renderSpecToSvg } from "@/lib/infographics/svg";
import { sampleSpecFor } from "@/lib/infographics/audit-sweep";
import { floorMapSheetSize, floorMapSvg, type FloorMapOptions } from "@/lib/next-london-floormap-svg";
import { LONDON_FLOORS, type LondonFloorId } from "@/lib/next-london-signage";
import type { BookletChartPage, BookletImagePage } from "@/lib/next-booklet";

const PRINT_PPI = 300;

/** mm at 300 ppi, capped so a big sheet cannot blow the browser's canvas limit. */
function printPx(mm: number): number {
  return Math.max(64, Math.min(8000, Math.round((mm / 25.4) * PRINT_PPI)));
}

export async function svgToPngBytes(
  svg: string,
  wPx: number,
  hPx: number,
  /** Turn the artwork a quarter turn so a landscape sheet fills a portrait page. */
  rotate = false,
): Promise<Uint8Array> {
  if (typeof window === "undefined") throw new Error("Booklet pages render in the browser only");
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not render the booklet page artwork"));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(rotate ? hPx : wPx);
    canvas.height = Math.round(rotate ? wPx : hPx);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not render the booklet page artwork");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (rotate) {
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, 0, 0, Math.round(wPx), Math.round(hPx));
      ctx.restore();
    } else {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    const out = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not render the booklet page artwork"))),
        "image/png",
      );
    });
    return new Uint8Array(await out.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** One booklet page per requested floor, drawn as the attendee wayfinding sheet. */
export async function bookletMapPages(
  floors: readonly LondonFloorId[],
  opts: FloorMapOptions = {},
  /** Booklet page proportion — a wide plan is turned a quarter turn on a tall page. */
  page: { wMm: number; hMm: number } = { wMm: 210, hMm: 297 },
): Promise<BookletImagePage[]> {
  const pages: BookletImagePage[] = [];
  for (const floor of floors) {
    const options: FloorMapOptions = { roomsOnly: true, labels: true, ...opts };
    const size = floorMapSheetSize(floor, options);
    const svg = floorMapSvg(floor, options);
    const wPx = printPx(size.w);
    const hPx = Math.round(wPx * (size.h / Math.max(1, size.w)));
    const turn = size.w / Math.max(1, size.h) > 1.25 && page.hMm > page.wMm;
    const label = LONDON_FLOORS.find((f) => f.id === floor)?.label ?? floor;
    pages.push({
      id: `map-${floor}`,
      title: `Venue map · ${label}`,
      caption:
        "QEII Centre floor plan — rendered artwork placed at 300 ppi, not vector print artwork.",
      png: await svgToPngBytes(svg, wPx, hPx, turn),
      wPx: turn ? hPx : wPx,
      hPx: turn ? wPx : hPx,
    });
  }
  return pages;
}

/** One booklet page per chart module, at the booklet's own printed proportions. */
export async function bookletChartPages(
  charts: readonly BookletChartPage[],
  mode: "light" | "dark" = "light",
  sheet: { wMm: number; hMm: number } = { wMm: 180, hMm: 120 },
): Promise<{ pages: BookletImagePage[]; warnings: string[] }> {
  const pages: BookletImagePage[] = [];
  const warnings: string[] = [];
  for (const chart of charts) {
    const spec = sampleSpecFor(chart.kind, mode, chart.title || undefined);
    if (!spec) {
      warnings.push(
        `“${chart.title || chart.kind}” cannot be exported as a booklet page — that chart look has no print renderer, so the page was left out.`,
      );
      continue;
    }
    const withCopy = { ...spec, subtitle: chart.subtitle || spec.subtitle };
    const wPx = printPx(sheet.wMm);
    const hPx = printPx(sheet.hMm);
    const svg = await renderSpecToSvg(withCopy, { width: wPx / 2, height: hPx / 2 });
    const source = (spec.data?.source ?? "").trim();
    const sampleData = /sample/i.test(source);
    if (sampleData) {
      warnings.push(`“${chart.title || chart.kind}” still carries the module's sample dataset.`);
    }
    pages.push({
      id: `chart-${chart.id}`,
      title: chart.title || `Chart · ${chart.kind}`,
      caption: [
        source ? `Source: ${source}.` : "",
        sampleData ? "SAMPLE DATA — replace with the approved figures before print." : "",
        "Rendered artwork placed at 300 ppi.",
      ]
        .filter(Boolean)
        .join(" "),
      png: await svgToPngBytes(svg, wPx, hPx),
      wPx,
      hPx,
    });
  }
  return { pages, warnings };
}
