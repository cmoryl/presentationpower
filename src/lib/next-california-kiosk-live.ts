// TransPerfect NEXT — CALIFORNIA KIOSKS REBUILT FROM THE LIVE LONDON FILES.
//
// Each London trade-booth `.ai` (live, not outlined) was read once
// (see scripts note in AGENTS.md): every text run with its font, size, colour
// and baseline; the artwork with the text lifted off, kept as vector
// (`-art.svg` for the browser, `-art.pdf` for PDF export); the artwork split
// into horizontal content pieces; and a background colour ramp sampled from
// the edges. Nothing here is invented — every piece and every word comes from
// the partner's own file.
//
// The kiosk front (45 × 96 in) is 0.625 of the London wall's width, so pieces
// are placed at ONE uniform scale — nothing is stretched or squashed — above
// and below the TV keep-clear. All units below are PostScript points on the
// kiosk trim (origin top-left).

import layoutsJson from "@/lib/next-california-kiosk-live-layouts.json";

export const KIOSK_W = 3240;
export const KIOSK_H = 6912;
export const KIOSK_RETURN_W = 288;
export const KIOSK_BLEED = 9;
export const KIOSK_TV = { x: 0, y: 997.5, w: 2756, h: 1604 } as const;
const GAP_MIN = 60;

export type LiveText = {
  id: string;
  text: string;
  font: string;
  size: number;
  color: string;
  x: number;
  y: number;
  w: number;
  top: number;
  bottom: number;
};
export type LiveBlock = { id: string; y0: number; y1: number; c0: number; c1: number; screen: boolean };
export type LiveLayout = {
  id: string;
  source: string;
  trimW: number;
  trimH: number;
  originX: number;
  originY: number;
  mediaW: number;
  mediaH: number;
  texts: LiveText[];
  blocks: LiveBlock[];
  ground: { offset: number; color: string }[];
};

export const KIOSK_LIVE_LAYOUTS = layoutsJson as unknown as Record<string, LiveLayout>;

export function kioskLiveLayout(boothId: string | null | undefined): LiveLayout | null {
  return (boothId && KIOSK_LIVE_LAYOUTS[boothId]) || null;
}

// ---- assets -----------------------------------------------------------------

type Ptr = { url: string };
const ART = import.meta.glob<Ptr>("../assets/california-kiosks/live/*.asset.json", { eager: true, import: "default" });
const FONTS = import.meta.glob<Ptr>("../assets/fonts-live/*.asset.json", { eager: true, import: "default" });

function pick(map: Record<string, Ptr>, file: string): string | null {
  const hit = Object.entries(map).find(([k]) => k.endsWith(`/${file}.asset.json`));
  return hit ? hit[1].url : null;
}
export const kioskArtSvgUrl = (id: string) => pick(ART, `${id}-art.svg`);
export const kioskArtPdfUrl = (id: string) => pick(ART, `${id}-art.pdf`);
/** Full font file for a supplied face name (e.g. "Poppins-Regular"). */
export function kioskFontUrl(font: string): string | null {
  return pick(FONTS, `${font}.ttf`);
}
export function kioskFontFamily(font: string): string {
  if (/times/i.test(font)) return "'Times New Roman', serif";
  return kioskFontUrl(font) ? `'K-${font}', Geist, sans-serif` : "Geist, sans-serif";
}
export function kioskFontFaceCss(): string {
  return Object.keys(FONTS)
    .map((k) => k.split("/").pop()!.replace(".ttf.asset.json", ""))
    .map((f) => `@font-face{font-family:'K-${f}';src:url('${kioskFontUrl(f)}') format('truetype');font-display:block}`)
    .join("");
}

// ---- edits ------------------------------------------------------------------

export type BlockEdit = { dx?: number; dy?: number; scale?: number; hidden?: boolean };
export type TextEdit = { text?: string; dx?: number; dy?: number; size?: number; color?: string; hidden?: boolean };
export type KioskEdits = {
  ground?: { top: string; bottom: string } | null;
  blocks?: Record<string, BlockEdit>;
  texts?: Record<string, TextEdit>;
};

// ---- layout -----------------------------------------------------------------

export type PlacedBlock = {
  block: LiveBlock;
  /** Source clip, in London trim points. */
  clipTop: number;
  clipBottom: number;
  /** Kiosk placement of the clip's top-left and the uniform scale. */
  x: number;
  y: number;
  scale: number;
  texts: PlacedText[];
};
export type PlacedText = LiveText & { kx: number; ky: number; ksize: number; kw: number; edited: boolean; fill: string };

function isHidden(b: LiveBlock, e?: BlockEdit) {
  return e?.hidden ?? b.screen;
}

