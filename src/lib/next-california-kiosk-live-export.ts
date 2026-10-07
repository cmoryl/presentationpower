// Downloads for the live-file California kiosks (browser only).
//
//   • live .svg  — named layers (Background, Graphics, Text, Cut), live text
//   • live .pdf / .ai — PDF-compatible, the partner's own vector art placed per
//     piece, live text in the embedded fonts, TrimBox/BleedBox set
//   • press .svg — the same file with every word outlined
//   • proof .png — rasterised from the press file (a proof, not a master)
//   • both return strips as .ai/.pdf (same live ramp as the front) and .svg
// Every file is named rdraft- until the San Francisco revision is published.

import JSZip from "jszip";
import { PDFDocument, degrees, rgb, cmyk, setCharacterSpacing, pushGraphicsState, popGraphicsState, rectangle, clipEvenOdd, endPath, clip, concatTransformationMatrix, PDFName, PDFOperator, PDFOperatorNames, PDFString } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { marksPdfOps } from "@/lib/kiosk-marks";
import { PDFDict } from "pdf-lib";
import { artRegionPdf, mul, parseArtSvg, rotateAbout, roundRectPdf, scale, translate, type Affine } from "@/lib/next-california-kiosk-vector-pdf";

import {
  KIOSK_BLEED,
  KIOSK_H,
  KIOSK_W,
  KIOSK_RETURN_W,
  KIOSK_FONT_SUBSTITUTE,
  bulletSquareBox,
  buildKioskFrontSvg,
  buildKioskReturnSvg,
  groundAt,
  kioskArtPdfUrl,
  kioskArtSvgUrl,
  kioskNativePdfUrl,
  nativeBgBox,
  partSource,
  kioskFontUrl,
  kioskGround,
  kioskLiveFileBase,
  kioskHasTv,
  kioskFaceLayout,
  kioskFaceW,
  kioskFaceH,
  type KioskFace,
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
/** The designer's CMYK file, split one object per page. Fails loudly if missing. */
function nativeBytes(id: string) {
  const u = kioskNativePdfUrl(id);
  if (!u) throw new Error("The designer's CMYK kiosk file is missing for this kiosk.");
  return bytes(u);
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
  const url = kioskFontUrl(font) ?? kioskFontUrl(KIOSK_FONT_SUBSTITUTE);
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

export async function proofPng(svg: string, widthPx = 1400, faceW: number = KIOSK_W, faceH: number = KIOSK_H): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("Proof render failed")); img.src = url; });
    const h = Math.max(1, Math.round(widthPx * ((faceH + 2 * KIOSK_BLEED) / (faceW + 2 * KIOSK_BLEED))));
    const c = document.createElement("canvas");
    c.width = widthPx; c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, widthPx, h);
    return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Proof encode failed"))), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}

