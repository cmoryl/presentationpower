import { jsPDF } from "jspdf";
import { NEXT_APP_ORIGIN } from "@/lib/next-event";
import { selectKitDocumentSections, type KitDocument, type KitDocumentAsset } from "@/lib/brand-kit-document";
import poppinsRegular from "@/assets/fonts-live/Poppins-Regular.ttf.asset.json";
import poppinsBold from "@/assets/fonts-live/Poppins-Bold.ttf.asset.json";

export function kitPdfUrl(path: string): string {
  const url = new URL(path, NEXT_APP_ORIGIN);
  if (url.protocol !== "https:") throw new Error("PDF links must use HTTPS.");
  return url.href;
}
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
async function file(url: string) { const r = await fetch(url); if (!r.ok) throw new Error(`Could not load PDF resource (${r.status}).`); return new Uint8Array(await r.arrayBuffer()); }
function base64(b: Uint8Array) { let s = ""; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); return btoa(s); }
async function image(src: string): Promise<{ data: string; w: number; h: number }> {
  const url = src.startsWith("https://brandhubcreator.lovable.app/") ? `/api/public/brandhub-image?path=${encodeURIComponent(new URL(src).pathname)}` : src;
  const r = await fetch(url); if (!r.ok) throw new Error(`Artwork preview unavailable (${r.status}).`);
  const blob = await r.blob(); const object = URL.createObjectURL(blob);
  try {
    const img = new Image(); img.src = object; await img.decode();
    const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.naturalWidth * scale)); c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = c.getContext("2d"); if (!ctx) throw new Error("Image conversion unavailable.");
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return { data: c.toDataURL("image/png"), w: c.width, h: c.height };
  } finally { URL.revokeObjectURL(object); }
}

