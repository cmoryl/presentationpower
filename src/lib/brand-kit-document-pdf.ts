import { jsPDF } from "jspdf";
import { NEXT_APP_ORIGIN } from "@/lib/next-event";
import { BRAND } from "@/lib/brand-colors";
import { classifyKitParagraphs, kitColourRows, kitContrast, selectKitDocumentSections, type KitBlock, type KitDocument, type KitDocumentAsset, type KitDocumentSection } from "@/lib/brand-kit-document";
import poppinsRegular from "@/assets/fonts-live/Poppins-Regular.ttf.asset.json";
import poppinsBold from "@/assets/fonts-live/Poppins-Bold.ttf.asset.json";

export function kitPdfUrl(path: string): string {
  const url = new URL(path, NEXT_APP_ORIGIN);
  if (url.protocol !== "https:") throw new Error("PDF links must use HTTPS.");
  return url.href;
}
type RGB = [number, number, number];
const rgb = (hex: string): RGB => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as RGB;
async function file(url: string) { const r = await fetch(url); if (!r.ok) throw new Error(`Could not load PDF resource (${r.status}).`); return new Uint8Array(await r.arrayBuffer()); }
function base64(b: Uint8Array) { let s = ""; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); return btoa(s); }
async function image(src: string, filter?: string): Promise<{ data: string; w: number; h: number }> {
  const url = src.startsWith("https://brandhubcreator.lovable.app/") ? `/api/public/brandhub-image?path=${encodeURIComponent(new URL(src).pathname)}` : src;
  const r = await fetch(url); if (!r.ok) throw new Error(`Artwork preview unavailable (${r.status}).`);
  const blob = await r.blob(); const object = URL.createObjectURL(blob);
  try {
    const img = new Image(); img.src = object; await img.decode();
    const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.naturalWidth * scale)); c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = c.getContext("2d"); if (!ctx) throw new Error("Image conversion unavailable.");
    if (filter) ctx.filter = filter;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return { data: c.toDataURL("image/png"), w: c.width, h: c.height };
  } finally { URL.revokeObjectURL(object); }
}

/**
 * Brand-kit PDF: A4 landscape on a 12-column grid. Cover → at-a-glance sheet →
 * contents → numbered sections whose content is laid out by kind (spec tables,
 * type specimens, do/don't cards, swatch cards with contrast, asset cards with
 * linked format chips). Copy is authored upstream; this file only lays it out.
 */