export async function liveFrontPdf(L: LiveLayout, edits: KioskEdits): Promise<Uint8Array> {
  const B = KIOSK_BLEED;
  const KW = kioskFaceW(L);
  const KIOSK_H = kioskFaceH(L);
  const W = KW + 2 * B, H = KIOSK_H + 2 * B;
  // Slug outside the bleed carries the crop marks (0.5 in each side).
  const S = 36;
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${kioskLiveFileBase(L.id)} — ${L.face ? `return ${L.face}` : L.sign ? "sign" : "kiosk front"} (draft)`);
  const page = doc.addPage([W + 2 * S, H + 2 * S]);
  page.setTrimBox(S + B, S + B, KW, KIOSK_H);
  page.setBleedBox(S, S, W, H);
  page.setCropBox(0, 0, W + 2 * S, H + 2 * S);
  // Everything below is drawn in bleed-box space, shifted into the slug.
  // Named Illustrator layers (PDF optional content).
  const layerNames = ["Background", "Imagery", "Content", "Accents", "Text", "Trim marks"] as const;
  const ocProps = doc.context.obj({});
  const ocRefs = layerNames.map((name, i) => {
    const ref = doc.context.register(doc.context.obj({ Type: "OCG", Name: PDFString.of(name) }));
    ocProps.set(PDFName.of(`OC${i + 1}`), ref);
    return ref;
  });
  page.node.Resources()!.set(PDFName.of("Properties"), ocProps);
  doc.catalog.set(PDFName.of("OCProperties"), doc.context.obj({ OCGs: ocRefs, D: doc.context.obj({ Order: ocRefs, ON: ocRefs }) }));
  const beginLayer = (n: (typeof layerNames)[number]) =>
    page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [PDFName.of("OC"), PDFName.of(`OC${layerNames.indexOf(n) + 1}`)]));
  const endLayer = () => page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(1, 0, 0, 1, S, S));
  beginLayer("Background");

  // Background: the partner's ramp in fine vector steps.
  const g = kioskGround(L, edits);
  const raw = (s: string) => PDFOperator.of(s as PDFOperatorNames);
  // Kiosk space (trim origin, y down) → bleed-box PDF space.
  const F: Affine = [1, 0, 0, -1, B, H - B];
  const placed = layoutKiosk(L, edits);
  const gs = doc.context.obj({});
  page.node.Resources()!.set(PDFName.of("ExtGState"), gs);
  let gsN = 0;
  const alpha = (o: number) => { const k = `KA${gsN++}`; gs.set(PDFName.of(k), doc.context.obj({ Type: "ExtGState", ca: o, CA: o })); return `/${k} gs`; };
  const fmt = (m: Affine) => m.map((v) => +v.toFixed(4)).join(" ");
  if (L.native) {
    // The designer's own objects, each copied byte-for-byte from the CMYK
    // file (their CMYK colour numbers are untouched) and placed where the
    // editor has it.
    const N = L.native;
    const src = await PDFDocument.load(await nativeBytes(L.id));
    const ids = [...new Set(placed.flatMap((p) => p.parts.filter((q) => !q.hidden).map((q) => partSource(edits, q.part.id))))];
    const want = [N.bgPage, ...ids.map((id) => N.parts[id]!.page)];
    const forms = await doc.embedPdf(src, want);
    const xo = doc.context.obj({});
    page.node.Resources()!.set(PDFName.of("XObject"), xo);
    forms.forEach((f, i) => xo.set(PDFName.of(`KN${i}`), f.ref));
    const formOf = (id: string) => `KN${ids.indexOf(id) + 1}`;
    // Native page (PDF y-up, bleed-box origin) → kiosk space.
    const P: Affine = [1, 0, 0, -1, -L.originX, L.mediaH - L.originY];
    if (edits.ground || L.groundOnly) groundShading();
    else {
      // Ground page placed in its trim box (stretched for no-bleed or re-sized signs).
      const [bx, by, bw, bh] = nativeBgBox(L);
      const Bx: Affine = [bw / L.mediaW, 0, 0, bh / L.mediaH, bx + L.originX * (bw / L.mediaW), by + L.originY * (bh / L.mediaH)];
      page.pushOperators(raw(`q\n${fmt(mul(F, mul(Bx, P)))} cm\n/KN0 Do\nQ`));
    }
    for (const layer of ["image", "vector"] as const) {
      endLayer();
      beginLayer(layer === "image" ? "Imagery" : "Content");
      for (const p of placed)
        for (const q of p.parts) {
          if (q.hidden) continue;
          const id = partSource(edits, q.part.id);
          if ((N.parts[id]?.kind ?? "vector") !== layer) continue;
          const c = partCentre(q);
          const Mq = mul(F, mul(rotateAbout(q.rot, c.x, c.y), mul(translate(q.x - q.src.x0 * q.scale, q.y - q.src.y0 * q.scale), mul(scale(q.scale), P))));
          if (q.cmyk) {
            // Recoloured: the object's own shape (as an alpha mask) filled with one flat CMYK ink.
            const ctx = doc.context;
            const G = ctx.register(ctx.stream(`/F Do`, {
              Type: "XObject", Subtype: "Form", BBox: [0, 0, L.mediaW, L.mediaH],
              Group: ctx.obj({ Type: "Group", S: "Transparency" }),
              Resources: ctx.obj({ XObject: ctx.obj({ F: forms[ids.indexOf(id) + 1]!.ref }) }),
            }));
            const k = `KR${gsN++}`;
            gs.set(PDFName.of(k), ctx.obj({ Type: "ExtGState", ca: q.opacity, CA: q.opacity, SMask: ctx.obj({ Type: "Mask", S: "Alpha", G }) }));
            const [c0, m0, y0, k0] = q.cmyk.map((v) => +Math.max(0, Math.min(1, v)).toFixed(4));
            page.pushOperators(raw(`q\n${fmt(Mq)} cm\n/${k} gs\n${c0} ${m0} ${y0} ${k0} k\n0 0 ${L.mediaW} ${L.mediaH} re\nf\nQ`));
          } else page.pushOperators(raw(`q${q.opacity < 1 ? `\n${alpha(q.opacity)}` : ""}\n${fmt(Mq)} cm\n/${formOf(id)} Do\nQ`));
        }
    }
    endLayer();
    return finishFront();
  }
  groundShading();
  function groundShading() {
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

  // Partner artwork as native vector paths (no clipped page copies).
  const art = parseArtSvg(await loadArtSvg(L.id));
  if (art.unsupported.length) return legacyFrontPdf(L, edits);
  // Placed photos in the partner art stay as placed images (as in Illustrator).
  const xo = doc.context.obj({});
  page.node.Resources()!.set(PDFName.of("XObject"), xo);
  const imgNames = new Map<string, string>();
  const imageKey: string[] = [];
  for (const im of art.images) {
    if (!imgNames.has(im.href)) {
      const b64 = im.href.slice(im.href.indexOf(",") + 1);
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const ref = /^data:image\/png/.test(im.href) ? await embedPngFast(doc, bin) : (await doc.embedJpg(bin)).ref;
      const name = `KIm${imgNames.size}`;
      xo.set(PDFName.of(name), ref);
      imgNames.set(im.href, name);
    }
    imageKey.push(imgNames.get(im.href)!);
  }
  const imageName = (i: number) => imageKey[i]!;
  const BM: Record<string, string> = { multiply: "Multiply", screen: "Screen", overlay: "Overlay", darken: "Darken", lighten: "Lighten", "color-dodge": "ColorDodge", "color-burn": "ColorBurn", "hard-light": "HardLight", "soft-light": "SoftLight", difference: "Difference", exclusion: "Exclusion", hue: "Hue", saturation: "Saturation", color: "Color", luminosity: "Luminosity" };
  const bmNames = new Map<string, string>();
  const blendGs = (mode: string) => {
    if (!bmNames.has(mode)) { const k = `KB${bmNames.size}`; gs.set(PDFName.of(k), doc.context.obj({ Type: "ExtGState", BM: PDFName.of(BM[mode] ?? "Normal") })); bmNames.set(mode, k); }
    return `/${bmNames.get(mode)} gs`;
  };
  // Split the partner art into its own layers: page grounds with the
  // background, placed photos as imagery, everything else as content.
  const isGround = (o: { kind: "path" | "image"; i: number }) => {
    const b = o.kind === "path" ? art.paths[o.i]!.box : art.images[o.i]!.box;
    return (b.x1 - b.x0) >= 0.95 * L.trimW && (b.y1 - b.y0) >= 0.98 * L.trimH;
  };
  const layerPick = {
    ground: (o: { kind: "path" | "image"; i: number }) => isGround(o),
    imagery: (o: { kind: "path" | "image"; i: number }) => o.kind === "image" && !isGround(o),
    content: (o: { kind: "path" | "image"; i: number }) => o.kind === "path" && !isGround(o),
  };
  const drawArt = (pick: (o: { kind: "path" | "image"; i: number }) => boolean) => {
    for (const p of placed) {
      const s = p.scale;
      const bx = B / s + 1;
      const top = p === placed[0] && p.y <= 0.5 ? -(B + 1) / s : 0;
      const bot = Math.abs(p.y + (p.clipBottom - p.clipTop) * s - KIOSK_H) < 0.5 ? (B + 1) / s : 0;
      // art → kiosk: translate(p.x,p.y)·scale(s)·translate(-originX, -(originY+clipTop))
      const M = mul(F, mul(translate(p.x, p.y), mul(scale(s), translate(-L.originX, -(L.originY + p.clipTop)))));
      const oy = L.originY + p.clipTop;
      const region = { x0: L.originX - bx, y0: oy + top, x1: L.originX + L.trimW + bx, y1: L.originY + p.clipBottom + bot };
      const holes = p.parts.map((q) => ({ x0: L.originX + q.src.x0, y0: L.originY + q.src.y0, x1: L.originX + q.src.x1, y1: L.originY + q.src.y1 }));
      page.pushOperators(raw(artRegionPdf(art, region, M, holes, imageName, blendGs, pick).ops));
      for (const q of p.parts) {
        if (q.hidden) continue;
        const c = partCentre(q);
        const Mq = mul(F, mul(rotateAbout(q.rot, c.x, c.y), mul(translate(q.x - q.src.x0 * q.scale, q.y - q.src.y0 * q.scale), mul(scale(q.scale), translate(-L.originX, -L.originY)))));
        const r = { x0: L.originX + q.src.x0, y0: L.originY + q.src.y0, x1: L.originX + q.src.x1, y1: L.originY + q.src.y1 };
        page.pushOperators(raw(`q${q.opacity < 1 ? `\n${alpha(q.opacity)}` : ""}\n${artRegionPdf(art, r, Mq, [], imageName, blendGs, pick).ops}\nQ`));
      }
    }
  };
  drawArt(layerPick.ground);
  endLayer();
  beginLayer("Imagery");
  drawArt(layerPick.imagery);
  endLayer();
  beginLayer("Content");
  drawArt(layerPick.content);
  endLayer();
  return finishFront();

  async function finishFront() {

  // Accent divider rules (live vector fills).
  beginLayer("Accents");
  const hexRgb = (c: string) => rgb(parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255);
  for (const d of edits.dividers ?? []) {
    if (d.hidden) continue;
    const c = hexRgb(d.color);
    const Md = mul(F, mul(rotateAbout(d.rot ?? 0, d.x + d.w / 2, d.y + d.h / 2), translate(d.x, d.y)));
    const o = d.opacity ?? 1;
    page.pushOperators(raw(`q\n${o < 1 ? alpha(o) + "\n" : ""}${[c.red, c.green, c.blue].join(" ")} rg\n${roundRectPdf(d.w, d.h, !!d.round, Md)}\nf\nQ`));
  }
  if (edits.marks?.length) page.pushOperators(raw(marksPdfOps(edits.marks, F, alpha)));
  endLayer();
  beginLayer("Text");

  const fonts = new Map<string, Awaited<ReturnType<typeof doc.embedFont>>>();
  for (const p of placed)
    for (const t of p.texts) {
      const sq = bulletSquareBox(t);
      if (sq) {
        const c = hexRgb(t.fill);
        const fillOp = t.cmyk ? `${t.cmyk.join(" ")} k` : `${[c.red, c.green, c.blue].join(" ")} rg`;
        const Mb = mul(F, rotateAbout(t.rot, t.ax, t.ky));
        page.pushOperators(raw(`q\n${t.opacity < 1 ? alpha(t.opacity) + "\n" : ""}${fillOp}\n${roundRectPdf(sq.s, sq.s, false, mul(Mb, translate(sq.x, sq.y)))}\nf\nQ`));
        continue;
      }
      if (!fonts.has(t.font)) fonts.set(t.font, await embedKioskFont(doc, t.font));
      const f = fonts.get(t.font)!;
      const clean = cleanFor(f);
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
        page.drawText(l.text, { x: o.x, y: o.y, size: t.ksize, font: f, color: t.cmyk ? cmyk(t.cmyk[0] ?? 0, t.cmyk[1] ?? 0, t.cmyk[2] ?? 0, t.cmyk[3] ?? 0) : hexRgb(t.fill), opacity: t.opacity, rotate: degrees(-t.rot) });
        page.pushOperators(setCharacterSpacing(0), popGraphicsState());
      }
    }
  endLayer();
  page.pushOperators(popGraphicsState());

  // Crop marks in the slug: 0.25 in long, starting 1/8 in outside trim (clear of bleed).
  beginLayer("Trim marks");
  const reg = rgb(0, 0, 0);
  const tx0 = S + B, ty0 = S + B, tx1 = tx0 + KW, ty1 = ty0 + KIOSK_H;
  const off = B, len = 18, lw = 0.25;
  for (const x of [tx0, tx1])
    for (const y of [ty0, ty1]) {
      const sx = x === tx0 ? -1 : 1, sy = y === ty0 ? -1 : 1;
      page.drawLine({ start: { x: x + sx * off, y }, end: { x: x + sx * (off + len), y }, thickness: lw, color: reg });
      page.drawLine({ start: { x, y: y + sy * off }, end: { x, y: y + sy * (off + len) }, thickness: lw, color: reg });
    }
  endLayer();
  return saveWithRealFontNames(doc);
  }
}

/**
 * Earlier builder: places the partner page as a clipped form. Kept only for
 * artwork that uses masks or blend modes, which the native writer cannot yet
 * reproduce as live vector.
 */
async function legacyFrontPdf(L: LiveLayout, edits: KioskEdits): Promise<Uint8Array> {
  const artUrl = kioskArtPdfUrl(L.id);
  if (!artUrl) throw new Error("This kiosk has no lifted artwork PDF on file.");
  const B = KIOSK_BLEED;
  const W = KIOSK_W + 2 * B, H = KIOSK_H + 2 * B;
  // Slug outside the bleed carries the crop marks (0.5 in each side).
  const S = 36;
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${kioskLiveFileBase(L.id)} — kiosk front (draft)`);
  const page = doc.addPage([W + 2 * S, H + 2 * S]);
  page.setTrimBox(S + B, S + B, KIOSK_W, KIOSK_H);
  page.setBleedBox(S, S, W, H);
  page.setCropBox(0, 0, W + 2 * S, H + 2 * S);
  // Everything below is drawn in bleed-box space, shifted into the slug.
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(1, 0, 0, 1, S, S));

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
  // Embed the London page ONCE (a single shared form XObject) and cut every
  // piece and object out of it with a clip. Embedding per object duplicated the
  // whole page's content streams each time — 100 MB+ files and multi-minute builds.
  const emb = await doc.embedPage(srcPage, { left: 0, bottom: 0, right: srcPage.getWidth(), top: L.mediaH });
  const placed = layoutKiosk(L, edits);
  for (const p of placed) {
    const s = p.scale;
    const bx = B / s + 1;
    // A piece touching the top or bottom trim runs on into the bleed, as the SVG does.
    const ext = (B + 1) / s;
    const exTop = p === placed[0] && p.y <= 0.5 ? ext : 0;
    const exBot = Math.abs(p.y + (p.clipBottom - p.clipTop) * s - KIOSK_H) < 0.5 ? ext : 0;
    const rx = B + p.x - bx * s;
    const ry = H - (B + p.y + (p.clipBottom - p.clipTop + exBot) * s);
    const rw = (L.trimW + 2 * bx) * s;
    const rh = (p.clipBottom - p.clipTop + exTop + exBot) * s;
    // Backdrop region with an even-odd hole for every separate object.
    page.pushOperators(pushGraphicsState(), rectangle(rx, ry, rw, rh));
    for (const q of p.parts) {
      const hx = B + p.x + q.src.x0 * s;
      const hy = H - (B + p.y + (q.src.y1 - p.clipTop) * s);
      page.pushOperators(rectangle(hx, hy, (q.src.x1 - q.src.x0) * s, (q.src.y1 - q.src.y0) * s));
    }
    page.pushOperators(clipEvenOdd(), endPath());
    page.drawPage(emb, {
      x: B + p.x - L.originX * s,
      y: H - B - p.y + (L.originY + p.clipTop - L.mediaH) * s,
      xScale: s,
      yScale: s,
    });
    page.pushOperators(popGraphicsState());
    // Each object on its own, from the same vector page (effects kept).
    for (const q of p.parts) {
      if (q.hidden) continue;
      const qs = q.scale;
      const w = (q.src.x1 - q.src.x0) * qs, h = (q.src.y1 - q.src.y0) * qs;
      const ox = B + q.x, oy = H - (B + q.y + h);
      const ctr = partCentre(q);
      const o = pdfRot(ox, oy, B + ctr.x, H - (B + ctr.y), q.rot);
      const a = (-q.rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
      page.pushOperators(pushGraphicsState(), concatTransformationMatrix(c, sn, -sn, c, o.x, o.y), rectangle(0, 0, w, h), clip(), endPath());
      page.drawPage(emb, {
        x: -(L.originX + q.src.x0) * qs,
        y: -(L.mediaH - L.originY - q.src.y1) * qs,
        xScale: qs,
        yScale: qs,
        opacity: q.opacity,
      });
      page.pushOperators(popGraphicsState());
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
  if (edits.marks?.length) {
    const res = page.node.Resources()!;
    let egs = res.lookupMaybe(PDFName.of("ExtGState"), PDFDict);
    if (!egs) { egs = doc.context.obj({}); res.set(PDFName.of("ExtGState"), egs); }
    let n = 0;
    const alphaL = (o: number) => { const k = `MA${n++}`; egs!.set(PDFName.of(k), doc.context.obj({ Type: "ExtGState", ca: o, CA: o })); return `/${k} gs`; };
    page.pushOperators(PDFOperator.of(marksPdfOps(edits.marks, [1, 0, 0, -1, B, H - B], alphaL) as PDFOperatorNames));
  }

  const fonts = new Map<string, Awaited<ReturnType<typeof doc.embedFont>>>();
  for (const p of placed)
    for (const t of p.texts) {
      const sq = bulletSquareBox(t);
      if (sq) {
        const o = pdfRot(B + sq.x, H - (B + sq.y + sq.s), B + t.ax, H - (B + t.ky), t.rot);
        page.drawRectangle({ x: o.x, y: o.y, width: sq.s, height: sq.s, color: hexRgb(t.fill), opacity: t.opacity, rotate: degrees(-t.rot), borderWidth: 0 });
        continue;
      }
      if (!fonts.has(t.font)) fonts.set(t.font, await embedKioskFont(doc, t.font));
      const f = fonts.get(t.font)!;
      const clean = cleanFor(f);
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
  page.pushOperators(popGraphicsState());

  // Crop marks in the slug: 0.25 in long, starting 1/8 in outside trim (clear of bleed).
  const reg = rgb(0, 0, 0);
  const tx0 = S + B, ty0 = S + B, tx1 = tx0 + KIOSK_W, ty1 = ty0 + KIOSK_H;
  const off = B, len = 18, lw = 0.25;
  for (const x of [tx0, tx1])
    for (const y of [ty0, ty1]) {
      const sx = x === tx0 ? -1 : 1, sy = y === ty0 ? -1 : 1;
      page.drawLine({ start: { x: x + sx * off, y }, end: { x: x + sx * (off + len), y }, thickness: lw, color: reg });
      page.drawLine({ start: { x, y: y + sy * off }, end: { x, y: y + sy * (off + len) }, thickness: lw, color: reg });
    }
  return saveWithRealFontNames(doc);
}

/** Embed the supplied face; a face we hold no file for is set in embedded Geist (never an unembedded base font). */
async function embedKioskFont(doc: PDFDocument, font: string) {
  const url = kioskFontUrl(font) ?? kioskFontUrl(KIOSK_FONT_SUBSTITUTE);
  if (!url) throw new Error(`No font file for ${font} and no Geist fallback on hand.`);
  return doc.embedFont(await bytes(url), { subset: true });
}
/** Drop only the characters the face cannot set (ligatures first become plain letters). */
function cleanFor(f: { encodeText: (s: string) => unknown }) {
  return (s: string) => {
    try { f.encodeText(s); return s; } catch { /* fall through */ }
    return [...s.normalize("NFKC")].map((ch) => { try { f.encodeText(ch); return ch; } catch { return " "; } }).join("");
  };
}

/**
 * Place a PNG as an RGB image with its alpha as a soft mask. The browser
 * decodes it (pdf-lib's own decoder takes minutes on the partner's
 * full-width glow layers).
 */
async function embedPngFast(doc: PDFDocument, png: Uint8Array) {
  const bmp = await createImageBitmap(new Blob([png as BlobPart], { type: "image/png" }), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
  const w = bmp.width, h = bmp.height;
  const cv = new OffscreenCanvas(w, h);
  const cx = cv.getContext("2d")!;
  cx.drawImage(bmp, 0, 0);
  const px = cx.getImageData(0, 0, w, h).data;
  const rgbB = new Uint8Array(w * h * 3), a = new Uint8Array(w * h);
  let opaque = true;
  for (let i = 0, j = 0, k = 0; i < px.length; i += 4, j += 3, k++) {
    rgbB[j] = px[i]!; rgbB[j + 1] = px[i + 1]!; rgbB[j + 2] = px[i + 2]!; a[k] = px[i + 3]!;
    if (px[i + 3] !== 255) opaque = false;
  }
  const base = { Type: "XObject", Subtype: "Image", Width: w, Height: h, BitsPerComponent: 8 };
  const img = doc.context.flateStream(rgbB, { ...base, ColorSpace: "DeviceRGB" });
  if (!opaque) img.dict.set(PDFName.of("SMask"), doc.context.register(doc.context.flateStream(a, { ...base, ColorSpace: "DeviceGray" })));
  return doc.context.register(img);
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

/**
 * Return strip (4 x 96 in) as a PDF-compatible .ai: the same Type 2/3 axial
 * shading as the front, over the same bleed-box height, so the strips and
 * the front print one continuous ramp. Layers: Background, Trim marks.
 */
export async function liveReturnPdf(L: LiveLayout, edits: KioskEdits, side: "left" | "right", stripEdits?: KioskEdits): Promise<Uint8Array> {
  // Strips split into separate objects are built exactly like the front, with
  // their own saved changes (layers Background, Imagery, Content, Accents, Text, Trim marks).
  const FL = kioskFaceLayout(L, side);
  if (FL) return liveFrontPdf(FL, stripEdits ?? {});
  const B = KIOSK_BLEED;
  const W = KIOSK_RETURN_W + 2 * B, H = KIOSK_H + 2 * B;
  const S = 36;
  const doc = await PDFDocument.create();
  doc.setTitle(`${kioskLiveFileBase(L.id)} — return ${side} (draft)`);
  const page = doc.addPage([W + 2 * S, H + 2 * S]);
  page.setTrimBox(S + B, S + B, KIOSK_RETURN_W, KIOSK_H);
  page.setBleedBox(S, S, W, H);
  page.setCropBox(0, 0, W + 2 * S, H + 2 * S);
  const layerNames = ["Background", "Trim marks"] as const;
  const ctx = doc.context;
  const ocProps = ctx.obj({});
  const ocRefs = layerNames.map((name, i) => {
    const ref = ctx.register(ctx.obj({ Type: "OCG", Name: PDFString.of(name) }));
    ocProps.set(PDFName.of(`OC${i + 1}`), ref);
    return ref;
  });
  const res = page.node.Resources()!;
  res.set(PDFName.of("Properties"), ocProps);
  doc.catalog.set(PDFName.of("OCProperties"), ctx.obj({ OCGs: ocRefs, D: ctx.obj({ Order: ocRefs, ON: ocRefs }) }));
  const beginLayer = (n: (typeof layerNames)[number]) =>
    page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [PDFName.of("OC"), PDFName.of(`OC${layerNames.indexOf(n) + 1}`)]));
  const endLayer = () => page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));

  if (L.native && !edits.ground) {
    // The designer's own strip, background and content kept apart, CMYK as supplied.
    const st = L.native.strips[side];
    const src = await PDFDocument.load(await nativeBytes(L.id));
    const [bgF, ctF] = await doc.embedPdf(src, [st.bg, st.content]);
    const xo = ctx.obj({});
    res.set(PDFName.of("XObject"), xo);
    xo.set(PDFName.of("KS0"), bgF!.ref);
    xo.set(PDFName.of("KS1"), ctF!.ref);
    const ocC = ctx.register(ctx.obj({ Type: "OCG", Name: PDFString.of("Content") }));
    ocProps.set(PDFName.of("OC9"), ocC);
    const order = [ocRefs[0]!, ocC, ocRefs[1]!];
    doc.catalog.set(PDFName.of("OCProperties"), ctx.obj({ OCGs: order, D: ctx.obj({ Order: order, ON: order }) }));
    const draw = (name: string, oc: string) =>
      page.pushOperators(PDFOperator.of(`/OC /${oc} BDC\nq\n1 0 0 1 ${S} ${S} cm\n/${name} Do\nQ\nEMC` as PDFOperatorNames));
    draw("KS0", "OC1");
    draw("KS1", "OC9");
  } else {
  beginLayer("Background");
  const g = kioskGround(L, edits);
  const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16) / 255);
  const fns = g.slice(0, -1).map((a, k) => ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: hex(a.color), C1: hex(g[k + 1]!.color), N: 1 }));
  const fn = fns.length === 1 ? fns[0]! : ctx.obj({
    FunctionType: 3, Domain: [0, 1], Functions: fns,
    Bounds: g.slice(1, -1).map((x) => x.offset), Encode: fns.flatMap(() => [0, 1]),
  });
  const sh = ctx.register(ctx.obj({ ShadingType: 2, ColorSpace: "DeviceRGB", Coords: [0, H, 0, 0], Function: fn, Extend: [true, true] }));
  res.set(PDFName.of("Shading"), ctx.obj({ KGround: sh }));
  page.pushOperators(
    pushGraphicsState(), concatTransformationMatrix(1, 0, 0, 1, S, S),
    rectangle(0, 0, W, H), clip(), endPath(),
    PDFOperator.of("sh" as PDFOperatorNames, [PDFName.of("KGround")]),
    popGraphicsState(),
  );
  endLayer();
  }

  beginLayer("Trim marks");
  const reg = rgb(0, 0, 0);
  const tx0 = S + B, ty0 = S + B, tx1 = tx0 + KIOSK_RETURN_W, ty1 = ty0 + KIOSK_H;
  const off = B, len = 18, lw = 0.25;
  for (const x of [tx0, tx1])
    for (const y of [ty0, ty1]) {
      const sx = x === tx0 ? -1 : 1, sy = y === ty0 ? -1 : 1;
      page.drawLine({ start: { x: x + sx * off, y }, end: { x: x + sx * (off + len), y }, thickness: lw, color: reg });
      page.drawLine({ start: { x, y: y + sy * off }, end: { x, y: y + sy * (off + len) }, thickness: lw, color: reg });
    }
  endLayer();
  return saveWithRealFontNames(doc);
}