export async function buildKitDocumentPdf(model: KitDocument, ids: string[], progress?: (message: string) => void) {
  const sections = selectKitDocumentSections(model, ids);
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape", compress: true });
  const fonts = model.font === "Poppins" ? [poppinsRegular.url, poppinsBold.url] : ["/fonts/Geist-Regular.ttf", "/fonts/Geist-Bold.ttf"];
  const bytes = await Promise.all(fonts.map(file));
  for (const [i, b] of bytes.entries()) { const name = `${model.font}-${i}.ttf`; doc.addFileToVFS(name, base64(b)); doc.addFont(name, model.font, i ? "bold" : "normal"); }
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 42, bottom = H - 45;
  const ink: [number, number, number] = [3, 0, 44], muted: [number, number, number] = [83, 83, 83], white: [number, number, number] = [255, 255, 255];
  const primary = rgb(model.primary);
  const missing: string[] = []; const contents: { title: string; page: number }[] = []; let y = M;
  function font(size: number, bold = false, colour = ink) { doc.setFont(model.font, bold ? "bold" : "normal").setFontSize(size).setTextColor(...colour); }
  function page(title: string) {
    doc.addPage(); y = M;
    font(10, true, muted); doc.text(model.name, M, 27);
    font(24, true); const lines = doc.splitTextToSize(title, W - 2 * M); doc.text(lines, M, y + 24); y += lines.length * 28 + 18;
  }
  function need(h: number, title: string) { if (y + h > bottom) page(title); }
  function para(text: string, title: string) {
    if (!text.trim()) return; font(11);
    for (const line of doc.splitTextToSize(text, W - 2 * M) as string[]) { need(16, title); font(11); doc.text(line, M, y + 11); y += 16; }
    y += 9;
  }
  function link(label: string, url: string, x: number, yy: number, width: number) {
    font(9, true); const lines = doc.splitTextToSize(label, width) as string[];
    doc.text(lines, x, yy); doc.link(x, yy - 9, width, lines.length * 12, { url: kitPdfUrl(url) });
    doc.setDrawColor(...primary).setLineWidth(0.5).line(x, yy + (lines.length - 1) * 12 + 2, x + Math.min(width, doc.getTextWidth(lines[0])), yy + (lines.length - 1) * 12 + 2);
    return lines.length * 12 + 7;
  }
  progress?.("Designing cover…");
  doc.setFillColor(...primary).rect(0, 0, W, H, "F");
  font(11, true, white); doc.text("Brand kit", M, 55);
  if (model.cover) {
    try { const img = await image(model.cover); doc.setFillColor(...white).rect(W - 298, 85, 256, 220, "F"); const k = Math.min(238 / img.w, 202 / img.h); doc.addImage(img.data, "PNG", W - 289 + (238 - img.w * k) / 2, 94 + (202 - img.h * k) / 2, img.w * k, img.h * k); }
    catch { missing.push("Cover artwork"); }
  }
  font(36, true, white); const coverLines = doc.splitTextToSize(model.name, W - 385) as string[]; doc.text(coverLines, M, 150); const titleEnd = 150 + coverLines.length * 42;
  font(16, false, white); doc.text(`Brand kit · v${model.version}`, M, titleEnd + 20);
  font(11, false, white); const intro = doc.splitTextToSize(model.intro, W - 2 * M) as string[]; doc.text(intro.slice(0, 6), M, Math.max(345, titleEnd + 65));
  font(10, false, white); doc.text("RGB reference · Not a press master", M, H - 55);
  if (model.publicUrl) { font(11, true, white); doc.textWithLink("Open the public brand kit", M, H - 85, { url: kitPdfUrl(model.publicUrl) }); }
  page("Contents"); const toc = doc.getNumberOfPages();
  for (const section of sections) {
    progress?.(`Designing ${section.title}…`); page(section.title); contents.push({ title: section.title, page: doc.getNumberOfPages() });
    for (const p of section.paragraphs ?? []) para(p, section.title);
    for (const c of section.colours ?? []) {
      font(10); const detail = doc.splitTextToSize(c.detail, W - 2 * M - 100) as string[]; const h = Math.max(70, 30 + detail.length * 14); need(h, section.title);
      doc.setFillColor(...rgb(c.hex)).rect(M, y, 70, h - 12, "F"); font(12, true); doc.text(`${c.name} · ${c.hex}`, M + 90, y + 14); font(10, false, muted); doc.text(detail, M + 90, y + 34); y += h;
    }
    for (const asset of section.assets ?? []) {
      await assetBlock(asset, section.title);
    }
  }
  async function assetBlock(asset: KitDocumentAsset, title: string) {
    // Two generous example rows per spread, with full link/notes continuation.
    need(asset.image ? 208 : 100, title); let img: Awaited<ReturnType<typeof image>> | null = null;
    if (asset.image) try { img = await image(asset.image); } catch { missing.push(asset.title); }
    const top = y, imageW = 280, imageH = 180, tx = asset.image ? M + 304 : M, tw = W - M - tx;
    font(15, true); const heading = doc.splitTextToSize(asset.title, tw) as string[];
    doc.text(heading, tx, top + 17); let yy = top + heading.length * 19 + 14;
    if (asset.note) { font(10, false, muted); const notes = doc.splitTextToSize(asset.note, tw) as string[]; doc.text(notes, tx, yy); yy += notes.length * 14 + 14; }
    if (asset.image) {
      if (asset.ground) doc.setFillColor(...rgb(asset.ground)).rect(M, top, imageW, imageH, "F");
      if (img) { const k = Math.min((imageW - 28) / img.w, (imageH - 28) / img.h); doc.addImage(img.data, "PNG", M + (imageW - img.w * k) / 2, top + (imageH - img.h * k) / 2, img.w * k, img.h * k); }
      else { font(10, false, muted); doc.text("Preview unavailable — use linked original", M + 16, top + imageH / 2); }
    }
    for (const l of asset.links) {
      if (yy + 30 > bottom) { page(title); yy = y; }
      yy += link(l.label, l.url, tx, yy, tw);
    }
    y = Math.max(top + (asset.image ? imageH : 35), yy) + 22;
  }
  doc.setPage(toc); y = 100;
  for (const entry of contents) { if (y > bottom - 25) break; font(11); doc.text(entry.title, M, y); font(10, true); doc.text(String(entry.page), W - M, y, { align: "right" }); doc.link(M, y - 11, W - 2 * M, 20, { pageNumber: entry.page }); y += 24; }
  for (let p = 2; p <= doc.getNumberOfPages(); p++) { doc.setPage(p); font(8, false, muted); doc.text(`${model.name} · v${model.version} · ${p} / ${doc.getNumberOfPages()}`, M, H - 22); }
  doc.setProperties({ title: `${model.name} brand kit v${model.version}`, subject: sections.map(s => s.title).join(" · "), creator: "TransPerfect Element" });
  return { blob: new Blob([doc.output("arraybuffer")], { type: "application/pdf" }), filename: `${model.id}-brand-kit-v${model.version.replace(/[^a-zA-Z0-9.-]/g, "-")}${sections.length !== model.sections.length ? "-selected" : ""}.pdf`, missing };
}