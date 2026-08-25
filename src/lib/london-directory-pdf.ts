import { jsPDF } from "jspdf";
import { toast } from "sonner";
import {
  LONDON_PANELS,
  LONDON_STYLES,
  LONDON_VENUE,
  londonPanelsByFloor,
  rasterSizeFor,
  recommendedPpi,
  type LondonPanel,
} from "@/lib/next-london-signage";

const NAVY: [number, number, number] = [3, 0, 44]; // #03002C
const BLUE: [number, number, number] = [0, 63, 199]; // #003FC7
const GRAY: [number, number, number] = [102, 102, 102];
const LINE: [number, number, number] = [224, 232, 245];

const PW = 595.28; // A4 pt
const PH = 841.89;
const M = 40; // margin
const CW = PW - M * 2; // content width

// Column x-offsets within the table (sums to CW)
const COLS = [150, 78, 92, 118, 77] as const;
const HEADERS = ["Panel", "Ground", "Trim · bleed (mm)", "Gradient", "Raster"] as const;

function trunc(doc: jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
  return t + "…";
}

function cover(doc: jsPDF) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, PH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TRANSPERFECT NEXT 2026", M, 120, { charSpace: 2 });
  doc.setFontSize(30);
  doc.text("London Scenic Panel Kit", M, 160);
  doc.setFontSize(16);
  doc.setTextColor(161, 251, 249); // aqua accent
  doc.text("Master Directory", M, 188);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(220, 226, 245);
  doc.text(
    [
      `${LONDON_PANELS.length} scenic panels · ${LONDON_VENUE.venue} · ${LONDON_VENUE.city}`,
      `Job ${LONDON_VENUE.job} · ${LONDON_VENUE.datesLabel} · ${LONDON_VENUE.producer}`,
      `Colour space: ${LONDON_VENUE.colourSpace}`,
      `Generated ${new Date().toISOString().slice(0, 10)}`,
    ],
    M,
    230,
    { lineHeightFactor: 1.7 },
  );
  // Gradient key
  let y = 340;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("Gradient treatments", M, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const style of Object.values(LONDON_STYLES)) {
    // swatch strip
    const w = CW / style.stops.length / 8;
    let x = M;
    for (const stop of style.stops) {
      const [r, g, b] = hexRgb(stop);
      doc.setFillColor(r, g, b);
      doc.rect(x, y - 8, w, 10, "F");
      x += w;
    }
    doc.setTextColor(220, 226, 245);
    doc.text(trunc(doc, `${style.label} — ${style.note}`, CW - x + M - 14), x + 10, y);
    y += 24;
  }
  doc.setFontSize(9);
  doc.setTextColor(160, 170, 200);
  doc.text(
    "Raster sizes listed at the recommended ppi tier (36/72/120). All dimensions in millimetres unless noted.",
    M,
    PH - 60,
  );
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function floorPage(doc: jsPDF, label: string, rooms: { room: string; panels: LondonPanel[] }[], pageNo: number, totalPages: number) {
  let y = M + 6;
  // Header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, 54, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Folder — ${label}`, M, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`TransPerfect NEXT 2026 · London scenic panel kit · ${LONDON_PANELS.length} panels`, PW - M, 34, { align: "right" });

  y = 78;
  for (const room of rooms) {
    if (y > PH - 100) {
      footer(doc, pageNo, totalPages);
      doc.addPage();
      pageNo++;
      y = M;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLUE);
    doc.text(`${room.room}  (${room.panels.length})`, M, y);
    y += 8;

    // Table header
    doc.setFillColor(238, 241, 247);
    doc.rect(M, y, CW, 16, "F");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    let x = M;
    HEADERS.forEach((h, i) => {
      doc.text(h, x + 3, y + 11);
      x += COLS[i];
    });
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 40);
    for (const p of room.panels) {
      if (y > PH - 60) {
        footer(doc, pageNo, totalPages);
        doc.addPage();
        pageNo++;
        y = M;
      }
      const style = LONDON_STYLES[p.style];
      const ppi = recommendedPpi(p);
      const rs = rasterSizeFor(p, ppi);
      const cells = [
        `${p.name}`,
        p.ground,
        `${p.trimW}×${p.trimH} · +${p.bleedEdge} (${p.bleedW}×${p.bleedH})`,
        style ? style.label : p.style,
        `${rs.w}×${rs.h} @ ${ppi}ppi`,
      ];
      x = M;
      doc.setFontSize(8);
      cells.forEach((c, i) => {
        doc.text(trunc(doc, c, COLS[i] - 6), x + 3, y + 10);
        x += COLS[i];
      });
      doc.setDrawColor(...LINE);
      doc.line(M, y + 15, M + CW, y + 15);
      y += 15;
    }
    y += 18;
  }
  footer(doc, pageNo, totalPages);
}

function footer(doc: jsPDF, pageNo: number, totalPages: number) {
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    `Job ${LONDON_VENUE.job} · ${LONDON_VENUE.venue} — page ${pageNo} of ${totalPages}`,
    PW / 2,
    PH - 24,
    { align: "center" },
  );
}

/** Build and download the master directory PDF for the London kit. */
export function downloadLondonDirectoryPdf(panels: LondonPanel[] = LONDON_PANELS) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  cover(doc);
  const floors = londonPanelsByFloor(panels);
  const totalPages = floors.length + 1;
  floors.forEach((floor, i) => {
    doc.addPage();
    floorPage(doc, floor.label, floor.rooms, i + 2, totalPages);
  });
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "next-2026-london-panel-kit-master-directory.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Click handler with toast acknowledgement. */
export function handleLondonDirectoryDownload(panels?: LondonPanel[]) {
  const t = toast.loading("Building master directory PDF…");
  try {
    downloadLondonDirectoryPdf(panels);
    toast.success("Master directory PDF saved", { id: t });
  } catch (err) {
    toast.error("Directory PDF failed", { id: t, description: err instanceof Error ? err.message : "Unknown error" });
  }
}