export type KioskDownload = "zip" | "svg" | "pdf" | "ai" | "press" | "png" | "returns";

export async function downloadKiosk(kind: KioskDownload, L: LiveLayout, edits: KioskEdits, strips: Partial<Record<KioskFace, KioskEdits>> = {}, face?: KioskFace) {
  const base = kioskLiveFileBase(L.id);
  const returnSvg = async (side: KioskFace) => {
    const FL = kioskFaceLayout(L, side);
    return FL ? liveFrontSvg(FL, strips[side] ?? {}) : buildKioskReturnSvg(L, edits);
  };
  const svgBlob = (s: string) => new Blob([s], { type: "image/svg+xml" });
  // Editing a side strip: single-file downloads give that strip, not the front.
  if (face && kind !== "zip" && kind !== "returns") {
    const FL = kioskFaceLayout(L, face);
    const se = strips[face] ?? {};
    const sb = `${base}-return-${face}`;
    if (kind === "pdf" || kind === "ai") return save(new Blob([(await liveReturnPdf(L, edits, face, strips[face])) as BlobPart], { type: "application/pdf" }), `${sb}.${kind}`);
    if (kind === "svg") return save(svgBlob(await returnSvg(face)), `${sb}.svg`);
    if (!FL) throw new Error("This strip has no layered layout.");
    if (kind === "press") return save(svgBlob(await pressFrontSvg(FL, se)), `${sb}-press-outlined.svg`);
    if (kind === "png") {
      const sw = kioskFaceW(FL), sh = kioskFaceH(FL);
      return save(await proofPng(await pressFrontSvg(FL, se), Math.max(200, Math.round((1400 * sw) / KIOSK_W) * 4), sw, sh), `${sb}-PROOF.png`);
    }
  }
  if (L.sign) return downloadSign(kind, L, edits);
  if (kind === "svg") return save(svgBlob(await liveFrontSvg(L, edits)), `${base}-front.svg`);
  if (kind === "pdf" || kind === "ai") {
    const pdf = await liveFrontPdf(L, edits);
    return save(new Blob([pdf as BlobPart], { type: "application/pdf" }), `${base}-front.${kind}`);
  }
  if (kind === "press") return save(svgBlob(await pressFrontSvg(L, edits)), `${base}-front-press-outlined.svg`);
  if (kind === "png") return save(await proofPng(await pressFrontSvg(L, edits)), `${base}-front-PROOF.png`);
  if (kind === "returns") {
    const z = new JSZip();
    for (const side of ["left", "right"] as const) z.file(`${base}-return-${side}.ai`, await liveReturnPdf(L, edits, side, strips[side]));
    return save(await z.generateAsync({ type: "blob" }), `${base}-returns.zip`);
  }
  const zip = new JSZip();
  const press = await pressFrontSvg(L, edits);
  zip.file(`${base}-front.svg`, await liveFrontSvg(L, edits));
  zip.file(`${base}-front.pdf`, await liveFrontPdf(L, edits));
  zip.file(`${base}-front-press-outlined.svg`, press);
  zip.file(`${base}-front-PROOF.png`, await proofPng(press));
  for (const side of ["left", "right"] as const) {
    zip.file(`${base}-return-${side}.svg`, await returnSvg(side));
    zip.file(`${base}-return-${side}.ai`, await liveReturnPdf(L, edits, side, strips[side]));
  }
  zip.file(
    "README.txt",
    `DRAFT — not published. Rebuilt from ${L.source}.\n` +
      `Front 45 x 96 in, returns 4 x 96 in (.ai with the same live ramp as the front), 1/8 in bleed. ${kioskHasTv(L.id) ? "TV keep-clear left clear." : "No TV on this kiosk."}\n` +
      `.svg/.pdf carry live text; the -press-outlined file has every word outlined.\n` +
      `The PNG is a screen proof, not a print master. Check in Illustrator before print.\n`,
  );
  save(await zip.generateAsync({ type: "blob" }), `${base}.zip`);
}