/** Pure: place every visible piece of a London wall onto the kiosk front. */
export function layoutKiosk(L: LiveLayout, edits: KioskEdits = {}): PlacedBlock[] {
  const base = KIOSK_W / L.trimW;
  const vis = L.blocks.filter((b) => !isHidden(b, edits.blocks?.[b.id]));
  const full = (b: LiveBlock) => [b.y0, b.y1] as const;
  const tight = (b: LiveBlock) => [Math.max(b.y0, b.c0 - 60), Math.min(b.y1, b.c1 + 60)] as const;

  // Above the TV: leading pieces while they fit.
  const above: { b: LiveBlock; c: readonly [number, number] }[] = [];
  let cum = 0;
  for (const b of vis) {
    let c = full(b);
    if (cum + (c[1] - c[0]) * base > KIOSK_TV.y) c = tight(b);
    if (cum + (c[1] - c[0]) * base > KIOSK_TV.y) break;
    above.push({ b, c });
    cum += (c[1] - c[0]) * base;
  }
  const below = vis.slice(above.length);
  const region = KIOSK_H - (KIOSK_TV.y + KIOSK_TV.h);
  let clips = below.map((b) => ({ b, c: full(b) as readonly [number, number] }));
  const sum = () => clips.reduce((n, x) => n + (x.c[1] - x.c[0]) * base, 0);
  if (sum() + GAP_MIN * clips.length > region) clips = below.map((b) => ({ b, c: tight(b) }));
  const k = Math.min(1, (region - GAP_MIN * clips.length) / Math.max(1, sum()));
  const gap = clips.length > 1 ? (region - sum() * k) / clips.length : 0;

  const out: PlacedBlock[] = [];
  const place = (b: LiveBlock, c: readonly [number, number], y: number, s: number) => {
    const e = edits.blocks?.[b.id] ?? {};
    const us = e.scale ?? 1;
    const sc = s * us;
    const w = L.trimW * sc;
    const h = (c[1] - c[0]) * sc;
    const hs = (c[1] - c[0]) * s;
    const x = (KIOSK_W - w) / 2 + (e.dx ?? 0);
    const yy = y + (hs - h) / 2 + (e.dy ?? 0);
    const texts = L.texts
      .filter((t) => {
        const m = (t.top + t.bottom) / 2;
        return m >= b.y0 && m < b.y1;
      })
      .map<PlacedText>((t) => {
        const te = edits.texts?.[t.id] ?? {};
        return {
          ...t,
          kx: x + t.x * sc + (te.dx ?? 0),
          ky: yy + (t.y - c[0]) * sc + (te.dy ?? 0),
          ksize: (te.size ?? t.size) * sc,
          kw: t.w * sc,
          edited: te.text !== undefined && te.text !== t.text,
          text: te.text ?? t.text,
          fill: te.color ?? t.color,
        };
      })
      .filter((t) => !edits.texts?.[t.id]?.hidden);
    out.push({ block: b, clipTop: c[0], clipBottom: c[1], x, y: yy, scale: sc, texts });
  };
  let y = 0;
  for (const a of above) {
    place(a.b, a.c, y, base);
    y += (a.c[1] - a.c[0]) * base;
  }
  y = KIOSK_TV.y + KIOSK_TV.h + (clips.length > 1 ? gap / 2 : 0);
  clips.forEach((x, i) => {
    const h = (x.c[1] - x.c[0]) * base * k;
    // The last piece (usually the bottom motif) sits on the trim edge.
    const yy = i === clips.length - 1 && clips.length > 0 ? KIOSK_H - h : y;
    place(x.b, x.c, yy, base * k);
    y += h + gap;
  });
  return out;
}

export function kioskGround(L: LiveLayout, edits: KioskEdits = {}) {
  if (edits.ground) return [
    { offset: 0, color: edits.ground.top },
    { offset: 1, color: edits.ground.bottom },
  ];
  return L.ground;
}

// ---- SVG --------------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Split the supplied art SVG into its viewBox and inner markup. */
export function splitArtSvg(svg: string): { viewBox: string; inner: string } {
  const open = svg.match(/<svg\b[^>]*>/);
  const vb = open?.[0].match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 100 100";
  const start = (open?.index ?? 0) + (open?.[0].length ?? 0);
  const end = svg.lastIndexOf("</svg>");
  // Layer groups from the London file are relabelled so they do not read as
  // the kiosk's own Cut layer in Illustrator.
  const inner = svg
    .slice(start, end > start ? end : undefined)
    .replace(/inkscape:label="([^"]*)"/g, 'inkscape:label="London $1"');
  return { viewBox: vb, inner };
}

export type TextPathFn = (t: PlacedText) => string | null;

/**
 * Build the kiosk front as a layered SVG (Illustrator reads the top-level
 * groups as layers). With `outline`, text is drawn as paths for press.
 */
