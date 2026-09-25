// Downloads for the live-file California kiosks (browser only).
//
//   • live .svg  — named layers (Background, Graphics, Text, Cut), live text
//   • live .pdf / .ai — PDF-compatible, the partner's own vector art placed per
//     piece, live text in the embedded fonts, TrimBox/BleedBox set
//   • press .svg — the same file with every word outlined
//   • proof .png — rasterised from the press file (a proof, not a master)
//   • both return strips as .svg
// Every file is named rdraft- until the San Francisco revision is published.

import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb, setCharacterSpacing, pushGraphicsState, popGraphicsState } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import {
  KIOSK_BLEED,
  KIOSK_H,
  KIOSK_W,
  buildKioskFrontSvg,
  buildKioskReturnSvg,
  groundAt,
  kioskArtPdfUrl,
  kioskArtSvgUrl,
  kioskFontUrl,
  kioskGround,
  kioskLiveFileBase,
  layoutKiosk,
  type KioskEdits,
  type LiveLayout,
  type PlacedText,
} from "@/lib/next-california-kiosk-live";

const cache = new Map<string, Promise<ArrayBuffer>>();
function bytes(url: string) {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Could not load ${url} (${r.status})`);
    return r.arrayBuffer();
  }));
  return cache.get(url)!;
}
export async function loadArtSvg(id: string): Promise<string> {
  const url = kioskArtSvgUrl(id);
  if (!url) throw new Error("This kiosk has no lifted artwork on file.");
  return new TextDecoder().decode(await bytes(url));
}

const liveFamily = (font: string) =>
  /times/i.test(font) ? "'Times New Roman', serif" : `${font}, '${font.replace(/-/g, " ")}', Geist, sans-serif`;

export async function liveFrontSvg(L: LiveLayout, edits: KioskEdits) {
  return buildKioskFrontSvg(L, await loadArtSvg(L.id), edits, { family: liveFamily });
}

type OT = { getPath: (t: string, x: number, y: number, s: number, o?: object) => { toPathData: (d?: number) => string }; getAdvanceWidth: (t: string, s: number) => number };
async function otFont(font: string): Promise<OT | null> {
  const url = kioskFontUrl(font) ?? kioskFontUrl("Geist-Regular");
  if (!url) return null;
  const { parse } = await import("opentype.js");
  return parse(await bytes(url)) as unknown as OT;
}

export async function pressFrontSvg(L: LiveLayout, edits: KioskEdits) {
  const placed = layoutKiosk(L, edits);
  const faces = new Map<string, OT | null>();
  for (const p of placed) for (const t of p.texts) if (!faces.has(t.font)) faces.set(t.font, await otFont(t.font));
  const missing: string[] = [];
  const outline = (t: PlacedText) => {
    const f = faces.get(t.font);
    if (!f) { missing.push(t.text); return null; }
    const adv = f.getAdvanceWidth(t.text, t.ksize);
    const n = Math.max(1, [...t.text].length - 1);
    const ls = t.edited ? 0 : (t.kw - adv) / n / t.ksize;
    return f.getPath(t.text, t.kx, t.ky, t.ksize, { letterSpacing: ls, kerning: true }).toPathData(2);
  };
  const svg = buildKioskFrontSvg(L, await loadArtSvg(L.id), edits, { outline });
  if (missing.length) throw new Error(`Could not outline ${missing.length} text line(s): no font file on hand.`);
  return svg;
}

export async function proofPng(svg: string, widthPx = 1400): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("Proof render failed")); img.src = url; });
    const h = Math.round(widthPx * ((KIOSK_H + 2 * KIOSK_BLEED) / (KIOSK_W + 2 * KIOSK_BLEED)));
    const c = document.createElement("canvas");
    c.width = widthPx; c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, widthPx, h);
    return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Proof encode failed"))), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}

export async function liveFrontPdf(L: LiveLayout, edits: KioskEdits): Promise<Uint8Array> {
  const artUrl = kioskArtPdfUrl(L.id);
  if (!artUrl) throw new Error("This kiosk has no lifted artwork PDF on file.");
  const B = KIOSK_BLEED;
  const W = KIOSK_W + 2 * B, H = KIOSK_H + 2 * B;
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${kioskLiveFileBase(L.id)} — kiosk front (draft)`);
  const page = doc.addPage([W, H]);
  page.setTrimBox(B, B, KIOSK_W, KIOSK_H);
  page.setBleedBox(0, 0, W, H);

  // Background: the partner's ramp in fine vector steps.
  const g = kioskGround(L, edits);
  const steps = 240;
  for (let i = 0; i < steps; i++) {
    const [r, gg, b] = groundAt(g, (i + 0.5) / steps);
    page.drawRectangle({ x: 0, y: H - ((i + 1) * H) / steps, width: W, height: H / steps + 0.5, color: rgb(r, gg, b) });
  }

  const src = await PDFDocument.load(await bytes(artUrl));
  const srcPage = src.getPage(0);
  const placed = layoutKiosk(L, edits);
  for (const p of placed) {
    const bx = B / p.scale + 1;
    const top = L.originY + p.clipTop, bot = L.originY + p.clipBottom;
    const emb = await doc.embedPage(srcPage, {
      left: L.originX - bx,
      right: L.originX + L.trimW + bx,
      top: L.mediaH - top,
      bottom: L.mediaH - bot,
    });
    page.drawPage(emb, {
      x: B + p.x - bx * p.scale,
      y: H - (B + p.y + (p.clipBottom - p.clipTop) * p.scale),
      xScale: p.scale,
      yScale: p.scale,
    });
  }

  const fonts = new Map<string, Awaited<ReturnType<typeof doc.embedFont>>>();
  for (const p of placed)
    for (const t of p.texts) {
      if (!fonts.has(t.font)) {
        const url = kioskFontUrl(t.font);
        fonts.set(t.font, url ? await doc.embedFont(await bytes(url), { subset: true }) : await doc.embedFont(/times/i.test(t.font) ? StandardFonts.TimesRoman : StandardFonts.Helvetica));
      }
      const f = fonts.get(t.font)!;
      let text = t.text;
      try { f.encodeText(text); } catch { text = text.replace(/[^\x20-\x7E]/g, " "); }
      const adv = f.widthOfTextAtSize(text, t.ksize);
      const n = Math.max(1, [...text].length - 1);
      const tc = t.edited ? 0 : (t.kw - adv) / n;
      const c = t.fill;
      page.pushOperators(pushGraphicsState(), setCharacterSpacing(tc));
      page.drawText(text, {
        x: B + t.kx,
        y: H - (B + t.ky),
        size: t.ksize,
        font: f,
        color: rgb(parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255),
      });
      page.pushOperators(setCharacterSpacing(0), popGraphicsState());
    }
  return doc.save();
}