/** Signage templates: one face per file, no returns, the sign's own size. */
async function downloadSign(kind: KioskDownload, L: LiveLayout, edits: KioskEdits) {
  const base = kioskLiveFileBase(L.id);
  const W = kioskFaceW(L), H = kioskFaceH(L);
  const proofW = Math.min(2400, Math.max(600, Math.round(1400 * Math.sqrt(W / H))));
  const svgBlob = (s: string) => new Blob([s], { type: "image/svg+xml" });
  if (kind === "svg") return save(svgBlob(await liveFrontSvg(L, edits)), `${base}.svg`);
  if (kind === "pdf" || kind === "ai") return save(new Blob([(await liveFrontPdf(L, edits)) as BlobPart], { type: "application/pdf" }), `${base}.${kind}`);
  if (kind === "press") return save(svgBlob(await pressFrontSvg(L, edits)), `${base}-press-outlined.svg`);
  if (kind === "png") return save(await proofPng(await pressFrontSvg(L, edits), proofW, W, H), `${base}-PROOF.png`);
  if (kind === "returns") throw new Error("Signs have no side strips.");
  const zip = new JSZip();
  const press = await pressFrontSvg(L, edits);
  zip.file(`${base}.svg`, await liveFrontSvg(L, edits));
  zip.file(`${base}.ai`, await liveFrontPdf(L, edits));
  zip.file(`${base}-press-outlined.svg`, press);
  zip.file(`${base}-PROOF.png`, await proofPng(press, proofW, W, H));
  const inch = (v: number) => +(v / 72).toFixed(2);
  zip.file(
    "README.txt",
    `DRAFT — not published. Rebuilt from ${L.source}.\n` +
      `Trim ${inch(W)} x ${inch(H)} in, 1/8 in bleed (background extended past trim). CMYK objects as supplied.\n` +
      `.svg/.ai carry live text; the -press-outlined file has every word outlined.\n` +
      `The PNG is a screen proof, not a print master. Check in Illustrator before print.\n`,
  );
  save(await zip.generateAsync({ type: "blob" }), `${base}.zip`);
}

