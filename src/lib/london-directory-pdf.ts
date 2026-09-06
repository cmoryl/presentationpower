import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { NEXT_APP_ORIGIN } from "@/lib/next-event";
import {
  LONDON_PANELS,
  LONDON_STYLES,
  LONDON_VENUE,
  londonPanelsByFloor,
  rasterSizeFor,
  recommendedPpi,
  type LondonPanel,
} from "@/lib/next-london-signage";

/**
 * Master directory PDF for the London scenic panel kit.
 *
 * Layout rules this file guarantees:
 *  - A4 landscape, so every spec column fits without truncating panel names.
 *  - One flowing layout engine: nothing is drawn without first reserving the
 *    space, so there are no abrupt page cuts, orphaned room headings, or rows
 *    overlapping the footer.
 *  - Repeat runs of identical panels collapse into a single quantity row, which
 *    keeps long rooms (21 Churchill panels) from sprawling over pages.
 *  - Live links: the cover, contents and every panel row deep-link to the kit
 *    on the web so the printed directory stays a download hub.
 */

const NAVY: [number, number, number] = [3, 0, 44]; // #03002C
const BLUE: [number, number, number] = [0, 63, 199]; // #003FC7
const AQUA: [number, number, number] = [161, 251, 249];
const INK: [number, number, number] = [26, 28, 40];
const GRAY: [number, number, number] = [102, 102, 102];
const LINE: [number, number, number] = [224, 232, 245];
const BAND: [number, number, number] = [246, 248, 252];

const PW = 841.89; // A4 landscape, pt
const PH = 595.28;
const M = 42;
const CW = PW - M * 2;
const HEAD_H = 46;
const FOOT_Y = PH - 26;
const BODY_TOP = HEAD_H + 26;
const BODY_BOTTOM = FOOT_Y - 20;

const SITE = NEXT_APP_ORIGIN;
const HUB = `${SITE}/events/next/london`;
const TEMPLATE_URL = `${SITE}/events/next/london/template`;
const REVISE_URL = `${SITE}/events/next/london/revise`;
const panelUrl = (panel: LondonPanel) => `${HUB}?panel=${encodeURIComponent(panel.id)}`;

const COLS = [268, 92, 150, 122, 90, 40] as const;
const HEADERS = [
  "Panel",
  "Ground",
  "Trim · bleed (mm)",
  "Gradient",
  "Raster @ ppi",
  "Qty",
] as const;

/**
 * Helvetica in jsPDF is WinAnsi: arrows and dashes outside that set render as
 * mojibake (the old export printed "violet !’ aqua"). Fold them to safe glyphs.
 */