export async function buildKitDocumentPdf(model: KitDocument, ids: string[], progress?: (message: string) => void) {
  const sections = selectKitDocumentSections(model, ids);
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape", compress: true });
  const fonts = model.font === "Poppins" ? [poppinsRegular.url, poppinsBold.url] : ["/fonts/Geist-Regular.ttf", "/fonts/Geist-Bold.ttf"];
  const bytes = await Promise.all(fonts.map(file));
  for (const [i, b] of bytes.entries()) { const name = `${model.font}-${i}.ttf`; doc.addFileToVFS(name, base64(b)); doc.addFont(name, model.font, i ? "bold" : "normal"); }

  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const M = 42, G = 16, TOP = 92, BOTTOM = H - 48, CW = W - 2 * M, MEASURE = 520;
  const ink = rgb(BRAND.ink), muted = rgb(BRAND.darkGray), white = rgb(BRAND.white), line = rgb(BRAND.blueWhite), tint = rgb(BRAND.lightGray);
  const okC = rgb("#1F7A3A"), noC = rgb(BRAND.red);
  const primary = rgb(model.primary), accent = rgb(model.accent);
  const missing: string[] = []; const contents: { no: string; title: string; page: number }[] = [];
  let y = TOP, current = { no: "", title: "" };
  const imgCache = new Map<string, Awaited<ReturnType<typeof image>> | null>();
  async function img(src: string, label: string, filter?: string) {
    const key = filter ? `${src}#${filter}` : src;
    if (!imgCache.has(key)) { try { imgCache.set(key, await image(src, filter)); } catch { imgCache.set(key, null); missing.push(label); } }
    return imgCache.get(key) ?? null;
  }
  const fit = (im: { w: number; h: number }, w: number, h: number) => Math.min(w / im.w, h / im.h);

  const font = (size: number, bold = false, colour: RGB = ink) => doc.setFont(model.font, bold ? "bold" : "normal").setFontSize(size).setTextColor(...colour);
  const wrap = (t: string, w: number) => doc.splitTextToSize(t, w) as string[];
  const eyebrow = (t: string, x: number, yy: number, colour: RGB = muted) => { font(7.5, true, colour); doc.setCharSpace(1.1); doc.text(t.toUpperCase(), x, yy); doc.setCharSpace(0); };

  function newPage() {
    doc.addPage(); y = TOP;
    eyebrow(model.name, M, 30);
    if (current.title) { font(8, false, muted); doc.text(`${current.no}  ${current.title}`, W - M, 30, { align: "right" }); }
    doc.setDrawColor(...line).setLineWidth(0.6).line(M, 40, W - M, 40);
  }
  // Headings are queued and drawn by the next block's need(), so a title always moves with its first content.
  let pending: { h: number; fresh?: boolean; draw: () => void }[] = [];
  function need(h: number) {
    const ph = pending.reduce((n, p) => n + p.h, 0); let broke = false;
    if (y + ph + h > BOTTOM) { newPage(); broke = true; }
    const queue = pending; pending = [];
    for (const p of queue) { if (broke && p.fresh) continue; p.draw(); }
    return broke;
  }
  function heading(t: string) { pending.push({ h: 26, draw: () => { font(13, true); doc.text(t, M, y + 12); y += 26; } }); }
  function chip(label: string, url: string, x: number, yy: number, maxX: number) {
    font(8, true, primary); const w = Math.min(doc.getTextWidth(label) + 18, maxX - x);
    doc.setDrawColor(...primary).setLineWidth(0.7).roundedRect(x, yy, w, 18, 9, 9, "S");
    doc.text(wrap(label, w - 14)[0], x + 9, yy + 12.2); doc.link(x, yy, w, 18, { url: kitPdfUrl(url) });
    return w;
  }
  function chips(links: { label: string; url: string }[], x: number, yy: number, width: number, measure = false) {
    let cx = x, cy = yy;
    for (const l of links) { font(8, true); const w = Math.min(doc.getTextWidth(l.label) + 18, width); if (cx + w > x + width) { cx = x; cy += 24; } if (!measure) chip(l.label, l.url, cx, cy, x + width); cx += w + 6; }
    return links.length ? cy - yy + 18 : 0;
  }
  function icon(ok: boolean, x: number, yy: number) {
    doc.setFillColor(...(ok ? okC : noC)).circle(x + 7, yy + 7, 7, "F"); doc.setDrawColor(...white).setLineWidth(1.4);
    if (ok) { doc.line(x + 3.6, yy + 7.2, x + 6.2, yy + 9.8); doc.line(x + 6.2, yy + 9.8, x + 10.6, yy + 4.4); }
    else { doc.line(x + 4.4, yy + 4.4, x + 9.6, yy + 9.6); doc.line(x + 9.6, yy + 4.4, x + 4.4, yy + 9.6); }
  }

  // ---------- Blocks ----------
  function text(t: string) {
    font(10.5); for (const l of wrap(t, MEASURE)) { need(15); font(10.5); doc.text(l, M, y + 10.5); y += 15; } y += 8;
  }
  function specs(rows: Extract<KitBlock, { kind: "spec" }>[]) {
    const lw = 190; y += 4;
    for (const r of rows) {
      font(10); const v = wrap(r.value, CW - lw - 12); const h = Math.max(1, v.length) * 14 + 12;
      need(h); doc.setDrawColor(...line).setLineWidth(0.6).line(M, y, W - M, y);
      font(9, true, muted); doc.text(wrap(r.label, lw - 10), M, y + 15); font(10); doc.text(v, M + lw, y + 15); y += h;
    }
    doc.setDrawColor(...line).line(M, y, W - M, y); y += 18;
  }
  function types(rows: Extract<KitBlock, { kind: "type" }>[]) {
    heading("Type specimens");
    for (const t of rows) {
      const pt = Math.max(9, Math.min(36, t.size * 0.75)); font(pt, t.weight >= 600); const s = wrap(t.sample, CW - 190); const h = Math.max(44, s.slice(0, 2).length * pt * 1.2 + 18);
      need(h); doc.setDrawColor(...line).setLineWidth(0.6).line(M, y, W - M, y);
      font(10, true); doc.text(t.label, M, y + 18); font(8.5, false, muted); doc.text(`${t.size}px · ${t.weight} · ${model.font}`, M, y + 32);
      font(pt, t.weight >= 600); doc.text(s.slice(0, 2), M + 190, y + 10 + pt); y += h;
    }
    y += 16;
  }
  function rules(rows: Extract<KitBlock, { kind: "rule" }>[]) {
    heading("Do and don't");
    const cols = 3, w = (CW - G * (cols - 1)) / cols;
    const ordered = [...rows.filter(r => r.do), ...rows.filter(r => !r.do)];
    for (let i = 0; i < ordered.length; i += cols) {
      const row = ordered.slice(i, i + cols); font(9.5);
      const h = Math.max(...row.map(r => wrap(r.text, w - 46).length)) * 13 + 40;
      need(h + G);
      row.forEach((r, j) => {
        const x = M + j * (w + G); doc.setFillColor(...tint).roundedRect(x, y, w, h, 4, 4, "F");
        doc.setFillColor(...(r.do ? okC : noC)).rect(x, y, 3, h, "F");
        icon(r.do, x + 14, y + 13); eyebrow(r.do ? "Do" : "Don't", x + 34, y + 23, r.do ? okC : noC);
        font(9.5); doc.text(wrap(r.text, w - 46), x + 34, y + 39);
      });
      y += h + G;
    }
    y += 4;
  }
  function colours(list: NonNullable<KitDocumentSection["colours"]>) {
    heading("Colour values");
    const cols = 4, w = (CW - G * (cols - 1)) / cols;
    for (let i = 0; i < list.length; i += cols) {
      const row = list.slice(i, i + cols);
      const details = row.map(c => kitColourRows(c.hex, c.detail));
      font(8.5); const h = 84 + 32 + 14 + Math.max(...details.map(d => d.reduce((n, v) => n + wrap(v, w - 20).length, 0))) * 12 + 34;
      need(h + G);
      row.forEach((c, j) => {
        const x = M + j * (w + G);
        doc.setDrawColor(...line).setLineWidth(0.8).roundedRect(x, y, w, h, 4, 4, "S");
        doc.setFillColor(...rgb(c.hex)).roundedRect(x, y, w, 84, 4, 4, "F").rect(x, y + 70, w, 14, "F");
        const onWhite = kitContrast(c.hex, BRAND.white), onInk = kitContrast(c.hex, BRAND.ink);
        font(16, true, onWhite >= onInk ? white : ink); doc.text("Aa", x + 10, y + 26);
        font(11, true); doc.text(wrap(c.name, w - 20)[0], x + 10, y + 102); font(9, true, primary); doc.text(c.hex.toUpperCase(), x + 10, y + 115);
        let yy = y + 131; font(8.5, false, muted);
        for (const d of details[j]) { const ls = wrap(d, w - 20); font(8.5, /^(RGB|CMYK|Pantone)\b/.test(d), /Not supplied/.test(d) ? noC : /^(RGB|CMYK|Pantone)\b/.test(d) ? ink : muted); doc.text(ls, x + 10, yy); yy += ls.length * 12; }
        const badge = (label: string, r: number, by: number) => { const pass = r >= 4.5; font(7.5, true, pass ? okC : muted); doc.text(`${label} ${r.toFixed(1)}:1 · ${pass ? "AA" : r >= 3 ? "AA large only" : "not for text"}`, x + 10, by); };
        doc.setDrawColor(...line).line(x + 10, y + h - 36, x + w - 10, y + h - 36);
        badge("On white", onWhite, y + h - 22); badge("On ink", onInk, y + h - 10);
      });
      y += h + G;
    }
    font(8, false, muted); need(14); doc.text("Contrast is WCAG 2.x for text in this colour on white / ink. AA = 4.5:1 body text; AA large = 3:1 for 18pt+ or bold 14pt+.", M, y + 4); y += 22;
  }
  async function assets(list: KitDocumentAsset[]) {
    const hasImg = list.some(a => a.image), cols = 3, w = (CW - G * (cols - 1)) / cols, imgH = hasImg ? 200 : 0;
    for (let i = 0; i < list.length; i += cols) {
      const row = list.slice(i, i + cols);
      const meta = row.map(a => { font(12, true); const t = wrap(a.title, w - 24); font(9); const n = a.note ? wrap(a.note, w - 24) : []; return { t, n, ch: chips(a.links, 0, 0, w - 24, true) }; });
      const h = (row.some(a => a.image) ? imgH : 0) + Math.max(...meta.map(m => m.t.length * 15 + m.n.length * 12 + m.ch)) + 44;
      need(h + G);
      for (const [j, a] of row.entries()) {
        const x = M + j * (w + G), m = meta[j];
        doc.setDrawColor(...line).setLineWidth(0.8).roundedRect(x, y, w, h, 4, 4, "S");
        let yy = y + 18;
        if (imgH && a.image) {
          doc.setFillColor(...(a.ground ? rgb(a.ground) : tint)).roundedRect(x, y, w, imgH, 4, 4, "F").rect(x, y + imgH - 6, w, 6, "F");
          const im = await img(a.image, a.title);
          if (im) { const k = Math.min((w - 28) / im.w, (imgH - 24) / im.h); doc.addImage(im.data, "PNG", x + (w - im.w * k) / 2, y + (imgH - im.h * k) / 2, im.w * k, im.h * k, undefined, "FAST"); }
          else { font(9, false, muted); doc.text("Preview unavailable — use the linked original", x + 16, y + imgH / 2); }
          yy = y + imgH + 20;
        } else if (imgH) yy = y + 18;
        font(12, true); doc.text(m.t, x + 12, yy); yy += m.t.length * 15;
        if (m.n.length) { font(9, false, muted); doc.text(m.n, x + 12, yy); yy += m.n.length * 12; }
        chips(a.links, x + 12, yy + 2, w - 24);
      }
      y += h + G;
    }
  }


  // ---------- Visual example blocks ----------
  async function safeZone(z: NonNullable<KitDocumentSection["safeZone"]>) {
    heading("Clear space");
    const im = await img(z.image, "Clear-space logo"); if (!im) return;
    const lh = 54, lw = Math.min(260, im.w * (lh / im.h)), x = lh, pad = x * z.ratio;
    const bw = lw + pad * 2, bh = lh + pad * 2, ph = bh + 40;
    need(ph + G);
    doc.setFillColor(...tint).roundedRect(M, y, CW, ph, 4, 4, "F");
    const bx = M + 30, by = y + 20;
    doc.setFillColor(...(z.ground ? rgb(z.ground) : white)).rect(bx, by, bw, bh, "F");
    doc.setDrawColor(...accent).setLineWidth(0.8); doc.setLineDashPattern([4, 3], 0); doc.rect(bx, by, bw, bh, "S"); doc.rect(bx + pad, by + pad, lw, lh, "S"); doc.setLineDashPattern([], 0);
    const k = Math.min(lw / im.w, lh / im.h); doc.addImage(im.data, "PNG", bx + pad, by + pad + (lh - im.h * k) / 2, im.w * k, im.h * k, undefined, "FAST");
    font(8, true, accent);
    // dimension marks on each side
    const mark = (x1: number, y1: number, x2: number, y2: number, lx: number, ly: number) => { doc.setDrawColor(...accent).setLineWidth(0.6).line(x1, y1, x2, y2); doc.text(`${z.ratio}x`, lx, ly, { align: "center" }); };
    mark(bx, by + bh / 2, bx + pad, by + bh / 2, bx + pad / 2, by + bh / 2 - 4);
    mark(bx + pad + lw, by + bh / 2, bx + bw, by + bh / 2, bx + bw - pad / 2, by + bh / 2 - 4);
    mark(bx + bw / 2, by, bx + bw / 2, by + pad, bx + bw / 2 + 12, by + pad / 2);
    mark(bx + bw / 2, by + pad + lh, bx + bw / 2, by + bh, bx + bw / 2 + 12, by + bh - pad / 2);
    const tx = bx + bw + 32, tw = M + CW - tx - 24;
    eyebrow("Rule", tx, y + 34, accent); font(11, true); const r = wrap(z.rule, tw); doc.text(r, tx, y + 52);
    font(9, false, muted); doc.text(wrap("x = height of the T symbol at the size used. Dashed outer line = minimum clear space; inner line = logo bounds. Diagram is to proportion, not to print scale.", tw), tx, y + 60 + r.length * 14);
    y += ph + G;
  }
  async function misuse(src: string) {
    heading("Logo misuse");
    const cards: { label: string; draw: (x: number, yy: number, w: number, h: number) => Promise<void> }[] = [
      { label: "Don't stretch or distort", draw: async (x, yy, w, h) => { const im = await img(src, "Misuse logo"); if (im) { const k = fit(im, w - 40, h - 40); doc.addImage(im.data, "PNG", x + 10, yy + (h - im.h * k * 0.55) / 2, w - 20, im.h * k * 0.55, undefined, "FAST"); } } },
      { label: "Don't recolour", draw: async (x, yy, w, h) => { const im = await img(src, "Misuse logo", "hue-rotate(150deg) saturate(2.5)"); if (im) { const k = fit(im, w - 40, h - 40); doc.addImage(im.data, "PNG", x + (w - im.w * k) / 2, yy + (h - im.h * k) / 2, im.w * k, im.h * k, undefined, "FAST"); } } },
      { label: "Don't add keylines or outlines", draw: async (x, yy, w, h) => { const im = await img(src, "Misuse logo"); if (im) { const k = fit(im, w - 50, h - 50); const iw = im.w * k, ih = im.h * k, ix = x + (w - iw) / 2, iy = yy + (h - ih) / 2; doc.setDrawColor(...noC).setLineWidth(2).roundedRect(ix - 8, iy - 8, iw + 16, ih + 16, 4, 4, "S"); doc.addImage(im.data, "PNG", ix, iy, iw, ih, undefined, "FAST"); } } },
      { label: "Don't use busy grounds", draw: async (x, yy, w, h) => { for (let i = 0; i < 9; i++) { const c = [primary, accent, tint, noC, okC][i % 5]; doc.setFillColor(...c).rect(x + (i % 3) * (w / 3), yy + Math.floor(i / 3) * (h / 3), w / 3, h / 3, "F"); } const im = await img(src, "Misuse logo"); if (im) { const k = fit(im, w - 40, h - 40); doc.addImage(im.data, "PNG", x + (w - im.w * k) / 2, yy + (h - im.h * k) / 2, im.w * k, im.h * k, undefined, "FAST"); } } },
    ];
    const cols = 4, w = (CW - G * (cols - 1)) / cols, ih = 110, h = ih + 34;
    need(h + G);
    for (const [j, c] of cards.entries()) {
      const x = M + j * (w + G); doc.setFillColor(...white).setDrawColor(...line).setLineWidth(0.8).roundedRect(x, y, w, h, 4, 4, "FD");
      await c.draw(x, y, w, ih); doc.setFillColor(...noC).rect(x, y + ih, w, 2, "F");
      icon(false, x + 10, y + ih + 10); font(9, true); doc.text(wrap(c.label, w - 40)[0], x + 30, y + ih + 21);
    }
    y += h + G;
  }
  async function iconGrid(list: NonNullable<KitDocumentSection["icons"]>) {
    heading("Approved icon examples");
    const [{ renderToStaticMarkup }, { createElement }, { iconByName }] = await Promise.all([import("react-dom/server"), import("react"), import("@/lib/icon-library")]);
    const cols = 8, w = (CW - 8 * (cols - 1)) / cols, h = 78;
    for (let i = 0; i < list.length; i += cols) {
      need(h + 8);
      for (const [j, it] of list.slice(i, i + cols).entries()) {
        const x = M + j * (w + 8); doc.setFillColor(...tint).roundedRect(x, y, w, h, 4, 4, "F");
        const Icon = iconByName(it.name);
        if (Icon) { const svg = renderToStaticMarkup(createElement(Icon, { size: 96, color: it.colour, strokeWidth: 1.75 })).replace(/^<svg(?![^>]*xmlns=)/, '<svg xmlns="http://www.w3.org/2000/svg"'); const im = await img(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, `Icon ${it.label}`); if (im) doc.addImage(im.data, "PNG", x + (w - 30) / 2, y + 12, 30, 30, undefined, "FAST"); }
        font(7.5, true); doc.text(wrap(it.label, w - 10)[0], x + w / 2, y + 58, { align: "center" }); font(6.5, false, muted); doc.text(it.name, x + w / 2, y + 68, { align: "center" });
      }
      y += h + 8;
    }
    font(8, false, muted); need(14); doc.text("Outline icons, 1.75 stroke on a 24 grid, one approved colour per layout. Download the full set as SVG or PNG from the live guide.", M, y + 6); y += 22;
  }
  async function galleryGrid(list: NonNullable<KitDocumentSection["gallery"]>) {
    heading("Example imagery");
    const cols = 3, w = (CW - G * (cols - 1)) / cols, h = w * 0.5;
    for (let i = 0; i < list.length; i += cols) {
      need(h + 20 + G);
      for (const [j, it] of list.slice(i, i + cols).entries()) {
        const x = M + j * (w + G); const im = await img(it.image, it.title);
        doc.setFillColor(...tint).roundedRect(x, y, w, h, 4, 4, "F");
        if (im) { const k = Math.max(w / im.w, h / im.h); const sw = w / k, sh = h / k; const c = document.createElement("canvas"); c.width = Math.round(sw); c.height = Math.round(sh); const el = new Image(); el.src = im.data; await el.decode(); c.getContext("2d")?.drawImage(el, (im.w - sw) / 2, (im.h - sh) / 2, sw, sh, 0, 0, sw, sh); doc.addImage(c.toDataURL("image/jpeg", 0.85), "JPEG", x, y, w, h, undefined, "FAST"); }
        font(8.5, true); doc.text(it.title, x, y + h + 13);
      }
      y += h + 20 + G;
    }
    font(8, false, muted); need(14); doc.text("Samples from the approved imagery pool used across decks and exports. Photography leads hero layouts; abstracts back stats, quotes and dividers.", M, y + 2); y += 20;
  }
  function balanceBar(list: NonNullable<KitDocumentSection["balance"]>) {
    heading("Colour balance");
    need(80); let x = M;
    for (const c of list) { const w = CW * c.share / 100; doc.setFillColor(...rgb(c.hex)).rect(x, y, w, 40, "F"); const on = kitContrast(c.hex, BRAND.white) >= kitContrast(c.hex, BRAND.ink) ? white : ink; font(9, true, on); if (w > 60) doc.text(`${c.share}%`, x + 8, y + 16); font(7.5, false, on); if (w > 60) doc.text(wrap(c.name, w - 14)[0], x + 8, y + 30); x += w; }
    doc.setDrawColor(...line).rect(M, y, CW, 40, "S"); y += 50;
    font(8, false, muted); doc.text("Illustrative proportion for a typical layout: lead colour dominant, neutrals for space, secondary accents kept to about 10%.", M, y + 4); y += 22;
  }
  function typeExample(t: NonNullable<KitDocumentSection["typeExample"]>) {
    heading("Hierarchy in use");
    const h = 150; need(h + G);
    doc.setFillColor(...primary).roundedRect(M, y, CW, h, 4, 4, "F");
    eyebrow("Eyebrow · 11pt bold, tracked", M + 28, y + 30, white);
    font(26, true, white); doc.text(wrap(t.heading, CW - 56).slice(0, 2), M + 28, y + 62);
    font(11, false, white); doc.text(wrap(t.body, Math.min(MEASURE, CW - 56)).slice(0, 3), M + 28, y + 108);
    doc.setFillColor(...accent).rect(M + 28, y + h - 18, 40, 3, "F");
    y += h + G;
  }

  // ---------- Cover ----------
  progress?.("Designing cover…");
  doc.setFillColor(...primary).rect(0, 0, W, H, "F");
  doc.setFillColor(...accent).rect(M, 62, 40, 4, "F");
  eyebrow("Brand kit", M, 52, white);
  const panel = { x: W - M - 300, y: 62, w: 300, h: 300 };
  if (model.cover) {
    doc.setFillColor(...white).roundedRect(panel.x, panel.y, panel.w, panel.h, 6, 6, "F");
    const im = await img(model.cover, "Cover artwork");
    if (im) { const k = Math.min((panel.w - 56) / im.w, (panel.h - 56) / im.h); doc.addImage(im.data, "PNG", panel.x + (panel.w - im.w * k) / 2, panel.y + (panel.h - im.h * k) / 2, im.w * k, im.h * k); }
  }
  const textW = (model.cover ? panel.x - M - 32 : CW);
  font(38, true, white); const coverLines = wrap(model.name, textW); doc.text(coverLines, M, 130); let cy = 130 + coverLines.length * 44;
  font(11, false, white); const intro = wrap(model.intro, Math.min(textW, MEASURE)).slice(0, 7); doc.text(intro, M, cy + 6); cy += intro.length * 16 + 20;
  if (model.publicUrl) { font(10, true, primary); const label = "Open the public brand kit  →"; const bw = doc.getTextWidth(label) + 28; doc.setFillColor(...white).roundedRect(M, cy, bw, 28, 14, 14, "F"); doc.text(label, M + 14, cy + 18); doc.link(M, cy, bw, 28, { url: kitPdfUrl(model.publicUrl) }); }
  const meta: [string, string][] = [["Version", `v${model.version}`], ["Issued", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })], ["Colour space", "RGB reference"], ["Includes", `${sections.length} of ${model.sections.length} sections`]];
  const mw = CW / meta.length; doc.setDrawColor(...white).setLineWidth(0.5).line(M, H - 92, W - M, H - 92);
  meta.forEach(([k, v], i) => { eyebrow(k, M + i * mw, H - 72, white); font(12, true, white); doc.text(v, M + i * mw, H - 54); });
  font(8, false, white); doc.text("Previews in this PDF are references, not press masters. Use the linked original files for production.", M, H - 26);

  // ---------- At a glance ----------
  progress?.("Building quick reference…");
  current = { no: "", title: "At a glance" }; newPage();
  font(24, true); doc.text("At a glance", M, 74);
  const allColours = sections.flatMap(s => s.colours ?? []).slice(0, 10);
  const allRules = sections.flatMap(s => classifyKitParagraphs(s.paragraphs)).filter((b): b is Extract<KitBlock, { kind: "rule" }> => b.kind === "rule");
  const leftW = 250;
  doc.setFillColor(...tint).roundedRect(M, 96, leftW, 190, 4, 4, "F");
  if (model.cover) { const im = await img(model.cover, "Cover artwork"); if (im) { const k = Math.min((leftW - 48) / im.w, 150 / im.h); doc.addImage(im.data, "PNG", M + (leftW - im.w * k) / 2, 96 + (190 - im.h * k) / 2, im.w * k, im.h * k); } }
  eyebrow("Typeface", M, 312); font(20, true); doc.text(model.font, M, 336); font(10, false, muted); doc.text("Regular · Bold", M, 352);
  font(30, true); doc.text("Aa Bb 123", M, 396);
  const rx = M + leftW + 32, rw = W - M - rx;
  if (allColours.length) {
    eyebrow("Palette", rx, 104); const sw = (rw - 6 * (allColours.length - 1)) / allColours.length;
    allColours.forEach((c, i) => { const x = rx + i * (sw + 6); doc.setFillColor(...rgb(c.hex)).roundedRect(x, 112, sw, 58, 3, 3, "F"); doc.setDrawColor(...line).roundedRect(x, 112, sw, 58, 3, 3, "S"); font(7.5, true); doc.text(wrap(c.name, sw)[0], x, 182); font(7.5, false, muted); doc.text(c.hex.toUpperCase(), x, 193); });
  }
  let gy = allColours.length ? 222 : 104; const half = (rw - G) / 2;
  for (const [ok, label] of [[true, "Always"], [false, "Never"]] as const) {
    const x = ok ? rx : rx + half + G; let yy = gy; eyebrow(label, x, yy, ok ? okC : noC); yy += 14;
    const list = allRules.filter(r => r.do === ok).slice(0, 4);
    if (!list.length) { font(9, false, muted); doc.text("None supplied for this kit.", x, yy + 8); }
    for (const r of list) { font(9); const ls = wrap(r.text, half - 22).slice(0, 3); if (yy + ls.length * 12 > BOTTOM - 70) break; icon(ok, x, yy); doc.text(ls, x + 22, yy + 10); yy += ls.length * 12 + 10; }
  }
  const quick = sections.flatMap(s => s.assets ?? []).flatMap(a => a.links).filter((l, i, a) => a.findIndex(o => o.url === l.url) === i).slice(0, 8);
  if (quick.length) { eyebrow("Quick downloads", rx, BOTTOM - 46); chips(quick, rx, BOTTOM - 38, rw); }

  // ---------- Contents ----------
  current = { no: "", title: "Contents" }; newPage(); const tocPage = doc.getNumberOfPages();
  font(24, true); doc.text("Contents", M, 74);

  // ---------- Sections ----------
  for (const [i, section] of sections.entries()) {
    progress?.(`Designing ${section.title}…`);
    current = { no: String(i + 1).padStart(2, "0"), title: section.title };
    const no = current.no, title = section.title;
    if (i === 0) newPage(); else pending.push({ h: 44, fresh: true, draw: () => { y += 18; doc.setDrawColor(...line).setLineWidth(0.6).line(M, y, W - M, y); y += 26; } });
    font(24, true); const tl = wrap(title, CW - 90); const headH = Math.max(48, tl.length * 28 + 18) + 25;
    pending.push({ h: headH, draw: () => {
      current = { no, title }; contents.push({ no, title, page: doc.getNumberOfPages() });
      font(44, true, accent); doc.text(no, M, y + 30); font(24, true); doc.text(tl, M + 84, y + 26); y += headH - 25;
      doc.setFillColor(...primary).rect(M, y, 40, 3, "F"); y += 22;
    } });
    const blocks = classifyKitParagraphs(section.paragraphs);
    for (const b of blocks) if (b.kind === "text") text(b.text);
    const sp = blocks.filter((b): b is Extract<KitBlock, { kind: "spec" }> => b.kind === "spec"); if (sp.length) specs(sp);
    const ty = blocks.filter((b): b is Extract<KitBlock, { kind: "type" }> => b.kind === "type"); if (ty.length) types(ty);
    const ru = blocks.filter((b): b is Extract<KitBlock, { kind: "rule" }> => b.kind === "rule"); if (ru.length) rules(ru);
    if (section.typeExample) typeExample(section.typeExample);
    if (section.safeZone) await safeZone(section.safeZone);
    if (section.misuse) await misuse(section.misuse.image);
    if (section.colours?.length) colours(section.colours);
    if (section.balance?.length) balanceBar(section.balance);
    if (section.icons?.length) await iconGrid(section.icons);
    if (section.gallery?.length) await galleryGrid(section.gallery);
    if (section.assets?.length) { if (blocks.length || section.colours?.length) heading("Files & downloads"); await assets(section.assets); }
    if (pending.length) need(0);
  }

  // ---------- Contents fill, outline, footers ----------
  doc.setPage(tocPage); const half2 = (CW - 48) / 2, perCol = Math.floor((BOTTOM - 110) / 34);
  contents.forEach((e, i) => {
    const col = Math.floor(i / perCol); if (col > 1) return; const x = M + col * (half2 + 48), yy = 116 + (i % perCol) * 34;
    font(14, true, accent); doc.text(e.no, x, yy); font(12, true); doc.text(wrap(e.title, half2 - 90)[0], x + 36, yy); font(10, false, muted); doc.text(String(e.page), x + half2, yy, { align: "right" });
    doc.setDrawColor(...line).setLineWidth(0.6).line(x, yy + 12, x + half2, yy + 12); doc.link(x, yy - 14, half2, 26, { pageNumber: e.page });
  });
  eyebrow("Reading this document", M, BOTTOM - 30); font(8.5, false, muted);
  doc.text("Outlined pills are live download links. Contrast badges use WCAG 2.x. \"Proof first\" values need a printer proof before production.", M, BOTTOM - 16);
  const outline = (doc as unknown as { outline?: { add: (p: unknown, t: string, o: { pageNumber: number }) => unknown } }).outline;
  if (outline) { outline.add(null, "Cover", { pageNumber: 1 }); outline.add(null, "At a glance", { pageNumber: 2 }); outline.add(null, "Contents", { pageNumber: tocPage }); for (const e of contents) outline.add(null, `${e.no} ${e.title}`, { pageNumber: e.page }); }
  const total = doc.getNumberOfPages();
  for (let p = 2; p <= total; p++) { doc.setPage(p); font(7.5, false, muted); doc.text(`${model.name} · Brand kit v${model.version} · RGB reference, not a press master`, M, H - 22); doc.text(`${p} / ${total}`, W - M, H - 22, { align: "right" }); }
  doc.setProperties({ title: `${model.name} brand kit v${model.version}`, subject: sections.map(s => s.title).join(" · "), creator: "TransPerfect Element", keywords: "brand kit, logos, colour, typography" });
  return { blob: new Blob([doc.output("arraybuffer")], { type: "application/pdf" }), filename: `${model.id}-brand-kit-v${model.version.replace(/[^a-zA-Z0-9.-]/g, "-")}${sections.length !== model.sections.length ? "-selected" : ""}.pdf`, missing };
}