/**
 * pdf-lib names embedded fonts "Geist-Bold-7592" (random suffix), which
 * Illustrator can't match to the installed face, so every text object opens
 * as a missing font. Rewrite them to the standard subset form
 * "ABCDEF+Geist-Bold": Illustrator drops the tag and picks up the real font.
 */
async function saveWithRealFontNames(doc: PDFDocument): Promise<Uint8Array> {
  await doc.flush();
  const tagFor = new Map<string, string>();
  const fix = (name: string) => {
    const base = name.replace(/^[A-Z]{6}\+/, "").replace(/-\d+$/, "");
    if (!tagFor.has(base)) {
      let h = 0;
      for (const ch of base) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      let t = "";
      for (let i = 0; i < 6; i++) { t += String.fromCharCode(65 + (h % 26)); h = Math.floor(h / 26) + 7 * (i + 1); }
      tagFor.set(base, t);
    }
    return `${tagFor.get(base)}+${base}`;
  };
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue;
    for (const key of ["BaseFont", "FontName"]) {
      const v = obj.get(PDFName.of(key));
      if (v instanceof PDFName) {
        const raw = v.decodeText();
        if (/-\d+$/.test(raw)) obj.set(PDFName.of(key), PDFName.of(fix(raw)));
      }
    }
  }
  return doc.save();
}