function save(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export type KioskDownload = "zip" | "svg" | "pdf" | "ai" | "press" | "png";

export async function downloadKiosk(kind: KioskDownload, L: LiveLayout, edits: KioskEdits) {
  const base = kioskLiveFileBase(L.id);
  const svgBlob = (s: string) => new Blob([s], { type: "image/svg+xml" });
  if (kind === "svg") return save(svgBlob(await liveFrontSvg(L, edits)), `${base}-front.svg`);
  if (kind === "pdf" || kind === "ai") {
    const pdf = await liveFrontPdf(L, edits);
    return save(new Blob([pdf as BlobPart], { type: "application/pdf" }), `${base}-front.${kind}`);
  }
  if (kind === "press") return save(svgBlob(await pressFrontSvg(L, edits)), `${base}-front-press-outlined.svg`);
  if (kind === "png") return save(await proofPng(await pressFrontSvg(L, edits)), `${base}-front-PROOF.png`);
  const zip = new JSZip();
  const press = await pressFrontSvg(L, edits);
  zip.file(`${base}-front.svg`, await liveFrontSvg(L, edits));
  zip.file(`${base}-front.pdf`, await liveFrontPdf(L, edits));
  zip.file(`${base}-front-press-outlined.svg`, press);
  zip.file(`${base}-front-PROOF.png`, await proofPng(press));
  const ret = buildKioskReturnSvg(L, edits);
  zip.file(`${base}-return-left.svg`, ret);
  zip.file(`${base}-return-right.svg`, ret);
  zip.file(
    "README.txt",
    `DRAFT — not published. Rebuilt from ${L.source}.\n` +
      `Front 45 x 96 in, returns 4 x 96 in, 1/8 in bleed. TV keep-clear left clear.\n` +
      `.svg/.pdf carry live text; the -press-outlined file has every word outlined.\n` +
      `The PNG is a screen proof, not a print master. Check in Illustrator before print.\n`,
  );
  save(await zip.generateAsync({ type: "blob" }), `${base}.zip`);
}