export function buildKioskFrontSvg(
  L: LiveLayout,
  artSvg: string,
  edits: KioskEdits = {},
  opts: { outline?: TextPathFn; fontCss?: string; family?: (font: string) => string } = {},
): string {
  const placed = layoutKiosk(L, edits);
  const art = splitArtSvg(artSvg);
  const [, , vw, vh] = art.viewBox.split(/\s+/).map(Number);
  const B = KIOSK_BLEED;
  const g = kioskGround(L, edits);
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${KIOSK_W + 2 * B}pt" height="${KIOSK_H + 2 * B}pt" viewBox="${-B} ${-B} ${KIOSK_W + 2 * B} ${KIOSK_H + 2 * B}">`,
  );
  parts.push(`<defs>`);
  if (opts.fontCss) parts.push(`<style>${opts.fontCss}</style>`);
  parts.push(
    `<linearGradient id="kg" x1="0" y1="0" x2="0" y2="1">${g.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join("")}</linearGradient>`,
  );
  parts.push(`<symbol id="art" viewBox="${art.viewBox}" overflow="visible">${art.inner}</symbol>`);
  placed.forEach((p) => {
    const bleedX = B / p.scale + 1;
    const top = p === placed[0] && p.y <= 0.5 ? -B / p.scale : 0;
    const bot = Math.abs(p.y + (p.clipBottom - p.clipTop) * p.scale - KIOSK_H) < 0.5 ? B / p.scale : 0;
    parts.push(
      `<clipPath id="c-${p.block.id}"><rect x="${-bleedX}" y="${top}" width="${L.trimW + 2 * bleedX}" height="${p.clipBottom - p.clipTop + bot - top}"/></clipPath>`,
    );
  });
  parts.push(`</defs>`);
  parts.push(`<g id="Background"><rect x="${-B}" y="${-B}" width="${KIOSK_W + 2 * B}" height="${KIOSK_H + 2 * B}" fill="url(#kg)"/></g>`);
  parts.push(`<g id="Graphics">`);
  for (const p of placed) {
    parts.push(
      `<g id="piece-${p.block.id}" transform="translate(${p.x} ${p.y}) scale(${p.scale})"><g clip-path="url(#c-${p.block.id})"><use xlink:href="#art" href="#art" x="${-L.originX}" y="${-(L.originY + p.clipTop)}" width="${vw}" height="${vh}"/></g></g>`,
    );
  }
  parts.push(`</g>`);
  parts.push(`<g id="Text">`);
  for (const p of placed)
    for (const t of p.texts) {
      const d = opts.outline?.(t);
      if (d) {
        parts.push(`<path id="${t.id}" d="${d}" fill="${t.fill}"/>`);
        continue;
      }
      const track = t.edited ? "" : ` textLength="${t.kw.toFixed(2)}" lengthAdjust="spacing"`;
      parts.push(
        `<text id="${t.id}" x="${t.kx.toFixed(2)}" y="${t.ky.toFixed(2)}" font-family="${esc((opts.family ?? kioskFontFamily)(t.font))}" font-size="${t.ksize.toFixed(2)}" fill="${t.fill}" xml:space="preserve"${track}>${esc(t.text)}</text>`,
      );
    }
  parts.push(`</g>`);
  parts.push(`<g id="Cut"><rect x="0" y="0" width="${KIOSK_W}" height="${KIOSK_H}" fill="none" stroke="#EC008C" stroke-width="0.5"/></g>`);
  parts.push(`</svg>`);
  return parts.join("");
}

/** A return strip: the partner's own background ramp, with bleed. */
export function buildKioskReturnSvg(L: LiveLayout, edits: KioskEdits = {}): string {
  const B = KIOSK_BLEED;
  const g = kioskGround(L, edits);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${KIOSK_RETURN_W + 2 * B}pt" height="${KIOSK_H + 2 * B}pt" viewBox="${-B} ${-B} ${KIOSK_RETURN_W + 2 * B} ${KIOSK_H + 2 * B}"><defs><linearGradient id="kg" x1="0" y1="0" x2="0" y2="1">${g.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join("")}</linearGradient></defs><g id="Background"><rect x="${-B}" y="${-B}" width="${KIOSK_RETURN_W + 2 * B}" height="${KIOSK_H + 2 * B}" fill="url(#kg)"/></g><g id="Cut"><rect x="0" y="0" width="${KIOSK_RETURN_W}" height="${KIOSK_H}" fill="none" stroke="#EC008C" stroke-width="0.5"/></g></svg>`;
}

/** Interpolate the ground ramp at t ∈ [0,1] (for stepped PDF grounds). */
export function groundAt(stops: { offset: number; color: string }[], t: number): [number, number, number] {
  const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255) as [number, number, number];
  let a = stops[0]!, b = stops[stops.length - 1]!;
  for (let i = 0; i < stops.length - 1; i++)
    if (t >= stops[i]!.offset && t <= stops[i + 1]!.offset) { a = stops[i]!; b = stops[i + 1]!; break; }
  const f = b.offset === a.offset ? 0 : (t - a.offset) / (b.offset - a.offset);
  const A = hex(a.color), Bc = hex(b.color);
  return [0, 1, 2].map((i) => A[i]! + (Bc[i]! - A[i]!) * f) as [number, number, number];
}

export const kioskLiveFileBase = (id: string) => `rdraft-sf-kiosk-${id}-live`;
