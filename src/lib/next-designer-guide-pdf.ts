// NEXT designer guide PDF — the release-ready "start here" document that ships
// in the designer pack and can be handed to anyone on its own.
//
// Every file it names carries a live, absolute link to the download on the
// published app, the contents page links inside the PDF, and the look-and-feel
// pages use only real saved artwork (supplied print proofs and template
// examples). Where an example is a visualisation, the caption says so.
// Browser-only: call from a click handler.
import { jsPDF } from "jspdf";
import { BRAND_KIT_COLOUR_NOTE, NEXT_DIVISIONS, NEXT_LOGO_RULES, NEXT_MARKS, type KitFamily } from "@/lib/next-brand-kit";
import { GRADIENT_RULES, RESIZE_RULES, REUSE_RULES, kitGradients } from "@/lib/next-brand-kit-guide";
import { NEXT_DROPBOX_URL } from "@/lib/next-brand-guide";
import { NEXT_APP_ORIGIN } from "@/lib/next-event";
import { londonCmykRamp } from "@/lib/next-london-cmyk";
import { LONDON_PACK_AREAS, LONDON_PACK_ISSUE } from "@/lib/next-london-pack-2281";
import {
  DESIGNER_PACK_CHANGELOG,
  DESIGNER_PACK_VERSION,
  PACK_FOLDERS,
  designerFileName,
  logoFormats,
} from "@/lib/next-designer-pack";

const INK: [number, number, number] = [3, 0, 44];
const BLUE: [number, number, number] = [0, 63, 199];
const GREY: [number, number, number] = [102, 102, 102];

/** Absolute live URL for any app-relative file path. */
export function liveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${NEXT_APP_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function bytes(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  return new Uint8Array(await r.arrayBuffer());
}
function b64(u: Uint8Array) {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

type Img = { data: string; w: number; h: number; fmt: "JPEG" | "PNG" };
/** Load and downscale an image for embedding (keeps the PDF a sendable size). */
async function loadImg(url: string, max = 900, png = false): Promise<Img | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url.startsWith("https://brandhubcreator.lovable.app/")
      ? `/api/public/brandhub-image?path=${encodeURIComponent(new URL(url).pathname)}`
      : url;
    await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const g = c.getContext("2d")!;
    if (!png) {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, c.width, c.height);
    }
    g.drawImage(img, 0, 0, c.width, c.height);
    return png
      ? { data: c.toDataURL("image/png"), w: c.width, h: c.height, fmt: "PNG" }
      : { data: c.toDataURL("image/jpeg", 0.72), w: c.width, h: c.height, fmt: "JPEG" };
  } catch {
    return null;
  }
}

export type DesignerGuideOptions = {
  families: KitFamily[];
  /** Partner share link to print on the cover, when the guide is for a partner. */
  shareUrl?: string;
  onProgress?: (label: string) => void;
};

