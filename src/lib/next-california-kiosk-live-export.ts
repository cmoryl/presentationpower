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
import { PDFDocument, degrees, StandardFonts, rgb, setCharacterSpacing, pushGraphicsState, popGraphicsState, rectangle, clipEvenOdd, endPath, clip, PDFName, PDFOperator, PDFOperatorNames } from "pdf-lib";
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
  partCentre,
  textLineBoxes,
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
    if (t.fixed) {
      const adv = f.getAdvanceWidth(t.text, t.ksize);
      const n = Math.max(1, [...t.text].length - 1);
      return f.getPath(t.text, t.kx, t.ky, t.ksize, { letterSpacing: (t.kw - adv) / n / t.ksize, kerning: true }).toPathData(2);
    }
    const ls = t.trackPt / t.ksize;
    return textLineBoxes(t, (s) => f.getAdvanceWidth(s, t.ksize))
      .map((l) => f.getPath(l.text, l.x, l.y, t.ksize, { letterSpacing: ls, kerning: true }).toPathData(2))
      .join(" ");
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
  // One live axial shading (Type 2, DeviceRGB) — no stepped bands, no seams.
  {
    const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16) / 255);
    const ctx = doc.context;
    const fns = g.slice(0, -1).map((a, k) => ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: hex(a.color), C1: hex(g[k + 1]!.color), N: 1 }));
    const fn = fns.length === 1 ? fns[0]! : ctx.obj({
      FunctionType: 3,
      Domain: [0, 1],
      Functions: fns,
      Bounds: g.slice(1, -1).map((x) => x.offset),
      Encode: fns.flatMap(() => [0, 1]),
    });
    const sh = ctx.register(ctx.obj({ ShadingType: 2, ColorSpace: "DeviceRGB", Coords: [0, H, 0, 0], Function: fn, Extend: [true, true] }));
    const res = page.node.Resources()!;
    res.set(PDFName.of("Shading"), ctx.obj({ KGround: sh }));
    page.pushOperators(pushGraphicsState(), rectangle(0, 0, W, H), clip(), endPath(), PDFOperator.of("sh" as PDFOperatorNames, [PDFName.of("KGround")]), popGraphicsState());
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
    // Backdrop with an even-odd hole for every separate object.
    page.pushOperators(pushGraphicsState(), rectangle(0, 0, W, H));
    for (const q of p.parts) {
      const hx = B + p.x + q.src.x0 * p.scale;
      const hy = H - (B + p.y + (q.src.y1 - p.clipTop) * p.scale);
      page.pushOperators(rectangle(hx, hy, (q.src.x1 - q.src.x0) * p.scale, (q.src.y1 - q.src.y0) * p.scale));
    }
    page.pushOperators(clipEvenOdd(), endPath());
    page.drawPage(emb, {
      x: B + p.x - bx * p.scale,
      y: H - (B + p.y + (p.clipBottom - p.clipTop) * p.scale),
      xScale: p.scale,
      yScale: p.scale,
    });
    page.pushOperators(popGraphicsState());
    // Each object on its own, from the same vector page (effects kept).
    for (const q of p.parts) {
      if (q.hidden) continue;
      const e2 = await doc.embedPage(srcPage, {
        left: L.originX + q.src.x0,
        right: L.originX + q.src.x1,
        top: L.mediaH - (L.originY + q.src.y0),
        bottom: L.mediaH - (L.originY + q.src.y1),
      });
      const ox = B + q.x, oy = H - (B + q.y + (q.src.y1 - q.src.y0) * q.scale);
      const ctr = partCentre(q);
      const o = pdfRot(ox, oy, B + ctr.x, H - (B + ctr.y), q.rot);
      page.drawPage(e2, { x: o.x, y: o.y, xScale: q.scale, yScale: q.scale, opacity: q.opacity, rotate: degrees(-q.rot) });
    }
  }

  // Accent divider rules (live vector fills).
  const hexRgb = (c: string) => rgb(parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255);
  for (const d of edits.dividers ?? []) {
    if (d.hidden) continue;
    const r = d.round ? d.h / 2 : 0;
    const path = r
      ? `M ${r} 0 H ${d.w - r} A ${r} ${r} 0 0 1 ${d.w - r} ${d.h} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`
      : `M 0 0 H ${d.w} V ${d.h} H 0 Z`;
    const rot = d.rot ?? 0;
    const o = pdfRot(B + d.x, H - (B + d.y), B + d.x + d.w / 2, H - (B + d.y + d.h / 2), rot);
    page.drawSvgPath(path, { x: o.x, y: o.y, color: hexRgb(d.color), borderWidth: 0, opacity: d.opacity ?? 1, rotate: degrees(-rot) });
  }

  const fonts = new Map<string, Awaited<ReturnType<typeof doc.embedFont>>>();
  for (const p of placed)
    for (const t of p.texts) {
      if (!fonts.has(t.font)) {
        const url = kioskFontUrl(t.font);
        fonts.set(t.font, url ? await doc.embedFont(await bytes(url), { subset: true }) : await doc.embedFont(/times/i.test(t.font) ? StandardFonts.TimesRoman : StandardFonts.Helvetica));
      }
      const f = fonts.get(t.font)!;
      const clean = (s: string) => { try { f.encodeText(s); return s; } catch { return s.replace(/[^\x20-\x7E]/g, " "); } };
      const lines = t.fixed
        ? (() => {
            const text = clean(t.text);
            const n = Math.max(1, [...text].length - 1);
            return [{ text, x: t.kx, y: t.ky, tc: (t.kw - f.widthOfTextAtSize(text, t.ksize)) / n }];
          })()
        : textLineBoxes({ ...t, lines: t.lines.map(clean) }, (s) => f.widthOfTextAtSize(s, t.ksize)).map((l) => ({ ...l, tc: t.trackPt }));
      for (const l of lines) {
        page.pushOperators(pushGraphicsState(), setCharacterSpacing(l.tc));
        const o = pdfRot(B + l.x, H - (B + l.y), B + t.ax, H - (B + t.ky), t.rot);
        page.drawText(l.text, { x: o.x, y: o.y, size: t.ksize, font: f, color: hexRgb(t.fill), opacity: t.opacity, rotate: degrees(-t.rot) });
        page.pushOperators(setCharacterSpacing(0), popGraphicsState());
      }
    }
  return doc.save();
}

/** Where a PDF origin lands when its box is turned `rot`° clockwise (as seen) about (cx,cy). */
function pdfRot(ox: number, oy: number, cx: number, cy: number, rot: number) {
  if (!rot) return { x: ox, y: oy };
  const a = (-rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const dx = ox - cx, dy = oy - cy;
  return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
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