function safe(text: string): string {
  return text
    .replace(/[\u2192\u27F6]/g, "to")
    .replace(/[\u2190\u2194]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...");
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Wrap to at most `maxLines`, ellipsising only the final line. */
function wrap(doc: jsPDF, text: string, width: number, maxLines: number): string[] {
  const lines = doc.splitTextToSize(safe(text), width) as string[];
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1] ?? "";
  while (last.length > 1 && doc.getTextWidth(last + "...") > width) last = last.slice(0, -1);
  kept[maxLines - 1] = last + "...";
  return kept;
}

// ---------------------------------------------------------------------------
// Row model: collapse repeat runs so long rooms stay readable
// ---------------------------------------------------------------------------

type Row = {
  label: string;
  ground: string;
  geometry: string;
  gradient: string;
  raster: string;
  qty: number;
  panel: LondonPanel;
  note?: string;
};

function specKey(p: LondonPanel): string {
  const ppi = recommendedPpi(p);
  return [p.ground, p.style, p.trimW, p.trimH, p.bleedEdge, ppi].join("|");
}

/** "CHURCHILL DEMO AREAS - p02 - 1500x2440mm" -> "CHURCHILL DEMO AREAS" */
function nameStem(name: string): string {
  const cut = name.split(" - ")[0] ?? name;
  return cut.trim();
}

function pageLabel(p: LondonPanel): string {
  return `p${String(p.page).padStart(2, "0")}`;
}

function rowFor(panel: LondonPanel, run: LondonPanel[]): Row {
  const ppi = recommendedPpi(panel);
  const rs = rasterSizeFor(panel, ppi);
  const geometry = `${panel.trimW}×${panel.trimH} · +${panel.bleedEdge} → ${panel.bleedW}×${panel.bleedH}`;
  const gradient = LONDON_STYLES[panel.style]?.label ?? panel.style;
  const raster = `${rs.w}×${rs.h} @ ${ppi}ppi`;
  if (run.length === 1) {
    return {
      label: panel.name,
      ground: panel.ground,
      geometry,
      gradient,
      raster,
      qty: 1,
      panel,
    };
  }
  const first = run[0]!;
  const last = run[run.length - 1]!;
  return {
    label: `${nameStem(first.name)} — ${pageLabel(first)}–${pageLabel(last)}`,
    ground: panel.ground,
    geometry,
    gradient,
    raster,
    qty: run.length,
    panel: first,
    note: `${run.length} identical panels · ${first.trimW}×${first.trimH} mm each`,
  };
}

/** Identical consecutive panels become one quantity row. */
function compressRoom(panels: LondonPanel[]): Row[] {
  const rows: Row[] = [];
  let run: LondonPanel[] = [];
  const flush = () => {
    if (run.length) rows.push(rowFor(run[0]!, run));
    run = [];
  };
  for (const panel of panels) {
    const prev = run[run.length - 1];
    const same =
      prev && specKey(prev) === specKey(panel) && nameStem(prev.name) === nameStem(panel.name);
    if (same) run.push(panel);
    else {
      flush();
      run = [panel];
    }
  }
  flush();
  return rows;
}

// ---------------------------------------------------------------------------
// Layout engine
// ---------------------------------------------------------------------------

type Ctx = {
  doc: jsPDF;
  y: number;
  page: number;
  section: string;
  /** Called when a page break happens, to re-draw table headings. */
  onBreak?: (ctx: Ctx) => void;
};

function runningHeader(doc: jsPDF, section: string) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, HEAD_H, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(safe(section), M, 29);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(190, 200, 230);
  doc.text(
    safe(`TransPerfect NEXT 2026 · London scenic panel kit · ${LONDON_PANELS.length} panels`),
    PW - M,
    29,
    { align: "right" },
  );
}