export async function buildDesignerGuidePdf(opts: DesignerGuideOptions): Promise<Uint8Array> {
  const { families, shareUrl, onProgress } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape", compress: true });
  const [reg, bold] = await Promise.all([bytes("/fonts/Geist-Regular.ttf"), bytes("/fonts/Geist-Bold.ttf")]);
  doc.addFileToVFS("Geist-Regular.ttf", b64(reg));
  doc.addFont("Geist-Regular.ttf", "Geist", "normal");
  doc.addFileToVFS("Geist-Bold.ttf", b64(bold));
  doc.addFont("Geist-Bold.ttf", "Geist", "bold");

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const today = new Date().toISOString().slice(0, 10);
  let y = M;
  const sections: { title: string; page: number }[] = [];

  const font = (style: "normal" | "bold", size: number, color = INK) =>
    doc.setFont("Geist", style).setFontSize(size).setTextColor(...color);
  const newPage = () => {
    doc.addPage();
    y = M;
  };
  const need = (h: number) => {
    if (y + h > H - M - 16) newPage();
  };
  const section = (title: string, intro?: string) => {
    newPage();
    sections.push({ title, page: doc.getNumberOfPages() });
    font("bold", 22);
    doc.text(title, M, y + 22);
    y += 34;
    if (intro) para(intro, 10, GREY);
    y += 6;
  };
  const sub = (t: string) => {
    need(30);
    font("bold", 13);
    doc.text(t, M, y + 13);
    y += 22;
  };
  const para = (t: string, size = 10, color = INK, x = M, w = W - M * 2) => {
    font("normal", size, color);
    for (const l of doc.splitTextToSize(t, w) as string[]) {
      need(size * 1.45);
      doc.text(l, x, y + size);
      y += size * 1.45;
    }
  };
  /** Inline link, returns the x after it. */
  const link = (label: string, url: string, x: number, yy: number, size = 9) => {
    font("normal", size, BLUE);
    doc.textWithLink(label, x, yy, { url: liveUrl(url) });
    const w = doc.getTextWidth(label);
    doc.setDrawColor(...BLUE).setLineWidth(0.4).line(x, yy + 1.5, x + w, yy + 1.5);
    return x + w + 10;
  };

  // ---------------- Cover ----------------
  onProgress?.("Cover");
  doc.setFillColor(...INK).rect(0, 0, W, H, "F");
  const wm = await loadImg("/next-2026/logos/png/next26word-white.png", 1200, true);
  if (wm) doc.addImage(wm.data, "PNG", M + 10, 120, 300, (300 * wm.h) / wm.w);
  font("bold", 34, [255, 255, 255]);
  doc.text("NEXT 2026 designer guide", M + 10, 300);
  font("normal", 13, [224, 232, 245]);
  doc.text(`Designer pack v${DESIGNER_PACK_VERSION} · ${today}`, M + 10, 326);
  doc.text("Logos, colour, gradients, templates and real examples from every NEXT venue on file.", M + 10, 346);
  font("normal", 11, [161, 251, 249]);
  let cy = 390;
  for (const [label, url] of [
    ["Open the live brand files", shareUrl ?? `${NEXT_APP_ORIGIN}/knowledge/brand-guides/next-2026`],
    ["Supplied master files (Dropbox)", NEXT_DROPBOX_URL],
  ] as const) {
    doc.textWithLink(`${label} →`, M + 10, cy, { url });
    cy += 20;
  }

  // ---------------- Contents (filled at the end) ----------------
  newPage();
  const contentsPage = doc.getNumberOfPages();

  // ---------------- How to use ----------------
  section("How to use this pack", "Start from these files. Don't redraw a lockup, pick new colours or rebuild a supplied master.");
  sub("Folders");
  for (const f of PACK_FOLDERS) para(f.dir ? `${f.dir} — ${f.body}` : f.body);
  y += 6;
  sub("File names");
  para(`Every file follows next26_<division>_<asset>_<variant>.<format>, for example ${designerFileName("Finance", "stacked", "white", "eps")}.`);
  y += 6;
  sub("Which format");
  para("EPS — print, signage, fabrication (vector). SVG — web, apps, slides (vector). PNG — transparent raster, only when vector is impossible. AI/PDF masters — edit the supplied artwork in your own tools.");
  y += 6;
  sub("What changed");
  for (const c of DESIGNER_PACK_CHANGELOG) para(`v${c.version} (${c.date}): ${c.notes.join(" ")}`);
  y += 6;
  sub("Sending work back");
  para("Upload finished work on your share page with \"Upload your design for review\". TransPerfect approves every piece before it is printed or published.");

  // ---------------- Logos ----------------
  section("Logos", "Every lockup with live links to SVG, EPS and transparent PNG. Click a format to download it.");
  const logoRows = [
    ...NEXT_DIVISIONS.flatMap((d) => d.lockups.map((l) => ({ group: d.name, label: `${l.lockupLabel} · ${l.variantLabel}`, src: l.src, dark: l.variant !== "color" }))),
    ...NEXT_MARKS.map((m) => ({ group: "NEXT marks", label: m.name, src: m.src, dark: true })),
  ];
  let lastGroup = "";
  const colW = (W - M * 2) / 3;
  let col = 0;
  for (const [i, r] of logoRows.entries()) {
    if (r.group !== lastGroup) {
      if (col) y += 70;
      col = 0;
      need(100);
      sub(r.group);
      lastGroup = r.group;
    }
    if (col === 0) need(72);
    if (i % 6 === 0) onProgress?.(`Logos ${i + 1} of ${logoRows.length}`);
    const x = M + col * colW;
    doc.setFillColor(...(r.dark ? INK : ([255, 255, 255] as [number, number, number])));
    doc.setDrawColor(220, 220, 220).roundedRect(x, y, 110, 52, 4, 4, "FD");
    const f = logoFormats(r.src);
    const im = await loadImg(f.png, 500, true);
    if (im) {
      const k = Math.min(96 / im.w, 40 / im.h);
      doc.addImage(im.data, "PNG", x + 55 - (im.w * k) / 2, y + 26 - (im.h * k) / 2, im.w * k, im.h * k);
    }
    font("normal", 9);
    doc.text(doc.splitTextToSize(r.label, colW - 130)[0] as string, x + 118, y + 16);
    let lx = x + 118;
    lx = link("SVG", f.svg, lx, y + 34);
    lx = link("EPS", f.eps, lx, y + 34);
    link("PNG", f.png, lx, y + 34);
    col = (col + 1) % 3;
    if (col === 0) y += 64;
  }
  if (col) y += 64;

  // ---------------- Colour ----------------
  section("Colour", BRAND_KIT_COLOUR_NOTE);
  for (const d of NEXT_DIVISIONS) {
    need(24);
    const [r, g, b] = d.rgb.split(",").map((n) => Number(n.trim()));
    doc.setFillColor(r, g, b).rect(M, y, 18, 18, "F");
    font("bold", 10);
    doc.text(d.name, M + 28, y + 13);
    font("normal", 10);
    doc.text(`${d.accent}   RGB ${d.rgb}   CMYK ${d.cmyk}   ${d.pantone}`, M + 200, y + 13);
    y += 24;
  }
  y += 8;
  para("Body text always prints 100K. Brand RGB is never converted to CMYK silently: use the builds listed here, and proof anything marked \"proof first\".", 9, GREY);

  // ---------------- Gradients ----------------
  section("Gradients", "Every approved ground. CMYK labelled \"approved\" comes from supplied files or the signed-off registry; \"proof first\" is a calculated offset build that needs a signed printed proof.");
  const pct = (n: number) => Math.round(n * 100);
  for (const g of kitGradients()) {
    const hexes = g.stops.map((s) => s.hex);
    const builds = londonCmykRamp(hexes);
    need(40 + hexes.length * 12);
    font("bold", 11);
    doc.text(`${g.label}`, M, y + 11);
    const lw = doc.getTextWidth(g.label);
    font("normal", 8, GREY);
    doc.text(g.family, M + lw + 8, y + 11);
    y += 16;
    const bw = 220 / hexes.length;
    hexes.forEach((h, i) => {
      const n = parseInt(h.slice(1), 16);
      doc.setFillColor((n >> 16) & 255, (n >> 8) & 255, n & 255).rect(M + i * bw, y, bw + 0.5, 18, "F");
    });
    const sy = y;
    hexes.forEach((h, i) => {
      const b = builds[i];
      const measured = g.stops[i].cmyk;
      const label = measured
        ? `${h}  CMYK ${measured}  · approved (measured)`
        : `${h}  C${pct(b.c)} M${pct(b.m)} Y${pct(b.y)} K${pct(b.k)}  · ${b.approved ? "approved" : "proof first"}`;
      font("normal", 8, b.approved || measured ? INK : [180, 40, 30]);
      doc.text(label, M + 240, sy + 8 + i * 11);
    });
    y = Math.max(y + 26, sy + 6 + hexes.length * 11) + 6;
  }
  y += 4;
  for (const r of GRADIENT_RULES) para(`${r.do ? "Do" : "Don't"} — ${r.text}`, 9);

  // ---------------- Look and feel: venues ----------------
  section(
    "Look and feel — London, QEII Centre",
    `${LONDON_PACK_ISSUE.label}. Flat proofs of the supplied print masters. Click a link to open the live master or print PDF.`,
  );
  const areas = LONDON_PACK_AREAS.filter((a) => a.kind === "artwork" && a.proofUrls.length);
  await gallery(
    areas.map((a) => ({
      img: a.proofUrls[0],
      title: a.masterFilename.replace(/\.(ai|pdf)$/i, ""),
      meta: a.pages[0] ? `${Math.round(a.pages[0].wMm)} × ${Math.round(a.pages[0].hMm)} mm artboard · RGB master` : "RGB master",
      links: [
        ["Master", a.masterUrl],
        ...(a.printUrl ? ([["Print PDF", a.printUrl]] as [string, string][]) : []),
      ] as [string, string][],
    })),
    "London",
  );

  section("Look and feel — templates in use", "Every supplied template with a saved example, grouped by piece. Captions show division and size; links open the live master.");
  for (const fam of families) {
    const rows = fam.templates.filter((t) => t.exampleUrl);
    need(230);
    sub(`${fam.label} (${rows.length})`);
    if (!rows.length) {
      para("Not yet produced.", 9, GREY);
      continue;
    }
    await gallery(
      rows.map((t) => ({
        img: t.exampleUrl!,
        title: `${t.divisionName} — ${t.format}`,
        meta: t.size,
        links: [
          ...(t.downloadUrl ? ([["Master", t.downloadUrl]] as [string, string][]) : []),
          ...(t.secondaryUrl ? ([[t.secondaryLabel ?? "Source", t.secondaryUrl]] as [string, string][]) : []),
        ],
      })),
      fam.label,
    );
  }

  // ---------------- Rules ----------------
  section("Rules");
  sub("Logos");
  for (const r of NEXT_LOGO_RULES) para(`${r.do ? "Do" : "Don't"} — ${r.title}. ${r.body}`, 9);
  sub("Resizing");
  RESIZE_RULES.forEach((r, i) => para(`${i + 1}. ${r}`, 9));
  sub("Reuse");
  para(`Copy: ${REUSE_RULES.copy}`, 9);
  para(`Change: ${REUSE_RULES.change}`, 9);
  para(`Never change: ${REUSE_RULES.never}`, 9);

  // ---------------- Contents ----------------
  doc.setPage(contentsPage);
  font("bold", 22);
  doc.text("Contents", M, M + 22);
  let ty = M + 60;
  for (const s of sections) {
    font("normal", 12);
    doc.textWithLink(s.title, M, ty, { pageNumber: s.page });
    doc.text(String(s.page), W - M, ty, { align: "right" });
    doc.setDrawColor(230, 230, 230).line(M, ty + 6, W - M, ty + 6);
    doc.outline.add(null, s.title, { pageNumber: s.page });
    ty += 24;
  }

  // ---------------- Footer on every page ----------------
  const pages = doc.getNumberOfPages();
  for (let p = 2; p <= pages; p++) {
    doc.setPage(p);
    font("normal", 8, GREY);
    doc.text(`TransPerfect NEXT 2026 · Designer pack v${DESIGNER_PACK_VERSION} · ${today}`, M, H - 20);
    doc.text(`${p} / ${pages}`, W - M, H - 20, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));

  async function gallery(items: { img: string; title: string; meta: string; links: [string, string][] }[], label: string) {
    const cols = 4;
    const cw = (W - M * 2 - (cols - 1) * 14) / cols;
    const ih = 150;
    let c = 0;
    for (const [i, it] of items.entries()) {
      if (c === 0) need(ih + 44);
      if (i % 4 === 0) onProgress?.(`${label} examples ${i + 1} of ${items.length}`);
      const x = M + c * (cw + 14);
      doc.setFillColor(242, 242, 242).rect(x, y, cw, ih, "F");
      const im = await loadImg(it.img, 560);
      if (im) {
        const k = Math.min(cw / im.w, ih / im.h);
        doc.addImage(im.data, "JPEG", x + (cw - im.w * k) / 2, y + (ih - im.h * k) / 2, im.w * k, im.h * k);
        doc.link(x, y, cw, ih, { url: liveUrl(it.links[0]?.[1] ?? it.img) });
      } else {
        font("normal", 8, GREY);
        doc.text("Preview unavailable", x + 8, y + 16);
      }
      font("bold", 8);
      doc.text(doc.splitTextToSize(it.title, cw)[0] as string, x, y + ih + 11);
      font("normal", 7, GREY);
      doc.text(doc.splitTextToSize(it.meta, cw)[0] as string, x, y + ih + 21);
      let lx = x;
      for (const [l, u] of it.links) lx = link(l, u, lx, y + ih + 32, 7.5);
      c = (c + 1) % cols;
      if (c === 0) y += ih + 44;
    }
    if (c) y += ih + 44;
  }
}