function pageFooter(doc: jsPDF, section: string) {
  doc.setDrawColor(...LINE);
  doc.line(M, FOOT_Y - 12, PW - M, FOOT_Y - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(safe(`Job ${LONDON_VENUE.job} · ${LONDON_VENUE.venue} · ${section}`), M, FOOT_Y);
  doc.setTextColor(...BLUE);
  doc.textWithLink("Open the live kit", PW / 2 - 32, FOOT_Y, { url: HUB });
}

function newBodyPage(ctx: Ctx) {
  ctx.doc.addPage();
  ctx.page += 1;
  runningHeader(ctx.doc, ctx.section);
  ctx.y = BODY_TOP;
}

/** Reserve vertical space, breaking the page first when it will not fit. */
function ensure(ctx: Ctx, h: number): boolean {
  if (ctx.y + h <= BODY_BOTTOM) return false;
  newBodyPage(ctx);
  ctx.onBreak?.(ctx);
  return true;
}

function tableHead(ctx: Ctx, cont = false) {
  const { doc } = ctx;
  doc.setFillColor(...NAVY);
  doc.rect(M, ctx.y, CW, 17, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  let x = M;
  HEADERS.forEach((h, i) => {
    const label = i === 0 && cont ? `${h} (continued)` : h;
    const w = COLS[i]!;
    doc.text(
      safe(label),
      i === 5 ? x + w - 4 : x + 6,
      ctx.y + 11.5,
      i === 5 ? { align: "right" } : undefined,
    );
    x += w;
  });
  ctx.y += 17;
}

function drawRow(ctx: Ctx, row: Row, index: number) {
  const { doc } = ctx;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const nameLines = wrap(doc, row.label, COLS[0]! - 12, 2);
  const cells: string[][] = [
    nameLines,
    wrap(doc, row.ground, COLS[1]! - 10, 2),
    wrap(doc, row.geometry, COLS[2]! - 10, 2),
    wrap(doc, row.gradient, COLS[3]! - 10, 2),
    wrap(doc, row.raster, COLS[4]! - 10, 2),
  ];
  const noteLines = row.note ? wrap(doc, row.note, COLS[0]! - 12, 1) : [];
  const lines = Math.max(...cells.map((c) => c.length));
  const h = 8 + lines * 10 + (noteLines.length ? 9 : 0);

  ensure(ctx, h);

  if (index % 2 === 1) {
    doc.setFillColor(...BAND);
    doc.rect(M, ctx.y, CW, h, "F");
  }

  let x = M;
  cells.forEach((cell, i) => {
    const top = ctx.y + 13;
    if (i === 0) {
      doc.setTextColor(...BLUE);
      cell.forEach((line, k) => {
        if (k === 0) doc.textWithLink(line, x + 6, top, { url: panelUrl(row.panel) });
        else doc.text(line, x + 6, top + k * 10);
      });
      if (noteLines.length) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(...GRAY);
        doc.text(noteLines[0]!, x + 6, top + cell.length * 10 - 1);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }
    } else {
      doc.setTextColor(...INK);
      cell.forEach((line, k) => doc.text(line, x + 6, top + k * 10));
    }
    x += COLS[i]!;
  });

  // Qty column
  doc.setFont("helvetica", "bold");
  doc.setTextColor(
    row.qty > 1 ? BLUE[0] : INK[0],
    row.qty > 1 ? BLUE[1] : INK[1],
    row.qty > 1 ? BLUE[2] : INK[2],
  );
  doc.text(row.qty > 1 ? `×${row.qty}` : "1", M + CW - 4, ctx.y + 13, { align: "right" });
  doc.setFont("helvetica", "normal");

  ctx.y += h;
  doc.setDrawColor(...LINE);
  doc.line(M, ctx.y, PW - M, ctx.y);
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

function coverPage(doc: jsPDF, panels: LondonPanel[]) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, PH, "F");
  // Brand rail
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, 10, PH, "F");
  doc.setFillColor(...AQUA);
  doc.rect(0, 0, 10, PH / 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TRANSPERFECT NEXT 2026", M, 108, { charSpace: 2.4 });
  doc.setFontSize(38);
  doc.text("London Scenic Panel Kit", M, 156);
  doc.setTextColor(...AQUA);
  doc.setFontSize(17);
  doc.text("Master Directory", M, 184);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(214, 222, 244);
  const facts: [string, string][] = [
    ["Panels", `${panels.length} scenic panels`],
    ["Venue", `${LONDON_VENUE.venue} · ${LONDON_VENUE.city}`],
    ["Address", LONDON_VENUE.address],
    ["Dates", LONDON_VENUE.datesLabel],
    ["Job", `${LONDON_VENUE.job} · ${LONDON_VENUE.producer}`],
    ["Colour", LONDON_VENUE.colourSpace],
    ["Issued", new Date().toISOString().slice(0, 10)],
  ];
  let y = 232;
  for (const [k, v] of facts) {
    doc.setTextColor(140, 158, 200);
    doc.text(safe(k), M, y);
    doc.setTextColor(226, 232, 248);
    doc.text(safe(v), M + 86, y);
    y += 19;
  }

  // Live download links
  const linkX = PW / 2 + 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("Live downloads", linkX, 232);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const links: [string, string, string][] = [
    ["Panel kit hub", "Every panel, spec, QA report and vector download", HUB],
    ["Signage template editor", "Position lockups, copy and QR codes per panel", TEMPLATE_URL],
    ["Revise specifications", "Publish a new revision of the pack", REVISE_URL],
  ];
  y = 258;
  for (const [label, note, url] of links) {
    doc.setTextColor(...AQUA);
    doc.textWithLink(safe(label), linkX, y, { url });
    doc.setDrawColor(...AQUA);
    doc.line(linkX, y + 2, linkX + doc.getTextWidth(safe(label)), y + 2);
    doc.setTextColor(150, 165, 205);
    doc.setFontSize(8.5);
    doc.text(safe(note), linkX, y + 14);
    doc.setFontSize(10);
    y += 40;
  }

  // Ground ramp strip — the ten approved treatments, in issue order.
  const styles = Object.values(LONDON_STYLES);
  const stripY = PH - 156;
  const stripH = 54;
  const cellW = CW / styles.length;
  styles.forEach((style, i) => {
    const x = M + i * cellW;
    style.stops.forEach((stop, k) => {
      const [r, g, b] = hexRgb(stop);
      const bandH = stripH / style.stops.length;
      doc.setFillColor(r, g, b);
      doc.rect(x, stripY + k * bandH, cellW - 4, bandH + 0.4, "F");
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(150, 165, 205);
    doc.text(wrap(doc, style.label, cellW - 8, 1)[0]!, x, stripY + stripH + 11);
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("TEN APPROVED GROUNDS", M, stripY - 10, { charSpace: 1.4 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 162, 200);
  doc.text(
    safe(
      "Raster sizes are quoted at the recommended ppi tier (36 / 72 / 120). All dimensions in millimetres unless noted. Vector masters (.ai, .svg) are resolution independent; PNG output is proof only.",
    ),
    M,
    PH - 54,
    { maxWidth: CW },
  );
}

type FloorPlan = { label: string; rooms: { room: string; rows: Row[]; panels: number }[] };

function plan(panels: LondonPanel[]): FloorPlan[] {
  return londonPanelsByFloor(panels).map((floor) => ({
    label: floor.label,
    rooms: floor.rooms.map((room) => ({
      room: room.room,
      rows: compressRoom(room.panels),
      panels: room.panels.length,
    })),
  }));
}

function gradientPage(ctx: Ctx) {
  const { doc } = ctx;
  ctx.section = "Gradient treatments";
  newBodyPage(ctx);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(
    safe(
      "Ten approved grounds carry the whole kit. Division panels tint only the light end of their ramp; the dark end always stays brand navy so white lockups keep contrast.",
    ),
    M,
    ctx.y,
    { maxWidth: CW },
  );
  ctx.y += 26;

  for (const style of Object.values(LONDON_STYLES)) {
    doc.setFontSize(9);
    const note = wrap(doc, style.note, CW - 210, 2);
    const h = Math.max(34, 14 + note.length * 11);
    ensure(ctx, h + 8);

    // Swatch ramp
    const sw = 170;
    const stops = style.stops;
    const seg = sw / stops.length;
    stops.forEach((stop, i) => {
      const [r, g, b] = hexRgb(stop);
      doc.setFillColor(r, g, b);
      doc.rect(M + i * seg, ctx.y, seg + 0.4, 22, "F");
    });
    doc.setDrawColor(...LINE);
    doc.rect(M, ctx.y, sw, 22);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text(safe(style.label), M + sw + 16, ctx.y + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    note.forEach((line, i) => doc.text(line, M + sw + 16, ctx.y + 22 + i * 10));
    doc.setFontSize(7.5);
    doc.setTextColor(140, 150, 175);
    doc.text(stops.join("  ").toUpperCase(), M, ctx.y + 32);
    ctx.y += h + 10;
  }
}

function specPage(ctx: Ctx) {
  const { doc } = ctx;
  ctx.section = "Print specification";
  newBodyPage(ctx);
  const blocks: [string, string[]][] = [
    [
      "Colour and output",
      [
        `Colour space: ${LONDON_VENUE.colourSpace}. CMYK masters are generated on request with vibrant conversion and TAC limiting.`,
        "Vector masters (.ai / .svg) are the print deliverables — resolution independent, editable gradients, lockups and copy.",
        "PNG output is a screen proof only (6000 px ceiling, 36 / 72 / 120 ppi tiers). Never send a PNG to press.",
      ],
    ],
    [
      "Geometry",
      [
        "Trim is the finished board size; bleed is added per edge and quoted in the schedule as trim · +bleed → bleed size.",
        "Safe area holds all copy and lockups clear of trim; the live editor previews trim, bleed and safe on every panel.",
        "Board sizes can be overridden per panel where the fabricator confirms a different finished size.",
      ],
    ],
    [
      "Branding",
      [
        "Division panels print the white lockup (or white + colour chevrons) only — never the full-colour or dark-blue cut.",
        "Vendor booth panels use the supplied artwork as ground; no generated lockup is added over supplied art.",
        "Every lockup, headline, QR code and ground position in this directory is editable in the live template editor.",
      ],
    ],
  ];

  for (const [title, lines] of blocks) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    ensure(ctx, 26 + lines.length * 24);
    doc.setTextColor(...BLUE);
    doc.text(safe(title), M, ctx.y);
    ctx.y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    for (const line of lines) {
      const wrapped = wrap(doc, line, CW - 18, 3);
      ensure(ctx, wrapped.length * 12 + 6);
      doc.setFillColor(...BLUE);
      doc.circle(M + 3, ctx.y - 3, 1.6, "F");
      wrapped.forEach((l, i) => doc.text(l, M + 14, ctx.y + i * 12));
      ctx.y += wrapped.length * 12 + 6;
    }
    ctx.y += 12;
  }

  // Resolution tiers — the table the fabricator asks for most.
  ensure(ctx, 120);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text("Resolution tiers", M, ctx.y);
  ctx.y += 12;
  const tierCols = [150, 220, 200, CW - 570] as const;
  const tierHead = ["Tier", "Applies to", "Viewing distance", "Use"] as const;
  doc.setFillColor(...NAVY);
  doc.rect(M, ctx.y, CW, 17, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  let tx = M;
  tierHead.forEach((h, i) => {
    doc.text(h, tx + 6, ctx.y + 11.5);
    tx += tierCols[i]!;
  });
  ctx.y += 17;
  const tiers: string[][] = [
    ["36 ppi", "Longest edge over 2000 mm", "3 m and beyond", "Flags, banners, stage sets, wraps"],
    ["72 ppi", "Longest edge 800–2000 mm", "1.5–3 m", "Desk fronts, plinths, door vinyl"],
    [
      "120 ppi",
      "Longest edge under 800 mm",
      "Arm's length",
      "Slivers, fascia strips, close-up squares",
    ],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  tiers.forEach((row, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(...BAND);
      doc.rect(M, ctx.y, CW, 20, "F");
    }
    tx = M;
    row.forEach((cell, k) => {
      doc.setTextColor(
        k === 0 ? NAVY[0] : INK[0],
        k === 0 ? NAVY[1] : INK[1],
        k === 0 ? NAVY[2] : INK[2],
      );
      doc.setFont("helvetica", k === 0 ? "bold" : "normal");
      doc.text(wrap(doc, cell, tierCols[k]! - 12, 1)[0]!, tx + 6, ctx.y + 13);
      tx += tierCols[k]!;
    });
    ctx.y += 20;
    doc.setDrawColor(...LINE);
    doc.line(M, ctx.y, PW - M, ctx.y);
  });
  ctx.y += 26;

  // Live download links, repeated here so the spec page stands alone.
  ensure(ctx, 96);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text("Live downloads", M, ctx.y);
  ctx.y += 16;
  const live: [string, string, string][] = [
    ["Panel kit hub", "Per-panel specs, QA reports, RGB and CMYK vector downloads", HUB],
    [
      "Signage template editor",
      "Lockup, headline, QR and ground placement per panel",
      TEMPLATE_URL,
    ],
    [
      "Revise specifications",
      "Board sizes, gradients and rebuilds; publish a revision",
      REVISE_URL,
    ],
  ];
  doc.setFontSize(9);
  for (const [label, note, url] of live) {
    ensure(ctx, 20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLUE);
    doc.textWithLink(safe(label), M, ctx.y, { url });
    doc.setDrawColor(...BLUE);
    doc.line(M, ctx.y + 2, M + doc.getTextWidth(safe(label)), ctx.y + 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(safe(note), M + 170, ctx.y);
    doc.setFontSize(7.5);
    doc.setTextColor(150, 158, 180);
    doc.text(safe(url), PW - M, ctx.y, { align: "right" });
    doc.setFontSize(9);
    ctx.y += 20;
  }
}

function schedulePages(
  ctx: Ctx,
  floors: FloorPlan[],
  record?: (label: string, page: number) => void,
) {
  for (const floor of floors) {
    ctx.section = `Panel schedule — ${floor.label}`;
    newBodyPage(ctx);
    record?.(floor.label, ctx.page);

    const total = floor.rooms.reduce((n, r) => n + r.panels, 0);
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(8.5);
    ctx.doc.setTextColor(...GRAY);
    ctx.doc.text(
      safe(
        `${floor.rooms.length} room${floor.rooms.length === 1 ? "" : "s"} · ${total} panel${total === 1 ? "" : "s"} · identical repeats are grouped into one quantity row`,
      ),
      M,
      ctx.y,
    );
    ctx.y += 18;

    for (const room of floor.rooms) {
      // Room heading + table head + first row must land together.
      ctx.onBreak = undefined;
      ensure(ctx, 74);
      ctx.doc.setFont("helvetica", "bold");
      ctx.doc.setFontSize(10.5);
      ctx.doc.setTextColor(...NAVY);
      ctx.doc.text(safe(room.room), M, ctx.y + 2);
      ctx.doc.setFont("helvetica", "normal");
      ctx.doc.setFontSize(8.5);
      ctx.doc.setTextColor(...GRAY);
      ctx.doc.text(
        safe(
          `${room.panels} panel${room.panels === 1 ? "" : "s"} · ${room.rows.length} line${room.rows.length === 1 ? "" : "s"}`,
        ),
        PW - M,
        ctx.y + 2,
        { align: "right" },
      );
      ctx.y += 12;
      tableHead(ctx);
      ctx.onBreak = (c) => tableHead(c, true);
      room.rows.forEach((row, i) => drawRow(ctx, row, i));
      ctx.onBreak = undefined;
      ctx.y += 22;
    }
  }
}

function contentsPage(
  doc: jsPDF,
  floors: FloorPlan[],
  pages: Map<string, number>,
  totalPages: number,
) {
  runningHeader(doc, "Contents");
  let y = BODY_TOP;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(safe(`${totalPages} pages · every entry below is a live link into the kit`), M, y);
  y += 24;

  const rows: [string, string, number | null, string | null][] = [
    ["Gradient treatments", "Ten approved grounds with hex ramps", 3, null],
    ["Print specification", "Colour, geometry and branding rules", 4, null],
    ...floors.map(
      (f) =>
        [
          `Panel schedule — ${f.label}`,
          `${f.rooms.length} room${f.rooms.length === 1 ? "" : "s"} · ${f.rooms.reduce((n, r) => n + r.panels, 0)} panels`,
          pages.get(f.label) ?? null,
          null,
        ] as [string, string, number | null, string | null],
    ),
    ["Live: panel kit hub", "Specs, QA reports and vector downloads", null, HUB],
    ["Live: template editor", "Lockup, copy and QR placement per panel", null, TEMPLATE_URL],
    ["Live: revise specifications", "Publish a new revision of the pack", null, REVISE_URL],
  ];

  for (const [label, note, page, url] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BLUE);
    if (url) doc.textWithLink(safe(label), M, y, { url });
    else {
      doc.text(safe(label), M, y);
      if (page) doc.link(M, y - 9, CW, 13, { pageNumber: page });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(safe(note), M + 250, y);
    doc.setTextColor(...INK);
    doc.text(page ? `page ${page}` : "web", PW - M, y, { align: "right" });
    doc.setDrawColor(...LINE);
    doc.line(M, y + 8, PW - M, y + 8);
    y += 26;
  }
  pageFooter(doc, "Contents");
}

// ---------------------------------------------------------------------------
// Document assembly
// ---------------------------------------------------------------------------

function renderBody(
  doc: jsPDF,
  floors: FloorPlan[],
  record?: (label: string, page: number) => void,
  startPage = 1,
) {
  const ctx: Ctx = { doc, y: BODY_TOP, page: startPage, section: "" };
  gradientPage(ctx);
  specPage(ctx);
  schedulePages(ctx, floors, record);
  return ctx.page;
}

/** Stamp `page n of m` on every page except the cover. */
function stampFooters(doc: jsPDF, total: number, sections: string[]) {
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    // Contents draws its own footer text; overwrite consistently anyway.
    doc.setFillColor(255, 255, 255);
    doc.rect(M, FOOT_Y - 11, CW, 18, "F");
    doc.setDrawColor(...LINE);
    doc.line(M, FOOT_Y - 12, PW - M, FOOT_Y - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(
      safe(`Job ${LONDON_VENUE.job} · ${LONDON_VENUE.venue} · ${sections[p - 1] ?? ""}`),
      M,
      FOOT_Y,
    );
    doc.text(`page ${p} of ${total}`, PW - M, FOOT_Y, { align: "right" });
    doc.setTextColor(...BLUE);
    doc.textWithLink("Open the live kit", PW / 2 - 30, FOOT_Y, { url: HUB });
  }
}

export function buildLondonDirectoryPdf(panels: LondonPanel[] = LONDON_PANELS): jsPDF {
  const floors = plan(panels);

  // Pass 1 — measure, so the contents page can carry real page numbers.
  const probe = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const measured = new Map<string, number>();
  // cover (1) + contents (2) => body starts on page 3
  renderBody(probe, floors, (label, page) => measured.set(label, page), 2);
  const totalPages = probe.getNumberOfPages() + 1;

  // Pass 2 — real document.
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  coverPage(doc, panels);
  doc.addPage();
  contentsPage(doc, floors, measured, totalPages);
  renderBody(doc, floors, undefined, 2);

  // Section labels per page for the footer stamp.
  const sections: string[] = ["Cover", "Contents"];
  const sectionOf = (p: number) => {
    let label = "Panel schedule";
    for (const [floorLabel, page] of measured)
      if (page <= p) label = `Panel schedule — ${floorLabel}`;
    if (p === 3) label = "Gradient treatments";
    else if (p === 4) label = "Print specification";
    return label;
  };
  for (let p = 3; p <= doc.getNumberOfPages(); p++) sections[p - 1] = sectionOf(p);
  stampFooters(doc, doc.getNumberOfPages(), sections);
  return doc;
}

/** Build and download the master directory PDF for the London kit. */
export function downloadLondonDirectoryPdf(panels: LondonPanel[] = LONDON_PANELS) {
  const doc = buildLondonDirectoryPdf(panels);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "next-2026-london-panel-kit-master-directory.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Click handler with toast acknowledgement. */
export function handleLondonDirectoryDownload(panels?: LondonPanel[]) {
  const t = toast.loading("Building master directory PDF…");
  try {
    downloadLondonDirectoryPdf(panels);
    toast.success("Master directory PDF saved", { id: t });
  } catch (err) {
    toast.error("Directory PDF failed", {
      id: t,
      description: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
